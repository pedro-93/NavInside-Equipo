import { inject, Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { Conexion, Nodo } from '../models/nodo.model';
import {
  POSICIONES_PLANO_NIVEL_UNO,
  TRAMOS_PLANO_NIVEL_UNO
} from '../data/plano-nivel-uno.data';
import {
  POSICIONES_PLANO_NIVEL_TRES,
  TRAMOS_PLANO_NIVEL_TRES
} from '../data/plano-nivel-tres.data';
import {
  MuestraMovimientoNavegacion,
  SensoresNavegacionService
} from './sensores-navegacion.service';

export type DireccionSeguimiento =
  'sin-calibrar' |
  'avanzando' |
  'retrocediendo' |
  'desviado' |
  'sin-rumbo' |
  'limite-nivel';

export type FaseSeguimientoRuta =
  'inactivo' |
  'siguiendo' |
  'pausado' |
  'confirmar-nivel' |
  'llegada-estimada' |
  'completado';

export interface EstadoSeguimientoRuta {
  fase: FaseSeguimientoRuta;
  indiceNodo: number;
  origenTramoId: string | null;
  destinoTramoId: string | null;
  fraccionTramo: number;
  metrosRecorridos: number;
  metrosRestantes: number;
  pasosEstimados: number;
  longitudPasoMetros: number | null;
  direccion?: DireccionSeguimiento;
  orientacionCalibrada?: boolean;
}

interface TramoSeguimiento {
  origen: Nodo;
  destino: Nodo;
  distancia: number;
  cambioNivel: boolean;
}

@Injectable({ providedIn: 'root' })
export class SeguimientoRutaService implements OnDestroy {
  private readonly sensores = inject(SensoresNavegacionService);

  private readonly estadoInterno =
    new BehaviorSubject<EstadoSeguimientoRuta>({
      fase: 'inactivo',
      indiceNodo: 0,
      origenTramoId: null,
      destinoTramoId: null,
      fraccionTramo: 0,
      metrosRecorridos: 0,
      metrosRestantes: 0,
      pasosEstimados: 0,
      longitudPasoMetros: null
    });

  private readonly suscripciones = new Subscription();
  private tramos: TramoSeguimiento[] = [];
  private indice = 0;
  private metrosTramo = 0;
  private pasos = 0;
  private longitudPaso = 0;
  private operacion = 0;
  private destruido = false;
  private bloqueoPosicion = false;

  private mediaGravedad: number | null = null;
  private ultimaMuestraMs: number | null = null;
  private picoMs: number | null = null;
  private aceleracionSuavizada: number | null = null;
  private maximoPico = 0;
  private candidatosPasoMs: number[] = [];
  private cadenciaConfirmada = false;
  private ultimoRumbo: number | null = null;
  private instanteRumbo = 0;
  private desplazamientoRumbo: number | null = null;
  private direccion: DireccionSeguimiento = 'sin-calibrar';

  // Valores iniciales conservadores; deben validarse caminando en el teléfono.
  private readonly ciclosParaConfirmar = 4;
  private readonly intervaloMinimoPasoMs = 350;
  private readonly intervaloMaximoPasoMs = 1200;

  readonly estado$ = this.estadoInterno.asObservable();

  constructor() {
    const sensores = this.sensores;

    this.suscripciones.add(
      sensores.movimiento$.subscribe(muestra =>
        this.procesarMovimiento(muestra)
      )
    );

    this.suscripciones.add(
      sensores.rumbo$.subscribe(rumbo => {
        if (!Number.isFinite(rumbo)) {
          return;
        }

        this.ultimoRumbo = ((rumbo % 360) + 360) % 360;
        this.instanteRumbo = performance.now();
      })
    );

    this.suscripciones.add(
      sensores.estado$.subscribe(estado => {
        if (
          !estado.iniciado &&
          ['siguiendo', 'confirmar-nivel'].includes(
            this.estadoInterno.value.fase
          )
        ) {
          this.reiniciarDetector();
          this.publicar('pausado');
        }
      })
    );
  }

  obtenerEstado(): EstadoSeguimientoRuta {
    return { ...this.estadoInterno.value };
  }

  // La longitud del paso es una configuración explícita, no una medida del mapa.
  async iniciar(
    ruta: readonly Nodo[],
    conexiones: readonly Conexion[],
    longitudPasoMetros: number
  ): Promise<void> {
    if (this.destruido) {
      return;
    }

    if (
      !Number.isFinite(longitudPasoMetros) ||
      longitudPasoMetros < 0.1 ||
      longitudPasoMetros > 2
    ) {
      throw new Error(
        'Configura una longitud de paso entre 0,10 y 2 metros.'
      );
    }

    const tramos = this.validarRuta(ruta, conexiones);
    const operacion = ++this.operacion;

    this.publicar('inactivo');
    await this.sensores.detener();

    if (operacion !== this.operacion || this.destruido) {
      return;
    }

    this.bloqueoPosicion = false;
    this.tramos = tramos;
    this.indice = 0;
    this.metrosTramo = 0;
    this.pasos = 0;
    this.longitudPaso = longitudPasoMetros;
    this.desplazamientoRumbo = null;
    this.ultimoRumbo = null;
    this.direccion = 'sin-calibrar';

    this.reiniciarDetector();
    this.publicar(this.faseDelTramo());

    await this.sensores.iniciar();
  }

  async pausar(): Promise<void> {
    if (
      !['siguiendo', 'confirmar-nivel'].includes(
        this.estadoInterno.value.fase
      )
    ) {
      return;
    }

    ++this.operacion;
    this.reiniciarDetector();
    this.publicar('pausado');

    await this.sensores.detener();
  }

  async reanudar(): Promise<void> {
    if (
      this.destruido ||
      this.estadoInterno.value.fase !== 'pausado'
    ) {
      return;
    }

    this.reiniciarDetector();
    this.publicar(this.faseDelTramo());

    await this.sensores.iniciar();
  }

  async detener(): Promise<void> {
    ++this.operacion;
    this.reiniciarDetector();
    this.desplazamientoRumbo = null;
    this.direccion = 'sin-calibrar';
    this.publicar('inactivo');

    await this.sensores.detener();
  }

  // Un QR leído confirma el nodo; nunca se inventa un cambio de piso con GPS.
  confirmarNodo(nodoId: string): boolean {
    if (
      !this.tramos.length ||
      this.estadoInterno.value.fase === 'inactivo'
    ) {
      return false;
    }

    const indice = this.tramos.findIndex(
      tramo => tramo.origen.id === nodoId
    );

    const esDestino =
      this.tramos[this.tramos.length - 1].destino.id === nodoId;

    if (indice < 0 && !esDestino) {
      return false;
    }

    const estabaPausado = ['pausado', 'llegada-estimada'].includes(
      this.estadoInterno.value.fase
    );

    const nivelAnterior = this.tramos[this.indice]?.origen.nivel;

    const nivelNuevo = esDestino
      ? this.tramos[this.tramos.length - 1].destino.nivel
      : this.tramos[indice].origen.nivel;

    if (nivelAnterior !== nivelNuevo) {
      this.desplazamientoRumbo = null;
      this.direccion = 'sin-calibrar';
    }

    this.bloqueoPosicion = false;
    this.indice = esDestino ? this.tramos.length : indice;
    this.metrosTramo = 0;
    this.reiniciarDetector();

    this.publicar(
      esDestino
        ? 'completado'
        : estabaPausado
          ? 'pausado'
          : this.faseDelTramo()
    );

    if (esDestino) {
      void this.sensores.detener();
    }

    return true;
  }

  corregirTramo(
    indice: number,
    fraccion: number
  ): boolean {
    if (
      !['siguiendo', 'llegada-estimada'].includes(
        this.estadoInterno.value.fase
      ) ||
      !Number.isInteger(indice) ||
      indice < 0 ||
      indice >= this.tramos.length ||
      !Number.isFinite(fraccion) ||
      fraccion < 0 ||
      fraccion > 1 ||
      this.tramos[indice].cambioNivel
    ) {
      return false;
    }

    const actual = Math.min(
      this.indice,
      this.tramos.length - 1
    );

    // Una lectura geográfica nunca salta
    // un ascensor o escalera entre pisos.
    if (
      this.tramos.slice(
        Math.min(actual, indice),
        Math.max(actual, indice) + 1
      ).some(t => t.cambioNivel)
    ) {
      return false;
    }

    const antes =
      this.estadoInterno.value.metrosRecorridos;

    this.indice = indice;

    this.metrosTramo =
      this.tramos[indice].distancia * fraccion;

    this.bloqueoPosicion = false;
    this.reiniciarDetector();

    const despues = this.tramos
      .slice(0, indice)
      .reduce(
        (s, t) => s + t.distancia,
        0
      ) + this.metrosTramo;

    if (Math.abs(despues - antes) > 0.1) {
      this.direccion = despues < antes
        ? 'retrocediendo'
        : 'avanzando';
    }

    this.publicar('siguiendo');

    return true;
  }

  bloquearPorDesvio(): void {
    if (
      this.estadoInterno.value.fase !== 'siguiendo'
    ) {
      return;
    }

    this.bloqueoPosicion = true;
    this.direccion = 'desviado';
    this.reiniciarDetector();
    this.publicar('siguiendo');
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.suscripciones.unsubscribe();

    void this.detener();

    this.estadoInterno.complete();
  }

  private validarRuta(
    ruta: readonly Nodo[],
    conexiones: readonly Conexion[]
  ): TramoSeguimiento[] {
    if (
      ruta.length < 2 ||
      new Set(ruta.map(nodo => nodo.id)).size !== ruta.length
    ) {
      throw new Error(
        'La ruta debe contener al menos dos nodos distintos y no repetir nodos.'
      );
    }

    return ruta.slice(0, -1).map((origen, indice) => {
      const destino = ruta[indice + 1];

      const conexion = conexiones.find(item =>
        (item.origen === origen.id && item.destino === destino.id) ||
        (item.origen === destino.id && item.destino === origen.id)
      );

      const cambioNivel = origen.nivel !== destino.nivel;

      if (
        !conexion ||
        conexion.habilitada === false ||
        conexion.restringida === true ||
        origen.restringido === true ||
        destino.restringido === true ||
        !Number.isFinite(origen.nivel) ||
        !Number.isFinite(destino.nivel) ||
        !Number.isFinite(conexion.distancia) ||
        conexion.distancia < 0 ||
        (!cambioNivel && conexion.distancia === 0)
      ) {
        throw new Error(
          `No hay un tramo válido entre ${origen.id} y ${destino.id}.`
        );
      }

      return {
        origen: { ...origen },
        destino: { ...destino },
        distancia: conexion.distancia,
        cambioNivel
      };
    });
  }

  private procesarMovimiento(
    muestra: MuestraMovimientoNavegacion
  ): void {
    if (this.bloqueoPosicion) {
      return;
    }

    if (
      this.estadoInterno.value.fase !== 'siguiendo' &&
      !(
        this.estadoInterno.value.fase === 'llegada-estimada' &&
        this.desplazamientoRumbo !== null
      )
    ) {
      return;
    }

    const valor = muestra.magnitudConGravedad;
    const ahora = muestra.instanteMs;

    if (
      valor === null ||
      !Number.isFinite(valor) ||
      !Number.isFinite(ahora) ||
      (
        this.ultimaMuestraMs !== null &&
        ahora <= this.ultimaMuestraMs
      )
    ) {
      return;
    }

    if (
      this.ultimaMuestraMs === null ||
      ahora - this.ultimaMuestraMs > 250
    ) {
      this.reiniciarDetector();
      this.mediaGravedad = valor;
      this.aceleracionSuavizada = valor;
      this.ultimaMuestraMs = ahora;
      return;
    }

    const intervalo = ahora - this.ultimaMuestraMs;
    this.ultimaMuestraMs = ahora;

    this.aceleracionSuavizada! +=
      (1 - Math.exp(-intervalo / 35)) *
      (valor - this.aceleracionSuavizada!);

    this.mediaGravedad! +=
      (1 - Math.exp(-intervalo / 600)) *
      (this.aceleracionSuavizada! - this.mediaGravedad!);

    const oscilacion =
      this.aceleracionSuavizada! - this.mediaGravedad!;

    const ultimoCandidato =
      this.candidatosPasoMs.at(-1);

    // Después de una pausa hay que confirmar
    // una nueva secuencia de pasos.
    if (
      ultimoCandidato !== undefined &&
      ahora - ultimoCandidato >
        this.intervaloMaximoPasoMs + 550
    ) {
      this.reiniciarCadencia();
    }

    if (this.picoMs === null) {
      if (oscilacion >= 1.2) {
        this.picoMs = ahora;
        this.maximoPico = oscilacion;
      }

      return;
    }

    this.maximoPico =
      Math.max(this.maximoPico, oscilacion);

    const duracion = ahora - this.picoMs;

    // Un golpe fuerte o una elevación prolongada
    // no confirman un paso.
    if (duracion > 550 || this.maximoPico > 6) {
      this.picoMs = null;
      this.maximoPico = 0;
      this.reiniciarCadencia();
      return;
    }

    // Exigir subida y bajada:
    // volver apenas a cero no es suficiente.
    if (oscilacion > -0.35) {
      return;
    }

    const instantePaso = this.picoMs;

    this.picoMs = null;
    this.maximoPico = 0;

    if (duracion < 80) {
      this.reiniciarCadencia();
      return;
    }

    this.registrarCandidatoPaso(instantePaso);
  }

  private registrarCandidatoPaso(
    instantePaso: number
  ): void {
    const anterior =
      this.candidatosPasoMs.at(-1);

    if (anterior !== undefined) {
      const separacion = instantePaso - anterior;

      // Ignorar rebotes sin contarlos
      // ni sustituir el candidato previo.
      if (
        separacion < this.intervaloMinimoPasoMs
      ) {
        return;
      }

      const intervalos = this.candidatosPasoMs
        .slice(1)
        .map(
          (instante, indice) =>
            instante - this.candidatosPasoMs[indice]
        )
        .sort((a, b) => a - b);

      const mediana = intervalos.length > 0
        ? intervalos[Math.floor(intervalos.length / 2)]
        : null;

      const ritmoIncompatible =
        mediana !== null &&
        Math.abs(separacion - mediana) >
          Math.max(120, mediana * 0.3);

      if (
        separacion > this.intervaloMaximoPasoMs ||
        ritmoIncompatible
      ) {
        this.reiniciarCadencia();
      }
    }

    this.candidatosPasoMs.push(instantePaso);

    if (
      this.candidatosPasoMs.length <
      this.ciclosParaConfirmar
    ) {
      return;
    }

    const cantidad = this.cadenciaConfirmada
      ? 1
      : this.ciclosParaConfirmar;

    this.cadenciaConfirmada = true;

    this.candidatosPasoMs =
      this.candidatosPasoMs.slice(
        -this.ciclosParaConfirmar
      );

    const direccion =
      this.resolverDireccion();

    this.direccion = direccion;

    if (
      direccion === 'sin-rumbo' ||
      direccion === 'desviado'
    ) {
      this.reiniciarCadencia();
      this.publicar(this.faseDelTramo());
      return;
    }

    if (
      this.indice >= this.tramos.length &&
      direccion !== 'retrocediendo'
    ) {
      return;
    }

    this.pasos += cantidad;

    if (direccion === 'retrocediendo') {
      this.retrocederEstimacion(
        cantidad * this.longitudPaso
      );
    } else {
      this.avanzarEstimacion(
        cantidad * this.longitudPaso
      );
    }
  }

  private reiniciarCadencia(): void {
    this.candidatosPasoMs = [];
    this.cadenciaConfirmada = false;
  }

  private avanzarEstimacion(
    metros: number
  ): void {
    while (
      metros > 0 &&
      this.indice < this.tramos.length
    ) {
      const tramo = this.tramos[this.indice];

      if (tramo.cambioNivel) {
        this.reiniciarDetector();
        this.publicar('confirmar-nivel');
        return;
      }

      const avance = Math.min(
        metros,
        tramo.distancia - this.metrosTramo
      );

      this.metrosTramo += avance;
      metros -= avance;

      if (
        this.metrosTramo + 0.000001 <
        tramo.distancia
      ) {
        break;
      }

      ++this.indice;
      this.metrosTramo = 0;
    }

    const fase = this.faseDelTramo();

    this.publicar(fase);

    if (
      fase === 'llegada-estimada' &&
      this.desplazamientoRumbo === null
    ) {
      this.reiniciarDetector();
      void this.sensores.detener();
    }
  }

  private faseDelTramo(): FaseSeguimientoRuta {
    return this.indice >= this.tramos.length
      ? 'llegada-estimada'
      : this.tramos[this.indice].cambioNivel
        ? 'confirmar-nivel'
        : 'siguiendo';
  }

  private publicar(
    fase: FaseSeguimientoRuta
  ): void {
    const tramo = this.tramos[this.indice];

    const total = this.tramos.reduce(
      (suma, item) => suma + item.distancia,
      0
    );

    const recorridos = this.tramos
      .slice(0, this.indice)
      .reduce(
        (suma, item) => suma + item.distancia,
        0
      ) + this.metrosTramo;

    this.estadoInterno.next({
      fase,
      indiceNodo: this.indice,
      origenTramoId:
        tramo?.origen.id ??
        this.tramos[this.tramos.length - 1]?.destino.id ??
        null,
      destinoTramoId:
        tramo?.destino.id ?? null,
      fraccionTramo: tramo && tramo.distancia > 0
        ? Math.max(
            0,
            Math.min(
              1,
              this.metrosTramo / tramo.distancia
            )
          )
        : 0,
      metrosRecorridos: recorridos,
      metrosRestantes:
        Math.max(0, total - recorridos),
      pasosEstimados: this.pasos,
      direccion: this.direccion,
      orientacionCalibrada:
        this.desplazamientoRumbo !== null,
      longitudPasoMetros: this.longitudPaso > 0
        ? this.longitudPaso
        : null
    });
  }

  // El usuario apunta hacia el siguiente tramo.
  // No supone que el plano mira al norte.
  calibrarOrientacion(): boolean {
    const rumboPlano = this.rumboDelTramo();

    if (
      this.estadoInterno.value.fase !== 'siguiendo' ||
      rumboPlano === null ||
      this.ultimoRumbo === null ||
      performance.now() - this.instanteRumbo > 2000
    ) {
      return false;
    }

    this.desplazamientoRumbo =
      rumboPlano - this.ultimoRumbo;

    this.direccion = 'avanzando';
    this.reiniciarDetector();
    this.publicar('siguiendo');

    return true;
  }

  desactivarOrientacion(): void {
    this.desplazamientoRumbo = null;
    this.direccion = 'sin-calibrar';
    this.reiniciarDetector();
    this.publicar(this.estadoInterno.value.fase);
  }

  private resolverDireccion():
    DireccionSeguimiento {
    if (
      this.desplazamientoRumbo === null
    ) {
      return 'sin-calibrar';
    }

    const esperado = this.rumboDelTramo();

    if (
      esperado === null ||
      this.ultimoRumbo === null ||
      performance.now() - this.instanteRumbo > 2000
    ) {
      return 'sin-rumbo';
    }

    const diferencia = Math.abs(
      (
        (
          this.ultimoRumbo +
          this.desplazamientoRumbo -
          esperado
        ) % 360 + 540
      ) % 360 - 180
    );

    return diferencia <= 55
      ? 'avanzando'
      : diferencia >= 125
        ? 'retrocediendo'
        : 'desviado';
  }

  private rumboDelTramo(): number | null {
    const indice = Math.min(
      this.indice,
      this.tramos.length - 1
    );

    const tramo = this.tramos[indice];

    if (!tramo || tramo.cambioNivel) {
      return null;
    }

    const nivel = tramo.origen.nivel;

    const posiciones = nivel === 1
      ? POSICIONES_PLANO_NIVEL_UNO
      : nivel === 3
        ? POSICIONES_PLANO_NIVEL_TRES
        : null;

    const tramos = nivel === 1
      ? TRAMOS_PLANO_NIVEL_UNO
      : nivel === 3
        ? TRAMOS_PLANO_NIVEL_TRES
        : {};

    // No mezcla coordenadas esquemáticas
    // con píxeles del plano ilustrado.
    const origen = posiciones
      ? posiciones[tramo.origen.id]
      : [tramo.origen.x, tramo.origen.y] as const;

    const destino = posiciones
      ? posiciones[tramo.destino.id]
      : [tramo.destino.x, tramo.destino.y] as const;

    if (!origen || !destino) {
      return null;
    }

    const intermedios =
      tramos[
        `${tramo.origen.id}|${tramo.destino.id}`
      ] ??
      [
        ...(
          tramos[
            `${tramo.destino.id}|${tramo.origen.id}`
          ] ?? []
        )
      ].reverse();

    const puntos = [
      origen,
      ...intermedios,
      destino
    ];

    const segmentos = puntos
      .slice(1)
      .map((hasta, i) => ({
        desde: puntos[i],
        hasta,
        largo: Math.hypot(
          hasta[0] - puntos[i][0],
          hasta[1] - puntos[i][1]
        )
      }))
      .filter(
        item =>
          Number.isFinite(item.largo) &&
          item.largo > 0.01
      );

    if (!segmentos.length) {
      return null;
    }

    const fraccion =
      this.indice >= this.tramos.length
        ? 1
        : Math.max(
            0,
            Math.min(
              1,
              this.metrosTramo / tramo.distancia
            )
          );

    let pendiente = segmentos.reduce(
      (total, item) => total + item.largo,
      0
    ) * fraccion;

    let segmento =
      segmentos[segmentos.length - 1];

    for (const item of segmentos) {
      if (
        pendiente <
        item.largo - 0.000001
      ) {
        segmento = item;
        break;
      }

      pendiente -= item.largo;
    }

    return Math.atan2(
      segmento.hasta[0] -
        segmento.desde[0],
      -(
        segmento.hasta[1] -
        segmento.desde[1]
      )
    ) * 180 / Math.PI;
  }

  private retrocederEstimacion(
    metros: number
  ): void {
    if (
      this.indice >= this.tramos.length
    ) {
      this.indice =
        this.tramos.length - 1;

      this.metrosTramo =
        this.tramos[this.indice].distancia;
    }

    while (
      metros > 0 &&
      this.indice >= 0
    ) {
      const retroceso = Math.min(
        metros,
        this.metrosTramo
      );

      this.metrosTramo -= retroceso;
      metros -= retroceso;

      if (
        metros <= 0 ||
        this.indice === 0
      ) {
        break;
      }

      if (
        this.tramos[this.indice - 1].cambioNivel
      ) {
        this.direccion = 'limite-nivel';
        break;
      }

      --this.indice;

      this.metrosTramo =
        this.tramos[this.indice].distancia;
    }

    this.publicar(this.faseDelTramo());
  }

  private reiniciarDetector(): void {
    this.mediaGravedad = null;
    this.ultimaMuestraMs = null;
    this.picoMs = null;
    this.aceleracionSuavizada = null;
    this.maximoPico = 0;
    this.reiniciarCadencia();
  }
}