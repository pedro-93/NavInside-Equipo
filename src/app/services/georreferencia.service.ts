import { Injectable } from '@angular/core';
import { Nodo, Conexion } from '../models/nodo.model';
import {
  POSICIONES_PLANO_NIVEL_UNO,
  TRAMOS_PLANO_NIVEL_UNO
} from '../data/plano-nivel-uno.data';
import {
  POSICIONES_PLANO_NIVEL_TRES,
  TRAMOS_PLANO_NIVEL_TRES
} from '../data/plano-nivel-tres.data';
import type {
  ReferenciaGpsPoi
} from './posicionamiento-apoyo.service';

export interface PuntoPlano {
  x: number;
  y: number;
}

export interface CoordenadaGeo {
  latitude: number;
  longitude: number;
}

export interface PosicionEnPlano extends PuntoPlano {
  nivel: number;
  incertidumbreMetros: number;
  timestamp: number;
}

export interface ModeloGeografico {
  nivel: number;
  origen: CoordenadaGeo;
  geograficos: readonly PuntoPlano[];
  visuales: readonly PuntoPlano[];
  errorMetros: number;
}

export interface ProyeccionRuta {
  indice: number;
  fraccion: number;
  separacionMetros: number;
  ambigua: boolean;
}

// Las coordenadas del mapa permanecen intactas.
// La calibración es independiente.
export function posicionPlano(
  nodo: Nodo
): PuntoPlano | null {
  const fija = nodo.nivel === 1
    ? POSICIONES_PLANO_NIVEL_UNO[nodo.id]
    : nodo.nivel === 3
      ? POSICIONES_PLANO_NIVEL_TRES[nodo.id]
      : null;

  if (nodo.nivel === 1 || nodo.nivel === 3) {
    return fija
      ? { x: fija[0], y: fija[1] }
      : null;
  }

  return Number.isFinite(nodo.x) &&
    Number.isFinite(nodo.y)
      ? { x: nodo.x, y: nodo.y }
      : null;
}

function local(
  p: CoordenadaGeo,
  origen: CoordenadaGeo
): PuntoPlano {
  return {
    x:
      (p.longitude - origen.longitude) *
      Math.PI / 180 *
      6371000 *
      Math.cos(origen.latitude * Math.PI / 180),
    y:
      (p.latitude - origen.latitude) *
      Math.PI / 180 *
      6371000
  };
}

function pesos(
  p: PuntoPlano,
  triangulo: readonly PuntoPlano[]
): number[] | null {
  const [a, b, c] = triangulo;

  const det =
    (b.x - a.x) * (c.y - a.y) -
    (c.x - a.x) * (b.y - a.y);

  if (
    !Number.isFinite(det) ||
    Math.abs(det) < 0.000001
  ) {
    return null;
  }

  const u = (
    (p.x - a.x) * (c.y - a.y) -
    (c.x - a.x) * (p.y - a.y)
  ) / det;

  const v = (
    (b.x - a.x) * (p.y - a.y) -
    (p.x - a.x) * (b.y - a.y)
  ) / det;

  return [1 - u - v, u, v];
}

function combinar(
  w: readonly number[],
  puntos: readonly PuntoPlano[]
): PuntoPlano {
  return {
    x: w.reduce(
      (s, v, i) => s + v * puntos[i].x,
      0
    ),
    y: w.reduce(
      (s, v, i) => s + v * puntos[i].y,
      0
    )
  };
}

function distancia(
  a: PuntoPlano,
  b: PuntoPlano
): number {
  return Math.hypot(
    a.x - b.x,
    a.y - b.y
  );
}

@Injectable({ providedIn: 'root' })
export class GeorreferenciaService {
  crearModelo(
    nivel: number,
    referencias: readonly ReferenciaGpsPoi[],
    nodos: readonly Nodo[]
  ): ModeloGeografico | null {
    const ids = new Set<string>();

    const anclas = referencias
      .slice(-30)
      .flatMap(ref => {
        const nodo = nodos.find(
          n =>
            n.id === ref.nodoId &&
            n.nivel === nivel &&
            !n.restringido
        );

        const visual = nodo
          ? posicionPlano(nodo)
          : null;

        if (
          !visual ||
          ids.has(ref.nodoId) ||
          !Number.isFinite(ref.accuracy) ||
          ref.accuracy < 0 ||
          ref.accuracy > 3 ||
          !Number.isFinite(ref.latitude) ||
          Math.abs(ref.latitude) >= 85 ||
          !Number.isFinite(ref.longitude) ||
          Math.abs(ref.longitude) > 180
        ) {
          return [];
        }

        ids.add(ref.nodoId);

        return [{ ref, visual }];
      });

    if (anclas.length < 3) {
      return null;
    }

    const origen = {
      latitude: anclas[0].ref.latitude,
      longitude: anclas[0].ref.longitude
    };

    const puntos = anclas.map(
      a => local(a.ref, origen)
    );

    let elegidos: number[] = [];
    let mejorArea = 0;

    for (
      let i = 0;
      i < puntos.length - 2;
      i++
    ) {
      for (
        let j = i + 1;
        j < puntos.length - 1;
        j++
      ) {
        for (
          let k = j + 1;
          k < puntos.length;
          k++
        ) {
          const [a, b, c] = [
            puntos[i],
            puntos[j],
            puntos[k]
          ];

          const area = Math.abs(
            (b.x - a.x) * (c.y - a.y) -
            (c.x - a.x) * (b.y - a.y)
          );

          const lado = Math.max(
            distancia(a, b),
            distancia(a, c),
            distancia(b, c)
          );

          // Rechazar anclas alineadas,
          // demasiado juntas o casi colineales.
          if (
            area > mejorArea &&
            area >= 50 &&
            area / lado >= 5 &&
            lado <= 1000
          ) {
            mejorArea = area;
            elegidos = [i, j, k];
          }
        }
      }
    }

    if (!elegidos.length) {
      return null;
    }

    const geograficos = elegidos.map(
      i => puntos[i]
    );

    const visuales = elegidos.map(
      i => anclas[i].visual
    );

    if (!pesos(visuales[0], visuales)) {
      return null;
    }

    let residual = 0;

    for (
      let i = 0;
      i < anclas.length;
      i++
    ) {
      const w = pesos(
        anclas[i].visual,
        visuales
      );

      if (!w) {
        return null;
      }

      residual = Math.max(
        residual,
        distancia(
          combinar(w, geograficos),
          puntos[i]
        )
      );
    }

    if (residual > 3) {
      return null;
    }

    return {
      nivel,
      origen,
      geograficos,
      visuales,
      errorMetros:
        residual +
        Math.max(
          ...anclas.map(
            a => a.ref.accuracy
          )
        )
    };
  }

  proyectar(
    modelo: ModeloGeografico,
    geo: CoordenadaGeo,
    accuracy: number,
    timestamp: number
  ): PosicionEnPlano | null {
    if (
      !Number.isFinite(accuracy) ||
      accuracy < 0 ||
      accuracy > 5 ||
      !Number.isFinite(geo.latitude) ||
      Math.abs(geo.latitude) > 90 ||
      !Number.isFinite(geo.longitude) ||
      Math.abs(geo.longitude) > 180 ||
      !Number.isFinite(timestamp) ||
      Date.now() - timestamp > 10000 ||
      timestamp > Date.now() + 1000
    ) {
      return null;
    }

    const w = pesos(
      local(geo, modelo.origen),
      modelo.geograficos
    );

    // No extrapolar la ubicación fuera
    // del triángulo calibrado.
    if (
      !w ||
      w.some(v => v < 0 || v > 1)
    ) {
      return null;
    }

    return {
      ...combinar(w, modelo.visuales),
      nivel: modelo.nivel,
      incertidumbreMetros:
        modelo.errorMetros + accuracy,
      timestamp
    };
  }

  puntoEnMetros(
    modelo: ModeloGeografico,
    punto: PuntoPlano
  ): PuntoPlano | null {
    const w = pesos(
      punto,
      modelo.visuales
    );

    return w
      ? combinar(w, modelo.geograficos)
      : null;
  }

  proyectarRuta(
    modelo: ModeloGeografico,
    punto: PosicionEnPlano,
    ruta: readonly Nodo[],
    conexiones: readonly Conexion[]
  ): ProyeccionRuta | null {
    const posicion =
      this.puntoEnMetros(modelo, punto);

    if (!posicion) {
      return null;
    }

    const candidatos: ProyeccionRuta[] = [];

    ruta.slice(0, -1).forEach(
      (desde, indice) => {
        const hasta = ruta[indice + 1];

        const conexion = conexiones.find(
          c =>
            (
              c.origen === desde.id &&
              c.destino === hasta.id
            ) ||
            (
              c.origen === hasta.id &&
              c.destino === desde.id
            )
        );

        if (
          desde.nivel !== modelo.nivel ||
          hasta.nivel !== modelo.nivel ||
          !conexion ||
          conexion.habilitada === false ||
          conexion.restringida ||
          conexion.distancia <= 0
        ) {
          return;
        }

        const a = posicionPlano(desde);
        const b = posicionPlano(hasta);

        if (!a || !b) {
          return;
        }

        const tramos = modelo.nivel === 1
          ? TRAMOS_PLANO_NIVEL_UNO
          : modelo.nivel === 3
            ? TRAMOS_PLANO_NIVEL_TRES
            : {};

        const intermedios =
          tramos[
            `${desde.id}|${hasta.id}`
          ] ??
          [
            ...(
              tramos[
                `${hasta.id}|${desde.id}`
              ] ?? []
            )
          ].reverse();

        const visuales = [
          a,
          ...intermedios.map(
            ([x, y]) => ({ x, y })
          ),
          b
        ];

        const fisicos = visuales.map(
          p => this.puntoEnMetros(modelo, p)!
        );

        const largos = fisicos
          .slice(1)
          .map(
            (p, i) =>
              distancia(p, fisicos[i])
          );

        const total = largos.reduce(
          (s, l) => s + l,
          0
        );

        if (total < 0.01) {
          return;
        }

        let acumulado = 0;

        let mejor:
          ProyeccionRuta | null = null;

        largos.forEach(
          (largo, i) => {
            const origen = fisicos[i];
            const fin = fisicos[i + 1];

            if (largo > 0.01) {
              const t = Math.max(
                0,
                Math.min(
                  1,
                  (
                    (posicion.x - origen.x) *
                      (fin.x - origen.x) +
                    (posicion.y - origen.y) *
                      (fin.y - origen.y)
                  ) / largo ** 2
                )
              );

              const p = {
                x:
                  origen.x +
                  t * (fin.x - origen.x),
                y:
                  origen.y +
                  t * (fin.y - origen.y)
              };

              const separacionMetros =
                distancia(p, posicion);

              if (
                !mejor ||
                separacionMetros <
                  mejor.separacionMetros
              ) {
                // La fracción visual coincide
                // con la interpolación del cursor.
                const visualLargos = visuales
                  .slice(1)
                  .map(
                    (v, j) =>
                      distancia(v, visuales[j])
                  );

                const visualTotal =
                  visualLargos.reduce(
                    (s, n) => s + n,
                    0
                  );

                const visualAntes =
                  visualLargos
                    .slice(0, i)
                    .reduce(
                      (s, n) => s + n,
                      0
                    );

                mejor = {
                  indice,
                  fraccion:
                    (
                      visualAntes +
                      t * visualLargos[i]
                    ) / visualTotal,
                  separacionMetros,
                  ambigua: false
                };
              }
            }

            acumulado += largo;
          }
        );

        if (
          mejor &&
          acumulado > 0
        ) {
          candidatos.push(mejor);
        }
      }
    );

    candidatos.sort(
      (a, b) =>
        a.separacionMetros -
        b.separacionMetros
    );

    if (!candidatos.length) {
      return null;
    }

    const mejor = candidatos[0];

    const rival = candidatos.find(
      c =>
        Math.abs(
          c.indice - mejor.indice
        ) > 1
    );

    return {
      ...mejor,
      ambigua:
        !!rival &&
        rival.separacionMetros -
          mejor.separacionMetros <
          punto.incertidumbreMetros * 2
    };
  }
}