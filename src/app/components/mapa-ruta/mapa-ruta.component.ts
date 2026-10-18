import {
  POSICIONES_PLANO_NIVEL_UNO,
  TRAMOS_PLANO_NIVEL_UNO,
  ZONAS_CLICABLES_NIVEL_UNO,
  ZonaMapaInteractiva
} from '../../data/plano-nivel-uno.data';
import {
  POSICIONES_PLANO_NIVEL_TRES,
  TRAMOS_PLANO_NIVEL_TRES,
  ZONAS_CLICABLES_NIVEL_TRES
} from '../../data/plano-nivel-tres.data';

import {
  CommonModule
} from '@angular/common';

import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges
} from '@angular/core';

import {
  Conexion,
  Nodo
} from '../../models/nodo.model';

interface NodoVisual {
  nodo: Nodo;
  textoEtiqueta: string;
  xVisual: number;
  yVisual: number;
  etiquetaX: number;
  etiquetaY: number;
  etiquetaAncla: 'start' | 'middle' | 'end';
  indiceRuta: number;
  perteneceRuta: boolean;
  recorridoCompletado: boolean;
  recorridoPendiente: boolean;
  esOrigen: boolean;
  esDestino: boolean;
  esActual: boolean;
}

interface ConexionVisual {
  trazado: string;
  origen: NodoVisual;
  destino: NodoVisual;
  indiceRuta: number;
  perteneceRuta: boolean;
  recorridoCompletado: boolean;
  esTramoActual: boolean;
  recorridoPendiente: boolean;
  accesible: boolean;
  habilitada: boolean;
}

interface PuntoMapa {
  x: number;
  y: number;
}

@Component({
  selector: 'app-mapa-ruta',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl:
    './mapa-ruta.component.html',
  styleUrl:
    './mapa-ruta.component.scss'
})
export class MapaRutaComponent implements OnChanges, OnDestroy {
  private readonly detector = inject(ChangeDetectorRef);
  private readonly zona = inject(NgZone);
  private cursorAnimado: PuntoMapa | null = null;
  private frameAnimacion = 0;
  private anguloCursorAnimado = 0;
  private frameFinalizacion = 0;
  private centroSeguimiento: PuntoMapa | null = null;

  zoom = 1;
  seguirCursor = true;

  @Output()
  puntoMapaSeleccionado = new EventEmitter<string>();

  @Output()
  movimientoRutaIniciado = new EventEmitter<number>();

  @Output()
  movimientoRutaCompletado = new EventEmitter<void>();

  @Input()
  nodos: Nodo[] = [];

  @Input()
  conexiones: Conexion[] = [];

  @Input()
  ruta: Nodo[] = [];

  @Input()
  nivel = 1;

  @Input()
  duracionVozObjetivoMs = 0;

  @Input()
  usarPlanoReal = false;

  @Input()
  mostrarGuiaFisicaNivelUno = false;

  @Input()
  origenId: string | null = null;

  @Input()
  destinoId: string | null = null;

  @Input()
  nodoActualId: string | null = null;

  @Input()
  textoEtiqueta =
    'Mapa navegable preliminar';

  @Input()
  textoNivel = 'Nivel';

  @Input()
  textoEstado = 'Mediciones de referencia';

  @Input()
  textoAriaMapa =
    'Grafo navegable';

  @Input()
  textoSinDatos =
    'No existen nodos disponibles.';

  @Input()
  textoNodo = 'Nodo';

  @Input()
  textoRuta = 'Ruta calculada';

  @Input()
  textoOrigen = 'Origen';

  @Input()
  textoDestino = 'Destino';

  @Input()
  textoUbicacionActual =
    'Ubicación actual';

  @Input()
  textoAccesoCerrado =
    'Acceso cerrado';

  @Input()
  textoNavegacion =
    'Navegación activa';

  @Input()
  textoPaso = 'Paso';

  @Input()
  textoSigueHacia =
    'Sigue hacia';

  @Input()
  textoLlegada =
    'Llegaste a';

  @Input()
  textoGuiaFisica =
    'Orientación física · Nivel 1';

  @Input()
  textoDesdeAscensoresPrincipales =
    'Desde los dos ascensores principales';

  @Input()
  textoDesdeHall = 'Desde el hall';

  @Input()
  textoIzquierda = 'Izquierda';

  @Input()
  textoDerecha = 'Derecha';

  @Input()
  textoRutaAscensoresIzquierda =
    'Mini Club Kids → Zona Play → Minimarket Proa → Hall';

  @Input()
  textoRutaAscensoresDerecha =
    'Zona de juegos de adultos + baños; acceso por escaleras';

  @Input()
  textoRutaHallDerecha =
    'Salón TerraMar → Entrega de toallas + baños de damas y varones → escaleras de acceso al Gimnasio → Gimnasio → Alma Spa → Salón MonteMar → Ascensores de habitaciones';

  @Input()
  textoRutaHallIzquierda =
    'Salón Altamar → Escaleras de emergencia';

  @Input()
  textoNotaAccesoEscaleras =
    'Ubicaciones corroboradas en terreno. Las escaleras son parte del acceso al Gimnasio y a Juegos Adultos.';

  ngOnChanges(cambios: SimpleChanges): void {
    const cambioNodo = cambios['nodoActualId'];
    const cambioRuta = cambios['ruta'];
    const cambioNivel = !!cambios['nivel'] || !!cambios['usarPlanoReal'];
    const cambioDatos = !!cambios['nodos'];

    if (!cambioNodo && !cambioRuta && !cambioNivel && !cambioDatos) {
      return;
    }

    this.cancelarAnimacion();
    const visual = this.nodoActualVisual;
    const destino = visual ? { x: visual.xVisual, y: visual.yVisual } : null;

    if (cambioNivel || cambioRuta || cambioDatos) {
      this.zoom = 1;
      this.centroSeguimiento = null;
      this.seguirCursor = true;
    }

    if (!destino) {
      this.cursorAnimado = null;
      this.zoom = 1;
      this.centroSeguimiento = null;
      this.detector.markForCheck();
      return;
    }

    if (cambioNivel || cambioRuta || cambioDatos ||
        !cambioNodo || !cambioNodo.previousValue) {
      this.cursorAnimado = destino;
      this.anguloCursorAnimado = this.obtenerAnguloSalida();
      this.detector.markForCheck();
      if (cambioNodo && cambioNodo.previousValue && this.navegacionActiva) {
        this.programarFinalizacion();
      }
      return;
    }

    const anteriorId = cambioNodo.previousValue as string;
    const anterior = this.nodosVisuales.find(item => item.nodo.id === anteriorId);
    if (!anterior) {
      this.cursorAnimado = destino;
      this.anguloCursorAnimado = this.obtenerAnguloSalida();
      this.detector.markForCheck();
      this.programarFinalizacion();
      return;
    }

    const inicio = this.cursorAnimado ?? {
      x: anterior.xVisual,
      y: anterior.yVisual
    };
    const intermedios = this.obtenerPuntosIntermedios(anteriorId, this.nodoActualId!);
    this.animarCursor([
      inicio,
      ...intermedios.map(([x, y]) => ({ x, y })),
      destino
    ]);
  }

  ngOnDestroy(): void {
    this.cancelarAnimacion();
  }

  private cancelarAnimacion(): void {
    cancelAnimationFrame(this.frameAnimacion);
    cancelAnimationFrame(this.frameFinalizacion);
    this.frameAnimacion = 0;
    this.frameFinalizacion = 0;
  }

  private programarFinalizacion(): void {
    this.frameFinalizacion = requestAnimationFrame(() => {
      this.frameFinalizacion = 0;
      this.zona.run(() => this.movimientoRutaCompletado.emit());
    });
  }

  get anchoVista(): number {
    return this.esMapaVisualNivel
      ? this.nivel === 1 ? 1600 : 1275
      : 1000;
  }

  get altoVista(): number {
    return this.esMapaVisualNivel
      ? this.nivel === 1 ? 900 : 805
      : 650;
  }

  get viewBoxMapa(): string {
    const [x, y, ancho, alto] = this.cajaBase;
    const zoom = Math.max(1, Math.min(4, this.zoom));
    if (!this.centroSeguimiento || zoom === 1) {
      return `${x} ${y} ${ancho} ${alto}`;
    }
    const anchoVisible = ancho / zoom;
    const altoVisible = alto / zoom;
    const izquierda = Math.max(x, Math.min(
      x + ancho - anchoVisible,
      this.centroSeguimiento.x - anchoVisible / 2
    ));
    const arriba = Math.max(y, Math.min(
      y + alto - altoVisible,
      this.centroSeguimiento.y - altoVisible / 2
    ));
    return `${izquierda} ${arriba} ${anchoVisible} ${altoVisible}`;
  }

  private get cajaBase(): readonly [number, number, number, number] {
    return this.esPlanoNivelTres
      ? [72, 335, 1203, 470]
      : [0, 0, this.anchoVista, this.altoVista];
  }

  ajustarPlano(): void {
    this.zoom = 1;
    this.seguirCursor = false;
    this.centroSeguimiento = null;
    this.detector.markForCheck();
  }

  centrarCursor(): void {
    const cursor = this.posicionCursor;
    if (!cursor) {
      return;
    }
    this.seguirCursor = true;
    this.zoom = this.nivel === 1 ? 2.5 : 2;
    this.centroSeguimiento = { ...cursor };
    this.detector.markForCheck();
  }

  private actualizarSeguimiento(punto: PuntoMapa): void {
    if (this.seguirCursor) {
      this.centroSeguimiento = { ...punto };
    }
  }

  get imagenMapa(): string | null {
    if (this.esPlanoRealNivelUno) {
      return 'assets/mapa/mapa-nivel-1-waze.webp';
    }

    if (this.esPlanoNivelTres) {
      return 'assets/mapa/mapa-nivel-3-waze.webp';
    }

    return null;
  }

  get imagenMapaX(): number {
    return this.esPlanoNivelTres ? 72 : 0;
  }

  get imagenMapaY(): number {
    return this.esPlanoNivelTres ? 335 : 0;
  }

  get anchoImagenMapa(): number {
    return this.esPlanoNivelTres ? 1203 : 1600;
  }

  get altoImagenMapa(): number {
    return this.esPlanoNivelTres ? 470 : 900;
  }

  get margen(): number {
    return this.esMapaVisualNivel
      ? 0
      : 80;
  }

  get zonasClicables(): readonly ZonaMapaInteractiva[] {
    const zonas = this.esPlanoRealNivelUno
      ? ZONAS_CLICABLES_NIVEL_UNO
      : this.esPlanoNivelTres
        ? ZONAS_CLICABLES_NIVEL_TRES
        : [];
    const ids = new Set(this.nodos.map(nodo => nodo.id));

    return zonas.filter(zona => ids.has(zona.nodoId));
  }

  get nodosVisuales(): NodoVisual[] {
    const nodosNivel =
      this.nodos.filter(
        nodo => nodo.nivel === this.nivel &&
          (!this.esMapaVisualNivel || !!this.obtenerPosicionFija(nodo.id))
      );

    if (nodosNivel.length === 0) {
      return [];
    }

    const valoresX =
      nodosNivel.map(
        nodo => nodo.x
      );

    const valoresY =
      nodosNivel.map(
        nodo => nodo.y
      );

    const minimoX =
      Math.min(...valoresX);

    const maximoX =
      Math.max(...valoresX);

    const minimoY =
      Math.min(...valoresY);

    const maximoY =
      Math.max(...valoresY);

    const rangoX = maximoX - minimoX;
    const rangoY = maximoY - minimoY;

    const anchoDisponible =
      this.anchoVista -
      this.margen * 2;

    const altoDisponible =
      this.altoVista -
      this.margen * 2;

    const escalaHorizontal =
      rangoX === 0
        ? Number.POSITIVE_INFINITY
        : anchoDisponible / rangoX;

    const escalaVertical =
      rangoY === 0
        ? Number.POSITIVE_INFINITY
        : altoDisponible / rangoY;

    const escalaCalculada =
      Math.min(
        escalaHorizontal,
        escalaVertical
      );

    const escala =
      Number.isFinite(escalaCalculada)
        ? escalaCalculada
        : 1;

    const desplazamientoX =
      (anchoDisponible - rangoX * escala) / 2;

    const desplazamientoY =
      (altoDisponible - rangoY * escala) / 2;

    const indiceActualRuta =
      this.obtenerIndiceActualRuta();

    return nodosNivel.map(
      nodo => {
        const xVisual =
          this.esMapaVisualNivel
            ? this.obtenerPosicionFija(nodo.id)![0]
            : this.margen +
              desplazamientoX +
              (nodo.x - minimoX) * escala;

        const yVisual =
          this.esMapaVisualNivel
            ? this.obtenerPosicionFija(nodo.id)![1]
            : this.margen +
              desplazamientoY +
              (nodo.y - minimoY) * escala;

        const indiceRuta =
          this.obtenerIndiceNodoEnRuta(
            nodo.id
          );

        return {
          nodo,
          xVisual,
          yVisual,
          ...this.obtenerPosicionEtiqueta(
            nodo,
            xVisual,
            yVisual
          ),
          textoEtiqueta:
            this.obtenerTextoEtiqueta(nodo),
          indiceRuta,
          perteneceRuta:
            indiceRuta !== -1,
          recorridoCompletado:
            indiceRuta !== -1 &&
            indiceActualRuta !== -1 &&
            indiceRuta < indiceActualRuta,
          recorridoPendiente:
            indiceRuta !== -1 &&
            (
              indiceActualRuta === -1 ||
              indiceRuta > indiceActualRuta
            ),
          esOrigen:
            nodo.id === this.origenId,
          esDestino:
            nodo.id === this.destinoId,
          esActual:
            nodo.id ===
            this.nodoActualId
        };
      }
    );
  }

  get conexionesVisuales():
    ConexionVisual[] {
    const indiceActualRuta =
      this.obtenerIndiceActualRuta();

    const nodosPorId =
      new Map(
        this.nodosVisuales.map(
          nodoVisual => [
            nodoVisual.nodo.id,
            nodoVisual
          ]
        )
      );

    return this.conexiones
      .map(conexion => {
        const origen =
          nodosPorId.get(
            conexion.origen
          );

        const destino =
          nodosPorId.get(
            conexion.destino
          );

        if (!origen || !destino) {
          return null;
        }

        const indiceRuta =
          this.obtenerIndiceConexionRuta(
            conexion.origen,
            conexion.destino
          );

        return {
          origen,
          destino,
          trazado: this.trazarConexion(origen, destino),
          indiceRuta,
          perteneceRuta: indiceRuta !== -1,
          recorridoCompletado:
            indiceRuta !== -1 &&
            indiceActualRuta !== -1 &&
            indiceRuta < indiceActualRuta,
          esTramoActual:
            indiceRuta !== -1 &&
            indiceRuta === indiceActualRuta,
          recorridoPendiente:
            indiceRuta !== -1 &&
            (
              indiceActualRuta === -1 ||
              indiceRuta > indiceActualRuta
            ),
          accesible:
            conexion.accesible === true,
          habilitada:
            conexion.habilitada !== false
        };
      })
      .filter(
        (
          conexion
        ): conexion is ConexionVisual =>
          conexion !== null
      );
  }

  get hayDatosNivel(): boolean {
    return (
      this.nodosVisuales.length > 0
    );
  }

  get esPlanoRealNivelUno(): boolean {
    return this.usarPlanoReal &&
      this.nivel === 1;
  }

  get esPlanoNivelTres(): boolean {
    return this.usarPlanoReal &&
      this.nivel === 3;
  }

  get esMapaVisualNivel(): boolean {
    return this.esPlanoRealNivelUno || this.esPlanoNivelTres;
  }

  get navegacionActiva(): boolean {
    return (
      this.ruta.length > 1 &&
      this.obtenerIndiceActualRuta() !== -1
    );
  }

  get pasoActualRuta(): number {
    const indiceActual =
      this.obtenerIndiceActualRuta();

    return indiceActual === -1
      ? 0
      : indiceActual + 1;
  }

  get totalNodosRuta(): number {
    return this.ruta.length;
  }

  get progresoNavegacion(): number {
    const indiceActual =
      this.obtenerIndiceActualRuta();

    if (
      indiceActual === -1 ||
      this.ruta.length < 2
    ) {
      return 0;
    }

    return Math.round(
      (indiceActual /
        (this.ruta.length - 1)) *
        100
    );
  }

  get instruccionNavegacion(): string {
    const indiceActual =
      this.obtenerIndiceActualRuta();

    if (indiceActual === -1) {
      return '';
    }

    const nodoActual =
      this.ruta[indiceActual];

    const siguienteNodo =
      this.obtenerSiguienteNodoRuta();

    if (!siguienteNodo) {
      return [
        this.textoLlegada,
        nodoActual.nombre
      ].join(' ');
    }

    return [
      this.textoSigueHacia,
      siguienteNodo.nombre
    ].join(' ');
  }

  get nodoActualVisual(): NodoVisual | null {
    return (
      this.nodosVisuales.find(
        nodoVisual => nodoVisual.esActual
      ) ?? null
    );
  }

  get posicionCursor(): PuntoMapa | null {
    if (this.cursorAnimado) {
      return this.cursorAnimado;
    }

    const actual = this.nodoActualVisual;

    return actual
      ? {
          x: actual.xVisual,
          y: actual.yVisual
        }
      : null;
  }

  get mostrarMarcadorDireccion(): boolean {
    return this.posicionCursor !== null;
  }

  private trazarConexion(origen: NodoVisual, destino: NodoVisual): string {
    const clave = `${origen.nodo.id}|${destino.nodo.id}`;
    const inversa = `${destino.nodo.id}|${origen.nodo.id}`;
    const tramos = this.esPlanoRealNivelUno
      ? TRAMOS_PLANO_NIVEL_UNO
      : this.esPlanoNivelTres
        ? TRAMOS_PLANO_NIVEL_TRES
        : {};
    const puntos = tramos[clave] ?? [...(tramos[inversa] ?? [])].reverse();
    return `M ${origen.xVisual} ${origen.yVisual} ` +
      [...puntos, [destino.xVisual, destino.yVisual]]
        .map(([x, y]) => `L ${x} ${y}`).join(' ');
  }

  seleccionarZona(nodoId: string): void {
    this.puntoMapaSeleccionado.emit(nodoId);
  }

  nombreZona(nodoId: string): string {
    return this.nodos.find(nodo => nodo.id === nodoId)?.nombre ?? nodoId;
  }

  private obtenerPosicionFija(nodoId: string): readonly [number, number] | undefined {
    return this.esPlanoRealNivelUno
      ? POSICIONES_PLANO_NIVEL_UNO[nodoId]
      : this.esPlanoNivelTres
        ? POSICIONES_PLANO_NIVEL_TRES[nodoId]
        : undefined;
  }

  get anguloDireccionActual(): number {
    return this.cursorAnimado
      ? this.anguloCursorAnimado
      : this.obtenerAnguloSalida();
  }

  private obtenerPuntosIntermedios(
    origenId: string,
    destinoId: string
  ): readonly (readonly [number, number])[] {
    const tramos = this.esPlanoRealNivelUno
      ? TRAMOS_PLANO_NIVEL_UNO
      : this.esPlanoNivelTres
        ? TRAMOS_PLANO_NIVEL_TRES
        : {};
    return tramos[`${origenId}|${destinoId}`] ??
      [...(tramos[`${destinoId}|${origenId}`] ?? [])].reverse();
  }

  private obtenerAnguloSalida(): number {
    const actual = this.nodoActualVisual;
    const siguiente = this.obtenerSiguienteNodoRuta();
    if (!actual || !siguiente) {
      return this.anguloCursorAnimado;
    }
    const inicio = { x: actual.xVisual, y: actual.yVisual };
    const puntos = this.obtenerPuntosIntermedios(actual.nodo.id, siguiente.id);
    const intermedio = puntos.find(([x, y]) => Math.hypot(x - inicio.x, y - inicio.y) > 0.01);
    if (intermedio) {
      return this.anguloEntrePuntos(inicio, { x: intermedio[0], y: intermedio[1] });
    }
    const destino = this.nodosVisuales.find(item => item.nodo.id === siguiente.id);
    return destino
      ? this.anguloEntrePuntos(inicio, { x: destino.xVisual, y: destino.yVisual })
      : this.anguloCursorAnimado;
  }

  private anguloEntrePuntos(origen: PuntoMapa, destino: PuntoMapa): number {
    return Math.atan2(destino.y - origen.y, destino.x - origen.x) * 180 / Math.PI + 90;
  }

  private animarCursor(puntos: PuntoMapa[]): void {
    // Conserva los corredores exactos del plano; elimina solo puntos repetidos.
    const camino = puntos.filter((punto, indice) => indice === 0 ||
      Math.hypot(punto.x - puntos[indice - 1].x, punto.y - puntos[indice - 1].y) > 0.01);
    const longitudes = camino.slice(1).map((punto, indice) =>
      Math.hypot(punto.x - camino[indice].x, punto.y - camino[indice].y));
    const distanciaTotal = longitudes.reduce((total, distancia) => total + distancia, 0);

    if (camino.length < 2 || distanciaTotal <= 0) {
      this.cursorAnimado = camino[camino.length - 1] ?? null;
      if (this.cursorAnimado) {
        this.actualizarSeguimiento(this.cursorAnimado);
      }
      this.detector.markForCheck();
      this.programarFinalizacion();
      return;
    }

    const velocidad = this.nivel === 1 ? 58 : 72;
    const duracionMovimiento = Math.min(6500, Math.max(2400, distanciaTotal / velocidad * 1000));
    const duracion = Math.min(7200, Math.max(duracionMovimiento, this.duracionVozObjetivoMs || 0));
    const inicioAnimacion = performance.now();
    let ultimoFrame = inicioAnimacion;
    this.cursorAnimado = { ...camino[0] };
    this.anguloCursorAnimado = this.anguloEntrePuntos(camino[0], camino[1]);
    if (this.seguirCursor) {
      this.zoom = this.nivel === 1 ? 2.5 : 2;
      this.actualizarSeguimiento(this.cursorAnimado);
    }
    this.zona.run(() => this.movimientoRutaIniciado.emit(duracion));

    const animar = (ahora: number): void => {
      const progreso = Math.max(0, Math.min(1, (ahora - inicioAnimacion) / duracion));
      let restante = progreso * distanciaTotal;
      let indice = 0;
      while (indice < longitudes.length - 1 && restante > longitudes[indice]) {
        restante -= longitudes[indice++];
      }
      const origen = camino[indice];
      const destino = camino[indice + 1];
      const proporcion = Math.min(1, restante / longitudes[indice]);
      this.cursorAnimado = {
        x: origen.x + (destino.x - origen.x) * proporcion,
        y: origen.y + (destino.y - origen.y) * proporcion
      };
      const anguloObjetivo = this.anguloEntrePuntos(origen, destino);
      const diferencia = ((anguloObjetivo - this.anguloCursorAnimado + 540) % 360 + 360) % 360 - 180;
      const suavizado = 1 - Math.exp(-Math.max(0, ahora - ultimoFrame) / 90);
      this.anguloCursorAnimado += diferencia * suavizado;
      ultimoFrame = ahora;
      this.actualizarSeguimiento(this.cursorAnimado);
      this.detector.markForCheck();

      if (progreso < 1) {
        this.frameAnimacion = requestAnimationFrame(animar);
        return;
      }
      this.cursorAnimado = { ...camino[camino.length - 1] };
      this.anguloCursorAnimado = anguloObjetivo;
      this.frameAnimacion = 0;
      this.actualizarSeguimiento(this.cursorAnimado);
      this.detector.markForCheck();
      this.zona.run(() => this.movimientoRutaCompletado.emit());
    };
    this.frameAnimacion = requestAnimationFrame(animar);
  }

  identificarNodo(
    _indice: number,
    nodoVisual: NodoVisual
  ): string {
    return nodoVisual.nodo.id;
  }

  identificarConexion(
    indice: number,
    conexion: ConexionVisual
  ): string {
    return [
      conexion.origen.nodo.id,
      conexion.destino.nodo.id,
      indice
    ].join('-');
  }

  private obtenerIndiceActualRuta(): number {
    if (!this.nodoActualId) {
      return -1;
    }

    return this.obtenerIndiceNodoEnRuta(
      this.nodoActualId
    );
  }

  private obtenerIndiceNodoEnRuta(
    nodoId: string
  ): number {
    return this.ruta.findIndex(
      nodo => nodo.id === nodoId
    );
  }

  private obtenerSiguienteNodoRuta():
    Nodo | null {
    const indiceActual =
      this.obtenerIndiceActualRuta();

    if (indiceActual === -1) {
      return null;
    }

    return this.ruta[
      indiceActual + 1
    ] ?? null;
  }

  private obtenerIndiceConexionRuta(
    origenId: string,
    destinoId: string
  ): number {
    for (
      let indice = 0;
      indice < this.ruta.length - 1;
      indice++
    ) {
      const actual =
        this.ruta[indice].id;

      const siguiente =
        this.ruta[indice + 1].id;

      const coincideDirectamente =
        actual === origenId &&
        siguiente === destinoId;

      const coincideInversamente =
        actual === destinoId &&
        siguiente === origenId;

      if (
        coincideDirectamente ||
        coincideInversamente
      ) {
        return indice;
      }
    }

    return -1;
  }

  private obtenerPosicionEtiqueta(
    nodo: Nodo,
    xVisual: number,
    yVisual: number
  ): Pick<
    NodoVisual,
    | 'etiquetaX'
    | 'etiquetaY'
    | 'etiquetaAncla'
  > {
    const posicionesNivelUno: Record<
      string,
      Pick<
        NodoVisual,
        | 'etiquetaX'
        | 'etiquetaY'
        | 'etiquetaAncla'
      >
    > = {
      'ascensor-central-nivel-1': {
        etiquetaX: 0,
        etiquetaY: -38,
        etiquetaAncla: 'middle'
      },
      'zona-kid-nivel-1': {
        etiquetaX: 0,
        etiquetaY: -38,
        etiquetaAncla: 'middle'
      },
      'zona-juego-adulto-nivel-1': {
        etiquetaX: 0,
        etiquetaY: -38,
        etiquetaAncla: 'middle'
      },
      'zona-play-nivel-1': {
        etiquetaX: 0,
        etiquetaY: 48,
        etiquetaAncla: 'middle'
      },
      'hall-nivel-1': {
        etiquetaX: 0,
        etiquetaY: -38,
        etiquetaAncla: 'middle'
      },
      'mini-market-proa-nivel-1': {
        etiquetaX: 0,
        etiquetaY: -38,
        etiquetaAncla: 'middle'
      },
      'gimnasio-nivel-1': {
        etiquetaX: 0,
        etiquetaY: 48,
        etiquetaAncla: 'middle'
      },
      'salon-eventos-montemar-nivel-1': {
        etiquetaX: 0,
        etiquetaY: -38,
        etiquetaAncla: 'middle'
      },
      'salon-eventos-terramar-nivel-1': {
        etiquetaX: 0,
        etiquetaY: -38,
        etiquetaAncla: 'middle'
      },
      'alma-spa-nivel-1': {
        etiquetaX: 0,
        etiquetaY: -38,
        etiquetaAncla: 'middle'
      },
      'ascensor-habitaciones-nivel-1': {
        etiquetaX: -24,
        etiquetaY: 48,
        etiquetaAncla: 'end'
      }
    };

    const posicionPersonalizada =
      posicionesNivelUno[nodo.id];

    if (posicionPersonalizada) {
      return posicionPersonalizada;
    }

    const distanciaBorde = 130;

    if (
      xVisual <=
      this.margen + distanciaBorde
    ) {
      return {
        etiquetaX: 32,
        etiquetaY:
          yVisual <=
          this.margen + 60
            ? 42
            : -34,
        etiquetaAncla: 'start'
      };
    }

    if (
      xVisual >=
      this.anchoVista -
      this.margen -
      distanciaBorde
    ) {
      return {
        etiquetaX: -32,
        etiquetaY:
          yVisual <=
          this.margen + 60
            ? 42
            : -34,
        etiquetaAncla: 'end'
      };
    }

    return {
      etiquetaX: 0,
      etiquetaY:
        yVisual <=
        this.margen + 60
          ? 42
          : -34,
      etiquetaAncla: 'middle'
    };
  }

  private obtenerTextoEtiqueta(
    nodo: Nodo
  ): string {
    const etiquetasCortas: Record<
      string,
      string
    > = {
      'ascensor-central-nivel-1':
        'Ascensor central',
      'zona-juego-adulto-nivel-1':
        'Sala juegos adultos',
      'mini-market-proa-nivel-1':
        'Minimarket Proa',
      'salon-eventos-montemar-nivel-1':
        'Salón Montemar',
      'salon-eventos-terramar-nivel-1':
        'Salón Terramar',
      'ascensor-habitaciones-nivel-1':
        'Ascensor habitaciones'
    };

    return etiquetasCortas[nodo.id] ??
      nodo.nombre;
  }
}