import { inject, Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { Conexion, Nodo } from '../models/nodo.model';
import {
  MuestraMovimientoNavegacion,
  SensoresNavegacionService
} from './sensores-navegacion.service';

export type FaseSeguimientoRuta = 'inactivo' | 'siguiendo' | 'pausado' |
  'confirmar-nivel' | 'llegada-estimada' | 'completado';

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

  private readonly estadoInterno = new BehaviorSubject<EstadoSeguimientoRuta>({
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

  private mediaGravedad: number | null = null;
  private ultimaMuestraMs: number | null = null;
  private picoMs: number | null = null;
  private candidatoMs: number | null = null;
  private cadenciaConfirmada = false;

  readonly estado$ = this.estadoInterno.asObservable();

  constructor() {
    const sensores = this.sensores;

    this.suscripciones.add(
      sensores.movimiento$.subscribe(muestra =>
        this.procesarMovimiento(muestra)
      )
    );

    this.suscripciones.add(
      sensores.estado$.subscribe(estado => {
        if (!estado.iniciado &&
            ['siguiendo', 'confirmar-nivel'].includes(
              this.estadoInterno.value.fase
            )) {
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

    if (!Number.isFinite(longitudPasoMetros) ||
        longitudPasoMetros < 0.1 || longitudPasoMetros > 2) {
      throw new Error('Configura una longitud de paso entre 0,10 y 2 metros.');
    }

    const tramos = this.validarRuta(ruta, conexiones);
    const operacion = ++this.operacion;

    this.publicar('inactivo');
    await this.sensores.detener();

    if (operacion !== this.operacion || this.destruido) {
      return;
    }

    this.tramos = tramos;
    this.indice = 0;
    this.metrosTramo = 0;
    this.pasos = 0;
    this.longitudPaso = longitudPasoMetros;

    this.reiniciarDetector();
    this.publicar(this.faseDelTramo());

    await this.sensores.iniciar();
  }

  async pausar(): Promise<void> {
    if (!['siguiendo', 'confirmar-nivel'].includes(
      this.estadoInterno.value.fase
    )) {
      return;
    }

    ++this.operacion;
    this.reiniciarDetector();
    this.publicar('pausado');

    await this.sensores.detener();
  }

  async reanudar(): Promise<void> {
    if (this.destruido || this.estadoInterno.value.fase !== 'pausado') {
      return;
    }

    this.reiniciarDetector();
    this.publicar(this.faseDelTramo());

    await this.sensores.iniciar();
  }

  async detener(): Promise<void> {
    ++this.operacion;
    this.reiniciarDetector();
    this.publicar('inactivo');

    await this.sensores.detener();
  }

  // Un QR leído confirma el nodo; nunca se inventa un cambio de piso con GPS.
  confirmarNodo(nodoId: string): boolean {
    if (!this.tramos.length || this.estadoInterno.value.fase === 'inactivo') {
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
    if (ruta.length < 2 ||
        new Set(ruta.map(nodo => nodo.id)).size !== ruta.length) {
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

      if (!conexion ||
          conexion.habilitada === false ||
          conexion.restringida === true ||
          origen.restringido === true ||
          destino.restringido === true ||
          !Number.isFinite(origen.nivel) ||
          !Number.isFinite(destino.nivel) ||
          !Number.isFinite(conexion.distancia) ||
          conexion.distancia < 0 ||
          (!cambioNivel && conexion.distancia === 0)) {
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
    if (this.estadoInterno.value.fase !== 'siguiendo') {
      return;
    }

    const valor = muestra.magnitudConGravedad;
    const ahora = muestra.instanteMs;

    if (valor === null ||
        !Number.isFinite(valor) ||
        !Number.isFinite(ahora) ||
        (this.ultimaMuestraMs !== null && ahora <= this.ultimaMuestraMs)) {
      return;
    }

    if (this.ultimaMuestraMs === null ||
        ahora - this.ultimaMuestraMs > 2000) {
      this.reiniciarDetector();
      this.mediaGravedad = valor;
      this.ultimaMuestraMs = ahora;
      return;
    }

    const intervalo = ahora - this.ultimaMuestraMs;
    this.ultimaMuestraMs = ahora;

    this.mediaGravedad! +=
      (1 - Math.exp(-intervalo / 500)) *
      (valor - this.mediaGravedad!);

    const oscilacion = valor - this.mediaGravedad!;

    // Umbrales iniciales del detector: requieren validación en el teléfono.
    if (oscilacion >= 1.2 && this.picoMs === null) {
      this.picoMs = ahora;
    }

    if (this.picoMs === null) {
      return;
    }

    const duracion = ahora - this.picoMs;

    if (duracion > 600) {
      this.picoMs = null;
      return;
    }

    if (oscilacion > 0.2 || duracion < 60) {
      return;
    }

    const instantePaso = this.picoMs;
    this.picoMs = null;

    const separacion = this.candidatoMs === null
      ? Infinity
      : instantePaso - this.candidatoMs;

    if (separacion < 300) {
      return;
    }

    if (separacion > 1600) {
      this.candidatoMs = instantePaso;
      this.cadenciaConfirmada = false;
      return;
    }

    this.candidatoMs = instantePaso;

    const cantidad = this.cadenciaConfirmada ? 1 : 2;
    this.cadenciaConfirmada = true;
    this.pasos += cantidad;

    this.avanzarEstimacion(cantidad * this.longitudPaso);
  }

  private avanzarEstimacion(metros: number): void {
    while (metros > 0 && this.indice < this.tramos.length) {
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

      if (this.metrosTramo + 0.000001 < tramo.distancia) {
        break;
      }

      ++this.indice;
      this.metrosTramo = 0;
    }

    const fase = this.faseDelTramo();
    this.publicar(fase);

    if (fase === 'llegada-estimada') {
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

  private publicar(fase: FaseSeguimientoRuta): void {
    const tramo = this.tramos[this.indice];

    const total = this.tramos.reduce(
      (suma, item) => suma + item.distancia,
      0
    );

    const recorridos = this.tramos.slice(0, this.indice).reduce(
      (suma, item) => suma + item.distancia,
      0
    ) + this.metrosTramo;

    this.estadoInterno.next({
      fase,
      indiceNodo: this.indice,
      origenTramoId: tramo?.origen.id ??
        this.tramos[this.tramos.length - 1]?.destino.id ?? null,
      destinoTramoId: tramo?.destino.id ?? null,
      fraccionTramo: tramo && tramo.distancia > 0
        ? Math.max(0, Math.min(1, this.metrosTramo / tramo.distancia))
        : 0,
      metrosRecorridos: recorridos,
      metrosRestantes: Math.max(0, total - recorridos),
      pasosEstimados: this.pasos,
      longitudPasoMetros: this.longitudPaso > 0
        ? this.longitudPaso
        : null
    });
  }

  private reiniciarDetector(): void {
    this.mediaGravedad = null;
    this.ultimaMuestraMs = null;
    this.picoMs = null;
    this.candidatoMs = null;
    this.cadenciaConfirmada = false;
  }
}