import { incorporarRutasAccesiblesNivel3 } from '../data/rutas-accesibles-nivel-3.data';
import { integrarMedicionesLevantadas } from '../data/levantamiento-recorridos.data';
import { Injectable } from '@angular/core';
import {
  createClient
} from '@supabase/supabase-js';

import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL
} from '../config/supabase.config';
import {
  LUGARES_HIPPOCAMPUS_PRELIMINARES,
  MAPA_ACTIVO
} from '../data/mapa-simulado.data';
import {
  CONEXIONES_COMPLEMENTARIAS,
  NODOS_COMPLEMENTARIOS
} from '../data/ampliacion-hippocampus.data';
import {
  Conexion,
  LugarPlano,
  MapaNavegacion,
  Nodo
} from '../models/nodo.model';

interface FilaNodoSupabase {
  id: string;
  nombre: string;
  x: number | string | null;
  y: number | string | null;
  tipo: string;
  nivel: number | null;
  sector: string | null;
  accesible: boolean | null;
  restringido: boolean;
  activo: boolean;
}

interface FilaConexionSupabase {
  origen_id: string;
  destino_id: string;
  distancia: number | string | null;
  tipo: string;
  accesible: boolean;
  restringida: boolean;
  habilitada: boolean;
}

export type OrigenDatosMapa =
  | 'local'
  | 'supabase';

export interface EstadoCargaMapa {
  origenActivo: OrigenDatosMapa;
  ultimaComprobacion: string | null;
  ultimaCargaExitosa: string | null;
  ultimoIntentoExitoso: boolean | null;
}

@Injectable({
  providedIn: 'root'
})
export class MapaService {
  private readonly supabase =
    createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    );

  private readonly conexionesCerradas =
    new Set<string>();

  private mapaActivo: MapaNavegacion =
    incorporarRutasAccesiblesNivel3(this.crearCopiaMapa(
      MAPA_ACTIVO
    ));

  private origenActivo:
    OrigenDatosMapa = 'local';

  private ultimaComprobacion:
    string | null = null;

  private ultimaCargaExitosa:
    string | null = null;

  private ultimoIntentoExitoso:
    boolean | null = null;

  async cargarMapaDesdeSupabase():
    Promise<boolean> {
    const fechaIntento =
      new Date().toISOString();

    this.ultimaComprobacion =
      fechaIntento;

    try {
      const {
        data: mapa,
        error: errorMapa
      } = await this.supabase
        .from('mapas')
        .select('id')
        .eq(
          'id',
          MAPA_ACTIVO.id
        )
        .maybeSingle();

      if (errorMapa || !mapa) {
        console.warn(
          'No se pudo cargar el mapa desde Supabase.',
          errorMapa
        );

        return this.registrarFalloCarga();
      }

      const {
        data: nodos,
        error: errorNodos
      } = await this.supabase
        .from('nodos')
        .select(
          'id, nombre, x, y, tipo, nivel, sector, accesible, restringido, activo'
        )
        .eq(
          'mapa_id',
          mapa.id
        )
        .order('id');

      const {
        data: conexiones,
        error: errorConexiones
      } = await this.supabase
        .from('conexiones')
        .select(
          'origen_id, destino_id, distancia, tipo, accesible, restringida, habilitada'
        )
        .eq(
          'mapa_id',
          mapa.id
        )
        .order('id');

      if (
        errorNodos ||
        errorConexiones ||
        !nodos ||
        !conexiones ||
        nodos.length === 0 ||
        conexiones.length === 0
      ) {
        console.warn(
          'No se pudieron cargar nodos o conexiones.',
          errorNodos ||
            errorConexiones
        );

        return this.registrarFalloCarga();
      }

      const filasNodo = nodos as FilaNodoSupabase[];
      const nodosActivos = filasNodo.filter(nodo => nodo.activo === true);
      if (nodosActivos.length === 0) {
        return this.registrarFalloCarga();
      }

      const idsRemotos = new Set(filasNodo.map(nodo => this.normalizarIdRemoto(nodo.id)));
      const nodosCombinados = [
        ...nodosActivos.map(nodo => this.convertirNodo(nodo)),
        ...NODOS_COMPLEMENTARIOS.filter(nodo => !idsRemotos.has(nodo.id))
      ];
      const idsActivos = new Set(nodosCombinados.map(nodo => nodo.id));
      const conexionesRemotas = conexiones.map(conexion =>
        this.convertirConexion(conexion as FilaConexionSupabase)
      );
      const clavesRemotas = new Set(conexionesRemotas.map(conexion =>
        this.crearClaveConexion(conexion.origen, conexion.destino)
      ));
      const conexionesCombinadas = [
        ...conexionesRemotas,
        ...CONEXIONES_COMPLEMENTARIAS.filter(conexion =>
          !clavesRemotas.has(this.crearClaveConexion(conexion.origen, conexion.destino))
        )
      ].filter(conexion => idsActivos.has(conexion.origen) && idsActivos.has(conexion.destino));

      this.mapaActivo = incorporarRutasAccesiblesNivel3({
        ...this.crearCopiaMapa(
          MAPA_ACTIVO
        ),
        nodos: nodosCombinados,
        conexiones: integrarMedicionesLevantadas(conexionesCombinadas,nodosCombinados.map(n=>n.id))
      });

      this.origenActivo =
        'supabase';

      this.ultimaCargaExitosa =
        fechaIntento;

      this.ultimoIntentoExitoso =
        true;

      return true;
    } catch (error) {
      console.warn(
        'Error inesperado al conectar con Supabase.',
        error
      );

      return this.registrarFalloCarga();
    }
  }

  obtenerEstadoCarga():
    EstadoCargaMapa {
    return {
      origenActivo:
        this.origenActivo,
      ultimaComprobacion:
        this.ultimaComprobacion,
      ultimaCargaExitosa:
        this.ultimaCargaExitosa,
      ultimoIntentoExitoso:
        this.ultimoIntentoExitoso
    };
  }

  obtenerMapaActivo():
    MapaNavegacion {
    return this.crearCopiaMapa(
      this.mapaActivo
    );
  }

  private registrarFalloCarga():
    false {
    this.ultimoIntentoExitoso =
      false;

    return false;
  }

  obtenerNodosNavegables():
    Nodo[] {
    return this.mapaActivo.nodos.map(
      nodo => ({
        ...nodo
      })
    );
  }

  obtenerConexionesNavegables():
    Conexion[] {
    return this.mapaActivo
      .conexiones
      .map(
        conexion => ({
          ...conexion,
          habilitada:
            conexion.habilitada !==
              false &&
            !this.estaConexionCerrada(
              conexion.origen,
              conexion.destino
            )
        })
      );
  }

  obtenerLugaresPreliminares():
    LugarPlano[] {
    return LUGARES_HIPPOCAMPUS_PRELIMINARES
      .map(
        lugar => ({
          ...lugar
        })
      );
  }

  obtenerNodoPorId(
    id: string
  ): Nodo | undefined {
    const nodo =
      this.mapaActivo.nodos.find(
        nodoActual =>
          nodoActual.id === id
      );

    return nodo
      ? {
          ...nodo
        }
      : undefined;
  }

  obtenerLugarPreliminarPorId(
    id: string
  ): LugarPlano | undefined {
    const lugar =
      LUGARES_HIPPOCAMPUS_PRELIMINARES
        .find(
          lugarActual =>
            lugarActual.id === id
        );

    return lugar
      ? {
          ...lugar
        }
      : undefined;
  }

  esNodoNavegable(
    id: string
  ): boolean {
    return this.mapaActivo.nodos
      .some(
        nodo =>
          nodo.id === id
      );
  }

  obtenerNiveles(): number[] {
    const niveles =
      this.mapaActivo.nodos
        .map(
          nodo =>
            nodo.nivel
        )
        .filter(
          (
            nivel
          ): nivel is number =>
            nivel !== undefined
        );

    return [
      ...new Set(niveles)
    ].sort(
      (
        nivelA,
        nivelB
      ) =>
        nivelA - nivelB
    );
  }

  obtenerNodosPorNivel(
    nivel: number
  ): Nodo[] {
    return this.mapaActivo.nodos
      .filter(
        nodo =>
          nodo.nivel === nivel
      )
      .map(
        nodo => ({
          ...nodo
        })
      );
  }

  obtenerLugaresPorNivel(
    nivel: number
  ): LugarPlano[] {
    return LUGARES_HIPPOCAMPUS_PRELIMINARES
      .filter(
        lugar =>
          lugar.nivel === nivel
      )
      .map(
        lugar => ({
          ...lugar
        })
      );
  }

  cerrarConexion(
    origenId: string,
    destinoId: string
  ): void {
    this.conexionesCerradas.add(
      this.crearClaveConexion(
        origenId,
        destinoId
      )
    );
  }

  habilitarConexion(
    origenId: string,
    destinoId: string
  ): void {
    this.conexionesCerradas.delete(
      this.crearClaveConexion(
        origenId,
        destinoId
      )
    );
  }

  estaConexionCerrada(
    origenId: string,
    destinoId: string
  ): boolean {
    return this.conexionesCerradas
      .has(
        this.crearClaveConexion(
          origenId,
          destinoId
        )
      );
  }

  obtenerConexionesHabilitadas(
    modoAccesible:
      boolean = false
  ): Conexion[] {
    return this
      .obtenerConexionesNavegables()
      .filter(
        conexion => {
          const estaHabilitada =
            conexion.habilitada !==
              false;

          const noEstaRestringida =
            conexion.restringida !==
              true;

          const esAptaParaAccesibilidad =
            !modoAccesible ||
            (
              conexion.accesible ===
                true &&
              conexion.tipo !==
                'escalera'
            );

          return (
            estaHabilitada &&
            noEstaRestringida &&
            esAptaParaAccesibilidad
          );
        }
      );
  }

  obtenerConexionesPorNodo(
    nodoId: string,
    modoAccesible:
      boolean = false
  ): Conexion[] {
    return this
      .obtenerConexionesHabilitadas(
        modoAccesible
      )
      .filter(
        conexion =>
          conexion.origen ===
            nodoId ||
          conexion.destino ===
            nodoId
      );
  }

  obtenerLugaresPendientes():
    LugarPlano[] {
    return LUGARES_HIPPOCAMPUS_PRELIMINARES
      .filter(
        lugar =>
          lugar.x === null ||
          lugar.y === null ||
          lugar.nivel === null
      )
      .map(
        lugar => ({
          ...lugar
        })
      );
  }

  private convertirNodo(
    fila: FilaNodoSupabase
  ): Nodo {
    return {
      id:
        this.normalizarIdRemoto(
          fila.id
        ),
      nombre:
        fila.nombre,
      x:
        fila.x === null
          ? null
          : Number(
              fila.x
            ),
      y:
        fila.y === null
          ? null
          : Number(
              fila.y
            ),
      tipo:
        fila.tipo,
      nivel:
        fila.nivel ??
          undefined,
      sector:
        fila.sector ??
          undefined,
      accesible:
        fila.accesible ??
          undefined,
      restringido:
        fila.restringido
    } as Nodo;
  }

  private convertirConexion(
    fila: FilaConexionSupabase
  ): Conexion {
    return {
      origen:
        this.normalizarIdRemoto(
          fila.origen_id
        ),
      destino:
        this.normalizarIdRemoto(
          fila.destino_id
        ),
      distancia: fila.distancia === null ? null : Number(fila.distancia),
      tipo:
        fila.tipo,
      accesible:
        fila.accesible,
      restringida:
        fila.restringida,
      habilitada:
        fila.habilitada
    } as Conexion;
  }

  private normalizarIdRemoto(
    id: string
  ): string {
    return id === 'bano'
      ? 'baño'
      : id;
  }

  private crearCopiaMapa(
    mapa: MapaNavegacion
  ): MapaNavegacion {
    return {
      ...mapa,
      nodos:
        mapa.nodos.map(
          nodo => ({
            ...nodo
          })
        ),
      conexiones:
        mapa.conexiones.map(
          conexion => ({
            ...conexion
          })
        )
    };
  }

  private crearClaveConexion(
    origenId: string,
    destinoId: string
  ): string {
    return [
      origenId,
      destinoId
    ]
      .sort()
      .join('|');
  }
}
