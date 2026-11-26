import { INVENTARIO_WIFI_NIVEL_TRES } from '../data/inventario-wifi-nivel-tres.data';
import { esPasoAccesibleNivel3, POSICIONES_RUTAS_ACCESIBLES_NIVEL_3 } from '../data/rutas-accesibles-nivel-3.data';
import { AfterViewChecked, ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, ViewChild, inject } from "@angular/core";
import { App } from "@capacitor/app";
import { CapacitorBarcodeScanner, CapacitorBarcodeScannerCameraDirection, CapacitorBarcodeScannerTypeHint } from "@capacitor/barcode-scanner";
import { Capacitor } from "@capacitor/core";
import { IonContent } from "@ionic/angular";
import { MapaRutaComponent } from "../components/mapa-ruta/mapa-ruta.component";
import { TourRutaComponent } from "../components/tour-ruta/tour-ruta.component";
import { obtenerNombreNodo } from "../data/nombres-nodos.data";
import { CATALOGO_TOUR } from "../data/catalogo-tour.data";
import { FotoDestino, FOTOS_DESTINOS } from "../data/fotos-destinos.data";
import { Conexion, LugarPlano, Nodo } from "../models/nodo.model";
import { AsistenteVozService } from "../services/asistente-voz.service";
import { Idioma, IdiomaService } from "../services/idioma.service";
import { MapaService } from "../services/mapa.service";
import { MapaValidadorService, ProblemaMapa, ResultadoValidacionMapa } from "../services/mapa-validador.service";
import { QrService } from "../services/qr.service";
import { PasoRuta, RutaService } from "../services/ruta.service";
import { Subscription } from "rxjs";
import { EstadoSensoresNavegacion, EstadoSensorNavegacion, SensoresNavegacionService } from "../services/sensores-navegacion.service";
import { EstadoSeguimientoRuta, SeguimientoRutaService } from "../services/seguimiento-ruta.service";
import { POSICIONES_PLANO_NIVEL_UNO, TRAMOS_PLANO_NIVEL_UNO } from "../data/plano-nivel-uno.data";
import { POSICIONES_PLANO_NIVEL_TRES, TRAMOS_PLANO_NIVEL_TRES } from "../data/plano-nivel-tres.data";

const METROS_POR_PASO = 0.200;

import { TRAMOS_LEVANTADOS } from "../data/levantamiento-recorridos.data";
import { PUNTOS_WIFI_PRELIMINARES } from "../data/wifi-preliminar.data";
import { CAPTURAS_WIFI_POR_ASOCIAR, ORIGEN_LEVANTAMIENTO_WIFI, REFERENCIAS_WIFI_COMPARTIDAS } from "../data/referencias-wifi.data";
import { EstadoPosicionamientoApoyo, PosicionamientoApoyoService } from "../services/posicionamiento-apoyo.service";
import { CorreccionAutomatica, EstadoNavegacionAutomatica, NavegacionAutomaticaService } from "../services/navegacion-automatica.service";
import { EstadoNavegacionWifi, NavegacionWifiService } from "../services/navegacion-wifi.service";
import { crearMetraje, Metraje, MetrajeTramo } from "../data/metraje";
import { iconoPunto as iconoPuntoBase, imagenIconoPorNombre, imagenIconoPunto } from "../data/iconos-puntos";
import { AdminService } from "../services/admin.service";
import { VistaWazeComponent } from "../components/vista-waze/vista-waze.component";
import { NavegacionWifiComponent } from "../components/navegacion-wifi/navegacion-wifi.component";

type CampoSeleccionVoz = "origen" | "destino";
export interface PuntoPlanoLista {
  node: string;
  canonical: string | null;
  name: string;
  photo: string | null;
  icon: string;
}

@Component({
  selector: "app-home",
  templateUrl: "home.page.html",
  styleUrls: ["home.page.scss"],
  standalone: true,
  imports: [MapaRutaComponent, TourRutaComponent, IonContent, NavegacionWifiComponent, VistaWazeComponent]
})
export class HomePage implements OnDestroy, AfterViewChecked {
  private readonly rutaService = inject(RutaService);
  private readonly qrService = inject(QrService);
  private readonly idiomaService = inject(IdiomaService);
  private readonly asistenteVoz = inject(AsistenteVozService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly mapaService = inject(MapaService);
  private readonly mapaValidadorService = inject(MapaValidadorService);
  private readonly sensoresNavegacion = inject(SensoresNavegacionService);
  private readonly seguimientoRuta = inject(SeguimientoRutaService);
  private readonly posicionamientoApoyo = inject(PosicionamientoApoyoService);
  private readonly navegacionAutomatica = inject(NavegacionAutomaticaService);
  @ViewChild("mapaNavegacion") private mapaNavegacion?: ElementRef<HTMLElement>;
  @ViewChild("mapaNivelUno") private mapaNivelUno?: ElementRef<HTMLIFrameElement>;
  @ViewChild("mapaNivelTres") private mapaNivelTres?: ElementRef<HTMLIFrameElement>;
  @ViewChild("mapaNivelCuatro") private mapaNivelCuatro?: ElementRef<HTMLIFrameElement>;
  @ViewChild("mapaNivelCinco") private mapaNivelCinco?: ElementRef<HTMLIFrameElement>;
  @ViewChild("mapaNivelSeis") private mapaNivelSeis?: ElementRef<HTMLIFrameElement>;
  @ViewChild("selectorUbicacion") private selectorUbicacion?: ElementRef<HTMLSelectElement>;
  private enfocarUbicacionPendiente = false;
  private firmaCursorMapa = "";
  private firmaWifiMapa = "";
  private readonly navegacionWifi = inject(NavegacionWifiService);
  readonly admin = inject(AdminService);
  estadoWifi: EstadoNavegacionWifi | null = null;
  private claveMovimientoMapa = "";
  private secuenciaMovimientoMapa = 0;
  private movimientoMapaId = "";
  private guiaMapa: { context: string; key: string; text: string; speech: string } | null = null;
  private ultimaGuiaMapaAnunciada: string | null = null;

  private get contextoGuiaMapa(): string {
    const fisico = this.seguimientoFisicoSeleccionado ? this.seguimientoFisico : null;
    return JSON.stringify([this.nivelVisualizado, this.rutaCalculada.map(n => [n.id,n.nivel]),
      this.nodoActualId, this.pasoActualIndice, this.idiomaSeleccionado, this.modoAccesible,
      fisico ? [fisico.origenTramoId,fisico.destinoTramoId,fisico.fase,fisico.direccion] : null]);
  }

  private get guiaMapaHabilitada(): boolean {
    if (![1,3,4,5,6].includes(this.nivelVisualizado)) return false;
    if (this.seguimientoFisicoSeleccionado) {
      const estado = this.seguimientoFisico;
      return estado?.fase === 'siguiendo' &&
        (!estado.direccion || estado.direccion === 'avanzando' || estado.direccion === 'sin-calibrar');
    }
    return !!this.pasoActual && this.pasoActual.tipo !== 'llegada' && this.pasoActual.tipo !== 'cambio-nivel';
  }

  private get guiaMapaActual(): typeof this.guiaMapa {
    return this.guiaMapaHabilitada && this.guiaMapa?.context === this.contextoGuiaMapa ? this.guiaMapa : null;
  }

  estadoAutomatico: EstadoNavegacionAutomatica = {
    activa: false,
    posicion: null,
    estado: 'inactiva'
  };

  private corrigiendoAutomatico = false;
  readonly tramosLevantados = TRAMOS_LEVANTADOS;
  readonly inventarioWifi = PUNTOS_WIFI_PRELIMINARES;
  readonly origenLevantamientoWifi = ORIGEN_LEVANTAMIENTO_WIFI;
  readonly capturasWifiPorAsociar = CAPTURAS_WIFI_POR_ASOCIAR;
  readonly inventarioGeneralNivelTres = INVENTARIO_WIFI_NIVEL_TRES;
  ubicacionAbierta = false;
  puntoUbicacionSeleccionado = '';

  get huellasWifi() { return this.posicionamientoApoyo.huellasRegistradas; }
  get puntosParaUbicacion(): Nodo[] {
    return this.lugares.filter(n=>!n.restringido && !CATALOGO_TOUR[n.id]?.esAcceso && n.id!=='ascensor-central-nivel-5');
  }
  get resumenWifiPorPunto() {
    return this.puntosParaUbicacion.map(n=>({nodo:n,
      huellas:this.huellasWifi.filter(h=>h.nodoIds.includes(n.id)),
      referenciasCompartidas:REFERENCIAS_WIFI_COMPARTIDAS.filter(r=>r.nodoIds.includes(n.id))}));
  }

estadoApoyo: EstadoPosicionamientoApoyo = {
    buscandoWifi: false,
    lecturas: [],
    candidatos: [],
    errorWifi: null
  };

  mensajeApoyo = '';
  private readonly suscripcionesSeguimiento = new Subscription();

  conexionesMapa: Conexion[] = [];
  lugares: Nodo[] = [];
  nodosMapa: Nodo[] = [];
  lugaresReferencia: LugarPlano[] = [];
  erroresMapa: ProblemaMapa[] = [];
  advertenciasMapa: ProblemaMapa[] = [];
  mapaEsValido = true;
  origen = "";
  destino = "";
  modoAccesible = false;
  idiomaSeleccionado: Idioma;
  mensajeUbicacion = "";
  resultado = "";
  distanciaTotal: number | null = null;
  rutaCalculada: Nodo[] = [];
  pasosRuta: PasoRuta[] = [];
  pasoActualIndice = 0;
  nivelVisualizado = 1;
  vistaResortCompleto = false;
  orientacionFisicaVisible = true;
  fotoLlegadaCerrada = false;
  menuAbierto = false;
  recorridoAutomaticoActivo = false;
  asistenteVozActivo = false;
  duracionVozPasoMs = 0;
  comandoVozActivo = false;
  estadoComandoVoz = "";
  campoSeleccionVozActivo: CampoSeleccionVoz | null = null;
  estadoSeleccionVoz = "";
  seguimientoFisico: EstadoSeguimientoRuta | null = null;
  estadoSensores: EstadoSensoresNavegacion = this.sensoresNavegacion.obtenerEstado();
  seguimientoFisicoSeleccionado = false;
  seguimientoIniciando = false;
  origenConfirmadoSeguimiento = false;

  longitudPasoMetros = METROS_POR_PASO;

  precisionGpsMetros: number | null = null;
  private instanteUltimoGps = 0;
  errorSeguimiento = "";

  private readonly indicacionesSeguimientoAnunciadas = new Set<string>();
  private distanciasSeguimiento: number[] = [];
  private operacionSeguimiento = 0;
  private paginaDestruida = false;
  movimientoEnCurso = false;
  private nodoAntesDelMovimiento: Nodo | null = null;
  private pasosVozAnunciados = new Set<number>();
  private temporizadorContinuacion: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.idiomaSeleccionado = this.idiomaService.idiomaActual;
    this.actualizarDatosMapa();

    this.suscripcionesSeguimiento.add(
      this.seguimientoRuta.estado$.subscribe(estado => {
        this.recibirEstadoSeguimiento(estado);
      })
    );

    this.suscripcionesSeguimiento.add(
      this.sensoresNavegacion.estado$.subscribe(estado => {
        this.estadoSensores = estado;

        if (estado.gps !== 'activo') {
          this.precisionGpsMetros = null;
        }

        this.changeDetectorRef.markForCheck();
      })
    );

    this.suscripcionesSeguimiento.add(
      this.sensoresNavegacion.posicionGps$.subscribe(posicion => {
        this.precisionGpsMetros = posicion.coords.accuracy;
        this.instanteUltimoGps = posicion.timestamp;
        this.changeDetectorRef.markForCheck();
      })
    );

    this.suscripcionesSeguimiento.add(
      this.posicionamientoApoyo.estado$.subscribe(estado => {
        this.estadoApoyo = estado;
        this.changeDetectorRef.markForCheck();
      })
    );

    this.suscripcionesSeguimiento.add(
      this.navegacionAutomatica.estado$.subscribe(estado => {
        this.estadoAutomatico = estado;
        this.changeDetectorRef.markForCheck();
      })
    );

    this.suscripcionesSeguimiento.add(
      this.navegacionAutomatica.correccion$.subscribe(correccion => {
        void this.aplicarCorreccionAutomatica(correccion);
      })
    );

    this.suscripcionesSeguimiento.add(
      this.navegacionWifi.estado$.subscribe(estado => {
        this.estadoWifi = estado;
        this.enviarPosicionWifi();
      })
    );

    this.suscripcionesSeguimiento.add(
      this.navegacionWifi.cambioNivel$.subscribe(nivel => {
        if (!this.estadoWifi?.activa || nivel === this.nivelVisualizado || ![1, 3, 4, 5, 6].includes(nivel)) return;
        this.mostrarNivelMapa(nivel as 1 | 3 | 4 | 5 | 6);
        this.mensajeApoyo = this.texto(
          `Wi-Fi: parece que estás en el ${nivel === 6 ? 'piso' : 'nivel'} ${nivel}.`,
          `Wi-Fi: you seem to be on ${nivel === 6 ? 'floor' : 'level'} ${nivel}.`,
          `Wi-Fi: parece que você está no ${nivel === 6 ? 'andar' : 'nível'} ${nivel}.`
        );
      })
    );

    document.addEventListener('ionBackButton', this.alBotonAtras);

    void this.cargarMapaInicial();
  }

  ngOnDestroy(): void {
    document.removeEventListener('ionBackButton', this.alBotonAtras);
    this.navegacionAutomatica.detener();
    this.paginaDestruida = true;
    ++this.operacionSeguimiento;
    this.suscripcionesSeguimiento.unsubscribe();
    void this.seguimientoRuta.detener();
    this.detenerRecorridoAutomatico();
    this.asistenteVoz.detener();
  }

  ngAfterViewChecked(): void {
    this.actualizarCursorMapa();
    if (this.enfocarUbicacionPendiente && !this.paginaDestruida) {
      this.enfocarUbicacionPendiente = false;
      const selector = this.selectorUbicacion?.nativeElement;
      selector?.scrollIntoView?.({ block: 'center' });
      selector?.focus({ preventScroll: true });
    }
  }

  actualizarCursorMapa(forzar = false): void {
    const nivel = this.nivelVisualizado;
    const mapa = this.marcoMapa(nivel);
    const ventana = mapa?.nativeElement.contentWindow;
    if (!ventana) return;

    const nodoId = this.nodoActualId;
    const nodoActual = this.nodosMapa.find(nodo => nodo.id === nodoId);
    const visible = nodoActual?.nivel === nivel || (
      nivel === 4 && nodoId?.startsWith("acceso-escalera-") === true
    );
    if ([1,3,4,5,6].includes(nivel)) {
      const ruta = this.rutaCalculada.map(nodo => ({ id: nodo.id, level: nodo.nivel }));
      const claveMovimiento = JSON.stringify([nivel, ruta, nodoId, this.pasoActualIndice, this.modoAccesible]);
      if (claveMovimiento !== this.claveMovimientoMapa) {
        this.claveMovimientoMapa = claveMovimiento;
        this.movimientoMapaId = String(++this.secuenciaMovimientoMapa);
      }
      const estado = {
        type: "navinside-map-state", level: nivel, motionId: this.movimientoMapaId,
        route: ruta, currentId: nodoId, originId: this.origen, destinationId: this.destino,
        legs: this.rutaCalculada.slice(1).map((nodo,indice) => {
          const desde = this.rutaCalculada[indice];
          const metros = this.rutaService.calcularDistanciaTotal([desde,nodo]);
          const tramo = this.metraje.tramo(desde.id,nodo.id);
          return {fromId:desde.id,toId:nodo.id,meters:Number.isFinite(metros)?metros:null,
            ...(tramo.aproximado ? {approxMeters:tramo.metros} : {})};
        }),
        metraje: this.conexionesMapa.flatMap(c => {
          const a = this.lugares.find(n => n.id === c.origen), b = this.lugares.find(n => n.id === c.destino);
          if (!a || !b || a.nivel !== nivel || b.nivel !== nivel || c.tipo === 'ascensor') return [];
          const tramo = this.metraje.tramo(c.origen, c.destino);
          return tramo.metros === null ? [] : [{fromId:c.origen,toId:c.destino,meters:tramo.metros,approx:tramo.aproximado}];
        }),
        labels: Object.fromEntries(this.nodosMapa.map(nodo => [nodo.id, this.nombreNodo(nodo)])),
        places: this.lugares.map(nodo => ({id:nodo.id,level:nodo.nivel})),
        photos: Object.fromEntries(this.lugares.flatMap(nodo => {
          const foto=this.fotoPuntoInteres(nodo.id);
          return foto ? [[nodo.id,{src:new URL(foto.src,document.baseURI).href,alt:foto.alt,galeria:foto.galeria?.map(imagen=>({src:new URL(imagen.src,document.baseURI).href,alt:imagen.alt}))}]] : [];
        })),
        language: this.idiomaSeleccionado, accessible: this.modoAccesible, visible, waze: this.vistaMapa,
        instruction: this.instruccionBase, voiceDurationMs: this.duracionVozPasoMs,
        voiceActive: this.asistenteVozActivo, guidanceContext: this.contextoGuiaMapa,
        guidanceEnabled: this.guiaMapaHabilitada,
        physical: this.seguimientoFisicoSeleccionado && this.seguimientoFisico ? {
          originId: this.seguimientoFisico.origenTramoId,
          destinationId: this.seguimientoFisico.destinoTramoId,
          fraction: this.seguimientoFisico.fraccionTramo,
          direction: this.seguimientoFisico.direccion
        } : null,
        orientation: nivel === 1 && this.orientacionFisicaVisible ? [
          this.texto('Referencia al salir de los ascensores: mirando hacia Hall Central.',
            'Reference when leaving the lifts: facing Hall Central.',
            'Referência ao sair dos elevadores: olhando para Hall Central.')
        ] : []
      };
      const firma = JSON.stringify(estado);
      if (!forzar && firma === this.firmaCursorMapa) return;
      this.firmaCursorMapa = firma;
      ventana.postMessage(estado, window.location.origin);
      return;
    }
    const firma = `${nivel}:${visible}:${nodoId ?? ""}`;
    if (!forzar && firma === this.firmaCursorMapa) return;

    this.firmaCursorMapa = firma;
    ventana.postMessage({
      type: "navinside-cursor",
      level: nivel,
      nodeId: nodoId,
      visible
    }, window.location.origin);
  }

  private enviarPosicionWifi(forzar = false): void {
    const nivel = this.nivelVisualizado;
    const ventana = this.marcoMapa(nivel)?.nativeElement.contentWindow;
    if (!ventana) return;

    const e = this.estadoWifi?.activa ? this.estadoWifi.estimacion : null;
    const mensaje = e && e.nivel === nivel
      ? {
          type: 'navinside-wifi-position',
          level: nivel,
          visible: true,
          firm: this.estadoWifi!.firme,
          fromId: e.origenId,
          toId: e.destinoId,
          fraction: Math.round(e.fraccion * 1000) / 1000,
          uncertaintyMeters: Math.round(e.incertidumbreMetros * 10) / 10,
          lengthMeters: e.largo,
          speed: Math.round(e.velocidad * 10) / 10
        }
      : { type: 'navinside-wifi-position', level: nivel, visible: false };

    const firma = JSON.stringify(mensaje);
    if (!forzar && firma === this.firmaWifiMapa) return;
    this.firmaWifiMapa = firma;
    ventana.postMessage(mensaje, window.location.origin);
  }

  private marcoMapa(nivel: number): ElementRef<HTMLIFrameElement> | undefined {
    return nivel === 1 ? this.mapaNivelUno : nivel === 3 ? this.mapaNivelTres
      : nivel === 4 ? this.mapaNivelCuatro : nivel === 5 ? this.mapaNivelCinco : nivel === 6 ? this.mapaNivelSeis : undefined;
  }

  @HostListener('window:message', ['$event'])
  recibirEventoMapa(evento: MessageEvent): void {
    if (this.paginaDestruida || evento.origin !== window.location.origin) return;
    const datos = evento.data;
    if (!datos || ![1,3,4,5,6].includes(datos.level) || datos.level !== this.nivelVisualizado) return;
    if (evento.source !== this.marcoMapa(datos.level)?.nativeElement.contentWindow) return;
    if (datos.type === 'navinside-places') {
      if (Array.isArray(datos.places)) {
        const lista: PuntoPlanoLista[] = datos.places.slice(0, 120).flatMap((p: Partial<PuntoPlanoLista>) =>
          typeof p?.node === 'string' && typeof p.name === 'string'
            ? [{
                node: p.node,
                canonical: typeof p.canonical === 'string' ? p.canonical : null,
                name: p.name.slice(0, 120),
                photo: typeof p.photo === 'string' && /^(https?:|data:image\/)/.test(p.photo) ? p.photo : null,
                icon: typeof p.icon === 'string' ? p.icon.slice(0, 8) : '📍'
              }]
            : []);
        this.puntosPlano.set(datos.level, lista);
        this.changeDetectorRef.markForCheck();
      }
      return;
    }
    if (datos.type === 'navinside-map-geometry') {
      if (Number.isFinite(datos.scaleM) && datos.scaleM > 0 && datos.nodes && typeof datos.nodes === 'object' &&
          datos.lengths && typeof datos.lengths === 'object') {
        const nodos = Object.fromEntries(Object.entries(datos.nodes as Record<string, { x: number; y: number }>)
          .filter(([, p]) => Number.isFinite(p?.x) && Number.isFinite(p?.y)).map(([id, p]) => [id, { x: p.x, y: p.y }]));
        const largos = Object.fromEntries(Object.entries(datos.lengths as Record<string, number>)
          .filter(([, m]) => Number.isFinite(m) && m > 0 && m < 1000));
        this.navegacionWifi.registrarGeometria(datos.level, { escalaM: datos.scaleM, nodos, largos });
      }
      return;
    }
    if (datos.type === 'navinside-map-ready') {
      this.actualizarCursorMapa(true);
      this.enviarPosicionWifi(true);
    } else if (datos.type === 'navinside-select-destination') {
      const nodo = this.lugares.find(lugar => lugar.id === datos.nodeId && lugar.nivel === datos.level);
      if (nodo) this.seleccionarPuntoMapa(nodo.id);
    } else if (datos.motionId === this.movimientoMapaId) {
      if (datos.type === 'navinside-guidance' && datos.context === this.contextoGuiaMapa &&
          typeof datos.key === 'string' && datos.key.length <= 15000 &&
          typeof datos.text === 'string' && datos.text.length <= 4000 &&
          typeof datos.speech === 'string' && datos.speech.length <= 6000) {
        this.guiaMapa = datos.text ? {context:datos.context,key:datos.key,text:datos.text,speech:datos.speech} : null;
        if (this.guiaMapaActual) this.anunciarInstruccionSiActiva();
      } else if (datos.type === 'navinside-animation-start' && Number.isFinite(datos.durationMs) && datos.durationMs > 0 && datos.durationMs <= 30000) {
        this.sincronizarVozConMovimiento(datos.durationMs);
      } else if (datos.type === 'navinside-animation-end') {
        this.continuarRecorridoAutomatico();
      }
    }
    this.changeDetectorRef.markForCheck();
  }

  formatearMedidaLevantamiento(metros: number): string {
    return new Intl.NumberFormat(this.idiomaSeleccionado,{minimumFractionDigits:3,maximumFractionDigits:3}).format(metros);
  }

  etiquetaMedicion(estado: string): string {
    return estado==='medido' ? this.texto('Medido','Measured','Medido') : estado==='calculado'
      ? this.texto('Calculado por pasos/suma','Calculated from steps/sum','Calculado por passos/soma')
      : this.texto('Por verificar','To verify','Por verificar');
  }

  get reconocimientoVozDisponible(): boolean {
    return this.asistenteVoz.reconocimientoDisponible;
  }

  get fotoDestinoSeleccionado(): FotoDestino | null {
    return this.fotoPuntoInteres(this.destino);
  }

  private readonly fotosTourFallidas = new Set<string>();

  fotoPuntoInteres(nodoId: string): FotoDestino | null {
    return this.fotosTourFallidas.has(nodoId) ? null : FOTOS_DESTINOS[nodoId] ?? null;
  }

  marcarFotoTourFallida(nodoId: string): void {
    this.fotosTourFallidas.add(nodoId);
  }

  get destinoSeleccionado(): Nodo | null {
    return this.lugares.find(lugar => lugar.id === this.destino) ?? null;
  }

  get mensajeFotoDestino(): string {
    if (this.seguimientoFisicoSeleccionado &&
        this.seguimientoFisico?.fase !== 'completado') {
      return this.traducir("fotoDestinoSeleccionado");
    }

    return this.esUltimoPaso
      ? this.traducir("fotoDestinoLlegada")
      : this.traducir("fotoDestinoSeleccionado");
  }

  get origenId(): string | null {
    return this.origen || null;
  }

  get destinoId(): string | null {
    return this.destino || null;
  }

  get puntosInteresNivel(): Nodo[] {
    const lugares = new Map<string, Nodo>();
    for (const nodo of this.lugares) {
      const referencia = CATALOGO_TOUR[nodo.id];
      if (nodo.nivel !== this.nivelVisualizado || referencia?.esAcceso || nodo.id === "ascensor-central-nivel-5") {
        continue;
      }
      const idLugar = referencia?.lugarId ?? nodo.id;
      const anterior = lugares.get(idLugar);
      if (!anterior || (this.modoAccesible &&
          nodo.accesible === true && anterior.accesible !== true)) {
        lugares.set(idLugar, nodo);
      }
    }
    return Array.from(lugares.values()).sort(
      (primerLugar, segundoLugar) =>
        this.nombrePuntoInteres(primerLugar).localeCompare(this.nombrePuntoInteres(segundoLugar))
    );
  }

  nombrePuntoInteres(nodo: Nodo): string {
    return CATALOGO_TOUR[nodo.id]?.nombreLugar?.[this.idiomaSeleccionado] ??
      this.nombreNodo(nodo);
  }

  puntoInteresSeleccionado(nodo: Nodo): boolean {
    const idDestino = CATALOGO_TOUR[this.destino]?.lugarId ?? this.destino;
    const idLugar = CATALOGO_TOUR[nodo.id]?.lugarId ?? nodo.id;
    return idDestino === idLugar;
  }

  get pasoActual(): PasoRuta | null {
    return this.pasosRuta[this.pasoActualIndice] ?? null;
  }

  get instruccionActual(): string {
    return this.guiaMapaActual?.text ?? this.instruccionBase;
  }

  private get instruccionBase(): string {
    if (this.seguimientoFisicoSeleccionado) {
      return this.instruccionSeguimientoFisico;
    }

    const paso = this.pasoActual;

    if (!paso) {
      return "";
    }

    if (
      paso.tipo === "inicio" &&
      paso.nodo.id === "ascensor-habitaciones-piso-6" &&
      this.rutaCalculada.some(nodo => nodo.nivel === 6)
    ) {
      return this.traducir("piso6SiguePasillo");
    }

    return this.obtenerInstruccionVisual(paso);
  }

  get instruccionVozActual(): string {
    if (this.guiaMapaActual) return this.guiaMapaActual.speech;
    if (this.seguimientoFisicoSeleccionado) {
      return this.instruccionSeguimientoFisico;
    }

    const paso = this.pasoActual;

    if (!paso) {
      return "";
    }

    if (
      paso.tipo === "inicio" &&
      paso.nodo.id === "ascensor-habitaciones-piso-6" &&
      this.rutaCalculada.some(nodo => nodo.nivel === 6)
    ) {
      return this.traducir("piso6SiguePasillo");
    }

    if (paso.tipo === "inicio" || paso.tipo === "llegada") {
      return this.traducirPaso(paso);
    }

    if (paso.tipo === "cambio-nivel") {
      return `${this.traducir("ahora")}. ${this.traducirPaso(paso)}`;
    }

    const distanciaPaso = paso.desde
      ? this.rutaService.calcularDistanciaTotal([paso.desde, paso.nodo])
      : this.distanciaProximoTramo;

    if (!Number.isFinite(distanciaPaso)) {
      return this.obtenerInstruccionVisual(paso);
    }

    const metros = Math.max(1, Math.round(distanciaPaso));
    const direccion = this.obtenerDireccionFisica(paso);

    if (direccion) {
      return [
        `${this.traducir("ahora")}.`,
        this.obtenerInstruccionVisual(paso),
        this.traducir("avanzaAproximadamente", { metros })
      ].join(" ");
    }

    return this.traducir(
      this.pasoActualIndice <= 1
        ? "continuaAproximadamente"
        : "luegoContinuaAproximadamente",
      {
        metros,
        nombre: this.nombreNodo(paso.nodo)
      }
    );
  }

  get vozDisponible(): boolean {
    return this.asistenteVoz.disponible;
  }

  get estadoAsistenteVoz(): string {
    if (!this.vozDisponible) {
      return this.traducir("asistenteVozNoDisponible");
    }

    return this.traducir(
      this.asistenteVozActivo ? "asistenteVozActivo" : "asistenteVozListo"
    );
  }

  get nodoActualId(): string | null {
    if (this.seguimientoFisicoSeleccionado) {
      return this.seguimientoFisico?.origenTramoId ??
        this.rutaCalculada[0]?.id ?? null;
    }

    return this.pasoActual?.nodo.id ?? null;
  }

  get nodoVistaRuta(): Nodo | null {
    if (this.rutaCalculada.length < 2) {
      return null;
    }

    if (this.movimientoEnCurso && this.nodoAntesDelMovimiento) {
      return this.nodoAntesDelMovimiento;
    }

    return this.rutaCalculada.find(nodo => nodo.id === this.nodoActualId) ?? null;
  }

  get nodoFotoRuta(): Nodo | null {
    const actual = this.nodoVistaRuta;
    if (!actual) return null;
    if (!esPasoAccesibleNivel3(actual.id)) return actual;
    const referencias: Record<string, string> = {
      'tramo-accesible-nivel-3-fa': 'restaurant-faro-nivel-3',
      'tramo-accesible-nivel-3-pri': 'piscina-acceso-accesible-nivel-3',
      'tramo-accesible-nivel-3-eat': 'piscina-temperada-nivel-3'
    };
    const indice = this.rutaCalculada.findIndex(n => n.id === actual.id);
    for (let i = indice; i >= 0; i--) {
      const paso = this.rutaCalculada[i];
      if (paso.nivel !== actual.nivel) break;
      const id = referencias[paso.id] ?? paso.id;
      if (FOTOS_DESTINOS[id]) return this.nodosMapa.find(n => n.id === id) ?? paso;
    }
    return actual;
  }

  get numeroPasoActual(): number {
    if (this.seguimientoFisicoSeleccionado) {
      return this.rutaCalculada.length
        ? Math.min(
            (this.seguimientoFisico?.indiceNodo ?? 0) + 1,
            this.rutaCalculada.length
          )
        : 0;
    }

    if (this.pasosRuta.length === 0) {
      return 0;
    }

    return this.pasoActualIndice + 1;
  }

  get totalPasos(): number {
    if (this.seguimientoFisicoSeleccionado) {
      return this.rutaCalculada.length;
    }

    return this.pasosRuta.length;
  }

  get progresoRuta(): number {
    if (this.seguimientoFisicoSeleccionado && this.seguimientoFisico) {
      const total = this.seguimientoFisico.metrosRecorridos +
        this.seguimientoFisico.metrosRestantes;

      return total > 0
        ? Math.round(
            Math.max(
              0,
              Math.min(1, this.seguimientoFisico.metrosRecorridos / total)
            ) * 100
          )
        : this.seguimientoFisico.fase === 'completado' ? 100 : 0;
    }

    if (this.totalPasos === 0) {
      return 0;
    }

    return Math.round((this.numeroPasoActual / this.totalPasos) * 100);
  }

  get distanciaRestante(): number {
    if (this.seguimientoFisicoSeleccionado) {
      return this.seguimientoFisico?.metrosRestantes ??
        this.distanciaTotal ?? 0;
    }

    if (this.rutaCalculada.length < 2 || this.esUltimoPaso) {
      return 0;
    }

    return this.rutaService.calcularDistanciaTotal(
      this.rutaCalculada.slice(this.pasoActualIndice)
    );
  }

  get distanciaProximoTramo(): number {
    if (this.seguimientoFisicoSeleccionado && this.seguimientoFisico) {
      return Math.max(
        0,
        (this.distanciasSeguimiento[this.seguimientoFisico.indiceNodo] ?? 0) *
          (1 - this.seguimientoFisico.fraccionTramo)
      );
    }

    const tramoSiguiente = this.rutaCalculada.slice(
      this.pasoActualIndice,
      this.pasoActualIndice + 2
    );

    if (tramoSiguiente.length < 2) {
      return 0;
    }

    return this.rutaService.calcularDistanciaTotal(tramoSiguiente);
  }

  get esPrimerPaso(): boolean {
    return this.pasoActualIndice === 0;
  }

  get esUltimoPaso(): boolean {
    if (this.seguimientoFisicoSeleccionado) {
      return this.seguimientoFisico?.fase === 'llegada-estimada' ||
        this.seguimientoFisico?.fase === 'completado';
    }

    return this.totalPasos > 0 &&
      this.pasoActualIndice === this.totalPasos - 1;
  }

  get instruccionesRuta(): string[] {
    return this.pasosRuta.map(paso => this.traducirPaso(paso));
  }

  get puedeIniciarSeguimientoFisico(): boolean {
    return this.mapaEsValido &&
      this.rutaCalculada.length > 1 &&
      this.rutaConDistanciaMedida &&
      this.origenConfirmadoSeguimiento &&
      !this.seguimientoIniciando &&
      !this.seguimientoFisicoSeleccionado &&
      Number.isFinite(this.longitudPasoMetros) &&
      this.longitudPasoMetros >= 0.1 &&
      this.longitudPasoMetros <= 2;
  }

  get rutaConDistanciaMedida(): boolean {
    return this.distanciaTotal !== null && Number.isFinite(this.distanciaTotal);
  }

  get nombreOrigenSeguimiento(): string {
    const nodo = this.rutaCalculada[0];
    return nodo ? this.nombreNodo(nodo) : '';
  }

  get nombreNodoConfirmacion(): string {
    const id = this.seguimientoFisico?.fase === 'llegada-estimada'
      ? this.destino
      : this.seguimientoFisico?.destinoTramoId;

    const nodo = this.rutaCalculada.find(item => item.id === id);
    return nodo ? this.nombreNodo(nodo) : '';
  }

  get textoLlegadaEstimada(): string {
    return this.texto(
      'Llegada estimada a',
      'Estimated arrival at',
      'Chegada estimada a'
    );
  }

  get textoConfirmarNivel(): string {
    return this.texto(
      'Confirma tu ubicación en',
      'Confirm your location at',
      'Confirme sua localização em'
    );
  }

  get textoEstadoGps(): string {
    if (this.estadoSensores.gps === 'activo') {
      if (Date.now() - this.instanteUltimoGps > 15000) {
        return this.texto(
          'GPS: esperando una lectura reciente',
          'GPS: waiting for a recent reading',
          'GPS: aguardando uma leitura recente'
        );
      }

      return this.precisionGpsMetros === null
        ? 'GPS'
        : `GPS ±${Math.round(this.precisionGpsMetros)} m`;
    }

    return `GPS: ${this.etiquetaEstadoSensor(this.estadoSensores.gps)}`;
  }

  etiquetaEstadoSensor(estado: EstadoSensorNavegacion): string {
    switch (estado) {
      case 'activo':
        return this.texto(
          'recibiendo datos',
          'receiving data',
          'recebendo dados'
        );

      case 'esperando':
        return this.texto(
          'esperando datos',
          'waiting for data',
          'aguardando dados'
        );

      case 'sin-permiso':
        return this.texto(
          'sin permiso',
          'permission needed',
          'sem permissão'
        );

      case 'error':
        return this.texto(
          'no disponible',
          'unavailable',
          'indisponível'
        );

      default:
        return this.texto(
          'inactivo',
          'inactive',
          'inativo'
        );
    }
  }

  get instruccionSeguimientoFisico(): string {
    const estado = this.seguimientoFisico;

    if (!estado || estado.fase === 'inactivo') {
      return this.texto(
        'Preparando seguimiento.',
        'Preparing tracking.',
        'Preparando acompanhamento.'
      );
    }

    if (estado.fase === 'pausado') {
      return this.texto(
        'Recorrido pausado.',
        'Navigation paused.',
        'Percurso pausado.'
      );
    }

    if (estado.fase === 'siguiendo' &&
        ['desviado', 'sin-rumbo', 'limite-nivel'].includes(estado.direccion ?? '')) {
      return this.textoOrientacionSeguimiento;
    }

    if (estado.fase === 'siguiendo' && estado.direccion === 'retrocediendo') {
      const regreso = this.rutaCalculada[estado.indiceNodo];

      return `${this.texto('Regresas hacia', 'You are returning towards', 'Você retorna para')} ${
        regreso ? this.nombreNodo(regreso) : ''
      }.`;
    }

    const siguiente = this.pasosRuta[estado.indiceNodo + 1];

    if (estado.fase === 'confirmar-nivel') {
      const indicacion = siguiente ? this.traducirPaso(siguiente) : '';

      return `${indicacion} ${this.texto(
        'Confirma tu ubicación al terminar el cambio de piso.',
        'Confirm your location after changing floors.',
        'Confirme sua localização após mudar de andar.'
      )}`.trim();
    }

    const destino = this.rutaCalculada[this.rutaCalculada.length - 1];

    if (estado.fase === 'llegada-estimada') {
      return `${this.textoLlegadaEstimada} ${
        destino ? this.nombreNodo(destino) : ''
      }. ${this.texto(
        'Confirma que llegaste.',
        'Confirm that you have arrived.',
        'Confirme que chegou.'
      )}`;
    }

    if (estado.fase === 'completado') {
      return destino
        ? this.traducir('llegadaRuta', { nombre: this.nombreNodo(destino) })
        : '';
    }

    if (!siguiente) {
      return '';
    }

    const giro = this.obtenerGiroSeguimiento();

    if (giro) {
      return `${giro.texto} ${this.traducir(
        'continuarHacia',
        { nombre: this.nombreNodo(siguiente.nodo) }
      )}`;
    }

    const instruccion = estado.fraccionTramo < 0.1
      ? this.obtenerInstruccionVisual(siguiente)
      : this.traducir(
          'continuarHacia',
          { nombre: this.nombreNodo(siguiente.nodo) }
        );

    return `${instruccion} ${this.traducir(
      'avanzaAproximadamente',
      { metros: Math.max(1, Math.round(this.distanciaProximoTramo)) }
    )}`;
  }

  alternarNavegacionAutomatica(): void {
    if (this.estadoAutomatico.activa) {
      this.navegacionAutomatica.detener();
      return;
    }

    this.configurarNavegacionAutomatica();

    if (!this.navegacionAutomatica.iniciar()) {
      this.mensajeApoyo = this.texto(
        'Inicia o reanuda el seguimiento al caminar primero.',
        'Start or resume walking tracking first.',
        'Inicie ou retome o acompanhamento ao caminhar primeiro.'
      );
    }
  }

  guardarHuellaWifiOrigen(): void {
    const guardada =
      this.posicionamientoApoyo.guardarHuellaWifi(this.origen);

    this.mensajeApoyo = guardada
      ? this.texto(
          'Huella Wi-Fi local guardada para el punto confirmado.',
          'Local Wi-Fi fingerprint saved for the confirmed point.',
          'Impressão Wi-Fi local salva para o ponto confirmado.'
        )
      : this.texto(
          'No se guardó: pulsa Aquí estoy para actualizar las redes y guarda en los siguientes 10 segundos; se necesitan al menos tres señales de 2,4 GHz con intensidad de -85 dBm o mejor.',
          'Not saved: scan again and save within 10 seconds; at least three 2.4 GHz signals of -85 dBm or stronger are required.',
          'Não foi salva: busque redes novamente e salve em até 10 segundos; são necessários pelo menos três sinais de 2,4 GHz de -85 dBm ou mais fortes.'
        );
  }

  get textoAutomatico(): string {
    switch (this.estadoAutomatico.estado) {
      case 'sin-calibracion-gps':
        return this.texto(
          'GPS sobre el plano: faltan tres referencias precisas, separadas y no alineadas en este nivel. Wi-Fi sigue disponible.',
          'GPS on the map: three accurate, separated, non-collinear references are required on this floor. Wi-Fi remains available.',
          'GPS no mapa: faltam três referências precisas, separadas e não alinhadas neste andar. Wi-Fi continua disponível.'
        );

      case 'gps-impreciso':
        return this.texto(
          'GPS sin precisión o cobertura calibrada suficiente: se mantiene la estimación por pasos.',
          'GPS lacks sufficient accuracy or calibrated coverage: step estimation is retained.',
          'GPS sem precisão ou cobertura calibrada suficiente: a estimativa por passos é mantida.'
        );

      case 'gps':
        return this.texto(
          'GPS proyectado en la zona calibrada; se comprueban lecturas consecutivas antes de corregir.',
          'GPS projected within the calibrated area; consecutive readings are checked before correcting.',
          'GPS projetado na área calibrada; leituras consecutivas são verificadas antes da correção.'
        );

      case 'wifi':
        return this.texto(
          'Ubicación identificada por coincidencias Wi-Fi repetidas.',
          'Location identified by repeated Wi-Fi matches.',
          'Localização identificada por correspondências Wi-Fi repetidas.'
        );

      case 'desvio':
        return this.texto(
          'Salida de la ruta detectada por GPS. Se detiene la estimación; se recalcula al identificar un nodo cercano sin ambigüedad. También puedes corregir con QR.',
          'GPS detected departure from the route. Estimation is stopped; recalculation requires an unambiguous nearby node. You can also correct with QR.',
          'GPS detectou saída da rota. A estimativa foi interrompida; o recálculo exige um nó próximo sem ambiguidade. Você também pode corrigir com QR.'
        );

      default:
        return this.texto(
          'Esperando referencias fiables para corregir la ubicación automáticamente.',
          'Waiting for reliable references to correct location automatically.',
          'Aguardando referências confiáveis para corrigir a localização automaticamente.'
        );
    }
  }

  private configurarNavegacionAutomatica(): void {
    const actual =
      this.rutaCalculada[this.seguimientoFisico?.indiceNodo ?? 0];

    this.navegacionAutomatica.configurar(
      this.rutaCalculada,
      this.lugares,
      this.conexionesMapa,
      actual?.nivel ?? this.nivelVisualizado
    );
  }

  private async aplicarCorreccionAutomatica(
    correccion: CorreccionAutomatica
  ): Promise<void> {
    if (
      this.paginaDestruida ||
      this.corrigiendoAutomatico ||
      !this.estadoAutomatico.activa ||
      !this.seguimientoFisicoSeleccionado ||
      this.seguimientoFisico?.fase !== 'siguiendo'
    ) {
      return;
    }

    if (correccion.tipo === 'desvio') {
      this.seguimientoRuta.bloquearPorDesvio();
      return;
    }

    if (correccion.tipo === 'tramo') {
      this.seguimientoRuta.corregirTramo(
        correccion.indice,
        correccion.fraccion
      );
      return;
    }

    const nodo =
      this.mapaService.obtenerNodoPorId(correccion.nodoId);

    const actual =
      this.rutaCalculada[this.seguimientoFisico.indiceNodo];

    if (
      !nodo ||
      nodo.restringido ||
      nodo.nivel !== actual?.nivel ||
      (this.modoAccesible && nodo.accesible === false)
    ) {
      return;
    }

    if (this.seguimientoRuta.confirmarNodo(nodo.id)) {
      this.mensajeApoyo =
        `${correccion.fuente.toUpperCase()} · ${this.texto(
          'Ubicación corregida:',
          'Location corrected:',
          'Localização corrigida:'
        )} ${this.nombreNodo(nodo)}.`;

      return;
    }

    const nuevaRuta = this.rutaService.calcularRuta(
      nodo.id,
      this.destino,
      this.modoAccesible
    );

    if (nuevaRuta.length < 2) {
      this.seguimientoRuta.bloquearPorDesvio();

      this.mensajeApoyo = this.traducir(
        this.modoAccesible
          ? 'rutaAccesibleNoDisponible'
          : 'rutaNoDisponible'
      );

      return;
    }

    this.corrigiendoAutomatico = true;

    try {
      this.origen = nodo.id;
      this.establecerRutaCalculada(nuevaRuta);
      this.origenConfirmadoSeguimiento = true;

      await this.iniciarSeguimientoFisico();

      if (
        !this.paginaDestruida &&
        this.seguimientoFisicoSeleccionado &&
        this.seguimientoFisico?.fase === 'siguiendo'
      ) {
        this.configurarNavegacionAutomatica();
        this.navegacionAutomatica.iniciar();

        this.mensajeApoyo = this.traducir(
          'rutaRecalculada',
          { nombre: this.nombreNodo(nodo) }
        );
      }
    } finally {
      this.corrigiendoAutomatico = false;
    }
  }

  get wifiDisponible(): boolean {
    return this.posicionamientoApoyo.wifiDisponible;
  }

  get poiSugeridoGps(): Nodo | null {
    const id =
      this.posicionamientoApoyo.sugerirPoiGps(this.nivelVisualizado);

    return id
      ? this.mapaService.obtenerNodoPorId(id) ?? null
      : null;
  }

  aquiEstoy(): void {
    this.menuAbierto = false;
    this.ubicacionAbierta = true;
    this.enfocarUbicacionPendiente = true;
    this.puntoUbicacionSeleccionado = this.origen;
    if (this.wifiDisponible) {
      if (!this.estadoApoyo.buscandoWifi) this.buscarReferenciasWifi();
    }
    else this.mensajeApoyo = this.texto('Selecciona el punto donde estás y confirma tu ubicación, o escanea su QR.',
      'Select and confirm your current point, or scan its QR code.',
      'Selecione e confirme o ponto onde está ou leia o QR.');
  }

  confirmarUbicacionManual(): void {
    this.confirmarPoiApoyo(this.puntoUbicacionSeleccionado,'manual');
  }

  async guardarSenalesDelPunto(): Promise<void> {
    if (!this.origenConfirmadoSeguimiento || !this.origen || !this.wifiDisponible || this.seguimientoIniciando) return;
    const origenConfirmado=this.origen;
    let registrada=this.posicionamientoApoyo.registrarLevantamientoWifi(origenConfirmado);
    if (!registrada) await this.posicionamientoApoyo.buscarWifi();
    if(this.paginaDestruida||origenConfirmado!==this.origen||!this.origenConfirmadoSeguimiento)return;
    if(!registrada)registrada=this.posicionamientoApoyo.registrarLevantamientoWifi(origenConfirmado);
    if(registrada)this.posicionamientoApoyo.guardarHuellaWifi(origenConfirmado);
    this.mensajeApoyo=registrada
      ? this.texto(`Se guardaron ${this.estadoApoyo.lecturas.length} señales para ${this.nombrePuntoApoyo(origenConfirmado)}.`,
        `Saved ${this.estadoApoyo.lecturas.length} signals for ${this.nombrePuntoApoyo(origenConfirmado)}.`,
        `Foram salvos ${this.estadoApoyo.lecturas.length} sinais para ${this.nombrePuntoApoyo(origenConfirmado)}.`)
      : this.texto('No se pudo guardar una lectura nueva. Vuelve a intentarlo estando en el punto confirmado.',
        'Could not save a fresh scan. Try again at the confirmed point.',
        'Não foi possível salvar uma leitura nova. Tente novamente no ponto confirmado.');
    this.changeDetectorRef.markForCheck();
  }

  volverAtras(): void {
    if(this.seguimientoIniciando||this.movimientoEnCurso)return;
    if(this.menuAbierto){this.menuAbierto=false;return;}
    if(this.esUltimoPaso&&!this.fotoLlegadaCerrada&&this.fotoDestinoSeleccionado){this.cerrarFotoLlegada();return;}
    if(!this.vistaMapa){this.volverVistaMapa();return;}
    if(this.pasosRuta.length){
      this.detenerRecorridoAutomatico();
      if(!this.seguimientoFisicoSeleccionado&&!this.esPrimerPaso){this.retrocederPaso();return;}
      this.limpiarRuta();document.getElementById('navegacion')?.scrollIntoView?.({block:'start'});return;
    }
    if(this.nivelVisualizado!==1||this.vistaResortCompleto){this.mostrarNivelMapa(1);return;}
    document.getElementById('inicio')?.scrollIntoView?.({block:'start'});
  }

  buscarReferenciasWifi(): void {
    this.mensajeApoyo = '';
    void this.posicionamientoApoyo.buscarWifi();
  }

  guardarReferenciaGpsOrigen(): void {
    const guardada =
      this.posicionamientoApoyo.guardarReferenciaGps(this.origen);

    this.mensajeApoyo = guardada ? this.texto(
      'Referencia GPS guardada en este teléfono para el origen confirmado por ti.',
      'GPS reference saved on this phone for the origin you confirmed.',
      'Referência GPS salva neste telefone para a origem confirmada por você.'
    ) : this.texto(
      'No se guardó: inicia los sensores y espera una lectura GPS reciente con precisión de 5 m o mejor. Selecciona un origen válido.',
      'Not saved: start the sensors and wait for a recent GPS reading accurate to 5 m or better. Select a valid origin.',
      'Não foi salva: inicie os sensores e aguarde uma leitura GPS recente com precisão de 5 m ou melhor. Selecione uma origem válida.'
    );
  }

  nombrePuntoApoyo(nodoId: string): string {
    const nodo = this.mapaService.obtenerNodoPorId(nodoId);
    return nodo ? this.nombreNodo(nodo) : nodoId;
  }

  confirmarPoiApoyo(
    nodoId: string,
    fuente: 'wifi' | 'gps' | 'manual'
  ): void {
    if (this.seguimientoIniciando) {
      return;
    }

    if (
      (fuente === 'wifi' &&
        !this.posicionamientoApoyo.candidatoWifiVigente(nodoId)) ||
      (fuente === 'gps' && this.poiSugeridoGps?.id !== nodoId)
    ) {
      this.mensajeApoyo = this.texto(
        'La referencia ya no está vigente. Obtén una lectura nueva.',
        'The reference is no longer current. Obtain a new reading.',
        'A referência não está mais vigente. Obtenha uma nova leitura.'
      );
      return;
    }

    const nodo = this.mapaService.obtenerNodoPorId(nodoId);

    if (!nodo || nodo.restringido === true) {
      return;
    }

    this.navegacionWifi.confirmarPosicion(nodo.id);

    if (
      this.seguimientoFisicoSeleccionado &&
      this.seguimientoRuta.confirmarNodo(nodoId)
    ) {
      this.nivelVisualizado =
        nodo.nivel ?? this.nivelVisualizado;
    } else {
      this.origen = nodo.id;

      if (this.destino && this.destino !== nodo.id) {
        this.calcularRuta();
      } else {
        this.limpiarRuta();

        if (this.destino === nodo.id) {
          this.rutaCalculada = [nodo];
          this.pasosRuta = [
            {
              orden: 1,
              tipo: 'llegada',
              nodo
            }
          ];
          this.distanciaTotal = 0;
          this.actualizarResultadoRuta();
          this.sincronizarPasoActual();
        }
      }

      this.nivelVisualizado =
        nodo.nivel ?? this.nivelVisualizado;
    }

    this.origenConfirmadoSeguimiento = true;
    this.puntoUbicacionSeleccionado = nodo.id;
    this.mensajeApoyo =
      `${this.texto(
        'Ubicación confirmada por ti:',
        'Location confirmed by you:',
        'Localização confirmada por você:'
      )} ${this.nombreNodo(nodo)}.`;
  }

  calibrarOrientacionSeguimiento(): void {
    this.errorSeguimiento =
      this.seguimientoRuta.calibrarOrientacion()
        ? ''
        : this.texto(
            'No hay un rumbo reciente o un tramo compatible. Mantén el teléfono apuntando hacia el pasillo y vuelve a intentar.',
            'A recent heading or a compatible segment is unavailable. Point your phone along the corridor and try again.',
            'Não há uma direção recente ou um trecho compatível. Aponte o telefone para o corredor e tente novamente.'
          );
  }

  desactivarOrientacionSeguimiento(): void {
    this.seguimientoRuta.desactivarOrientacion();
    this.errorSeguimiento = '';
  }

  get textoOrientacionSeguimiento(): string {
    switch (this.seguimientoFisico?.direccion) {
      case 'avanzando':
        return this.texto(
          'Dirección: avance',
          'Direction: forward',
          'Direção: avanço'
        );

      case 'retrocediendo':
        return this.texto(
          'Dirección: regreso',
          'Direction: returning',
          'Direção: retorno'
        );

      case 'desviado':
        return this.texto(
          'Posible desvío: avance detenido. Verifica la ruta o corrige con QR.',
          'Possible deviation: progress stopped. Check the route or correct with QR.',
          'Possível desvio: avanço interrompido. Verifique a rota ou corrija com QR.'
        );

      case 'sin-rumbo':
        return this.texto(
          'Sin rumbo reciente: avance detenido.',
          'No recent heading: progress stopped.',
          'Sem direção recente: avanço interrompido.'
        );

      case 'limite-nivel':
        return this.texto(
          'Confirma con QR antes de regresar al otro piso.',
          'Confirm with QR before returning to another floor.',
          'Confirme com QR antes de retornar ao outro andar.'
        );

      default:
        return this.texto(
          'Orientación sin calibrar: los pasos solo suman avance.',
          'Heading is not calibrated: steps only move forward.',
          'Direção sem calibração: os passos apenas avançam.'
        );
    }
  }

  cambiarLongitudPaso(valor: string): void {
    if (
      this.seguimientoFisicoSeleccionado ||
      this.seguimientoIniciando
    ) {
      return;
    }

    this.longitudPasoMetros = Number(valor.replace(',', '.'));

    this.errorSeguimiento =
      Number.isFinite(this.longitudPasoMetros) &&
      this.longitudPasoMetros >= 0.1 &&
      this.longitudPasoMetros <= 2
        ? ''
        : this.texto(
            'La longitud del paso debe estar entre 0,10 y 2 metros.',
            'Step length must be between 0.10 and 2 metres.',
            'O comprimento do passo deve estar entre 0,10 e 2 metros.'
          );
  }

  async iniciarSeguimientoFisico(): Promise<void> {
    if (!this.puedeIniciarSeguimientoFisico) {
      return;
    }

    const operacion = ++this.operacionSeguimiento;
    this.seguimientoIniciando = true;
    this.errorSeguimiento = '';

    this.detenerRecorridoAutomatico();
    this.movimientoEnCurso = false;
    this.asistenteVoz.detener();
    this.campoSeleccionVozActivo = null;
    this.comandoVozActivo = false;
    this.seguimientoFisicoSeleccionado = true;
    this.indicacionesSeguimientoAnunciadas.clear();

    this.distanciasSeguimiento =
      this.rutaCalculada.slice(0, -1).map((origen, indice) => {
        const destino = this.rutaCalculada[indice + 1];

        return this.conexionesMapa.find(
          item =>
            (item.origen === origen.id && item.destino === destino.id) ||
            (item.origen === destino.id && item.destino === origen.id)
        )?.distancia ?? NaN;
      });

    if (this.vozDisponible) {
      this.asistenteVozActivo = true;
    }

    try {
      await this.seguimientoRuta.iniciar(
        this.rutaCalculada,
        this.conexionesMapa,
        this.longitudPasoMetros
      );
    } catch (error) {
      if (
        operacion === this.operacionSeguimiento &&
        !this.paginaDestruida
      ) {
        this.finalizarSeguimientoFisico();

        this.errorSeguimiento = this.texto(
          'No se pudo iniciar el seguimiento. Revisa la ruta y la longitud del paso.',
          'Tracking could not start. Check the route and step length.',
          'Não foi possível iniciar o acompanhamento. Verifique a rota e o comprimento do passo.'
        );

        console.error(
          'No se pudo iniciar el seguimiento:',
          error
        );
      }
    } finally {
      if (
        operacion === this.operacionSeguimiento &&
        !this.paginaDestruida
      ) {
        this.seguimientoIniciando = false;
        this.changeDetectorRef.markForCheck();
      }
    }
  }

  async pausarSeguimientoFisico(): Promise<void> {
    if (!this.seguimientoFisicoSeleccionado) {
      return;
    }

    await this.seguimientoRuta.pausar();
  }

  async reanudarSeguimientoFisico(): Promise<void> {
    if (!this.seguimientoFisicoSeleccionado ||
        this.seguimientoIniciando ||
        this.seguimientoFisico?.fase !== 'pausado' ||
        this.paginaDestruida) {
      return;
    }

    const operacion = ++this.operacionSeguimiento;
    this.seguimientoIniciando = true;
    this.indicacionesSeguimientoAnunciadas.clear();

    try {
      await this.seguimientoRuta.reanudar();
    } finally {
      if (
        operacion === this.operacionSeguimiento &&
        !this.paginaDestruida
      ) {
        this.seguimientoIniciando = false;
        this.changeDetectorRef.markForCheck();
      }
    }
  }

  finalizarSeguimientoFisico(): void {
    this.navegacionAutomatica.detener();
    ++this.operacionSeguimiento;

    const estabaSeleccionado =
      this.seguimientoFisicoSeleccionado;

    this.seguimientoFisicoSeleccionado = false;
    this.seguimientoIniciando = false;
    this.origenConfirmadoSeguimiento = false;
    this.seguimientoFisico = null;
    this.errorSeguimiento = '';
    this.indicacionesSeguimientoAnunciadas.clear();

    if (estabaSeleccionado) {
      void this.seguimientoRuta.detener();
      this.asistenteVoz.detener();
    }
  }

  confirmarUbicacionSeguimiento(): void {
    const estado = this.seguimientoFisico;

    if (!this.seguimientoFisicoSeleccionado || !estado) {
      return;
    }

    const id = estado.fase === 'llegada-estimada'
      ? this.destino
      : estado.fase === 'confirmar-nivel'
        ? estado.destinoTramoId
        : null;

    if (id && this.seguimientoRuta.confirmarNodo(id)) {
      this.mensajeUbicacion = this.texto(
        'Ubicación confirmada por ti.',
        'Location confirmed by you.',
        'Localização confirmada por você.'
      );
    }
  }

  private recibirEstadoSeguimiento(
    estado: EstadoSeguimientoRuta
  ): void {
    if (
      !this.seguimientoFisicoSeleccionado ||
      this.paginaDestruida
    ) {
      return;
    }

    this.seguimientoFisico = { ...estado };
    this.configurarNavegacionAutomatica();

    if (
      estado.fase === 'pausado' ||
      estado.fase === 'completado' ||
      estado.fase === 'inactivo'
    ) {
      this.navegacionAutomatica.detener();
    }

    if (estado.fase !== 'inactivo') {
      this.pasoActualIndice = estado.fase === 'completado'
        ? this.pasosRuta.length - 1
        : Math.max(
            0,
            Math.min(estado.indiceNodo, this.pasosRuta.length - 1)
          );

      const actual = this.rutaCalculada.find(
        nodo => nodo.id === estado.origenTramoId
      );

      if (actual?.nivel !== undefined) {
        this.nivelVisualizado = actual.nivel;
      }

      this.duracionVozPasoMs = 0;
      this.anunciarSeguimientoFisico();
    }

    this.changeDetectorRef.markForCheck();
  }

  private anunciarSeguimientoFisico(
    forzar = false
  ): void {
    const estado = this.seguimientoFisico;

    if (!estado ||
        estado.fase === 'inactivo' ||
        !this.vozDisponible ||
        (!this.asistenteVozActivo && !forzar)) {
      return;
    }

    if (this.guiaMapaActual) {
      this.anunciarGuiaMapa(forzar);
      return;
    }

    const giro = this.obtenerGiroSeguimiento();

    const clave =
      `${this.idiomaSeleccionado}:${estado.fase}:${estado.indiceNodo}:${estado.direccion ?? 'avance'}:${giro?.indice ?? 'tramo'}`;

    if (
      !forzar &&
      this.indicacionesSeguimientoAnunciadas.has(clave)
    ) {
      return;
    }

    if (this.asistenteVoz.hablar(
      this.instruccionSeguimientoFisico,
      this.idiomaSeleccionado,
      undefined,
      true
    )) {
      this.indicacionesSeguimientoAnunciadas.add(clave);
    }
  }

  private obtenerGiroSeguimiento(): {
    indice: number;
    texto: string;
  } | null {
    const estado = this.seguimientoFisico;

    if (!estado || estado.fase !== 'siguiendo') {
      return null;
    }

    const desde = this.rutaCalculada[estado.indiceNodo];
    const hasta = this.rutaCalculada[estado.indiceNodo + 1];

    if (!desde || !hasta ||
        desde.nivel !== hasta.nivel ||
        (desde.nivel !== 1 && desde.nivel !== 3)) {
      return null;
    }

    const posiciones = desde.nivel === 1
      ? POSICIONES_PLANO_NIVEL_UNO
      : { ...POSICIONES_PLANO_NIVEL_TRES, ...POSICIONES_RUTAS_ACCESIBLES_NIVEL_3 };

    const tramos = desde.nivel === 1
      ? TRAMOS_PLANO_NIVEL_UNO
      : TRAMOS_PLANO_NIVEL_TRES;

    if (!posiciones[desde.id] || !posiciones[hasta.id]) {
      return null;
    }

    const intermedios = tramos[`${desde.id}|${hasta.id}`] ??
      [...(tramos[`${hasta.id}|${desde.id}`] ?? [])].reverse();

    const puntos = [
      posiciones[desde.id],
      ...intermedios,
      posiciones[hasta.id]
    ].filter(
      (punto, indice, todos) =>
        indice === 0 ||
        Math.hypot(
          punto[0] - todos[indice - 1][0],
          punto[1] - todos[indice - 1][1]
        ) > 0.01
    );

    const longitudes = puntos.slice(1).map(
      (punto, indice) =>
        Math.hypot(
          punto[0] - puntos[indice][0],
          punto[1] - puntos[indice][1]
        )
    );

    const total = longitudes.reduce(
      (suma, longitud) => suma + longitud,
      0
    );

    const distancia =
      this.distanciasSeguimiento[estado.indiceNodo];

    if (
      total <= 0 ||
      !Number.isFinite(distancia) ||
      distancia <= 0
    ) {
      return null;
    }

    let acumulada = 0;

    for (let i = 1; i < puntos.length - 1; i++) {
      acumulada += longitudes[i - 1];

      const diferencia =
        acumulada / total - estado.fraccionTramo;

      if (
        diferencia < 0 ||
        diferencia > Math.min(0.35, 2 / distancia)
      ) {
        continue;
      }

      const entrada = Math.atan2(
        puntos[i][1] - puntos[i - 1][1],
        puntos[i][0] - puntos[i - 1][0]
      );

      const salida = Math.atan2(
        puntos[i + 1][1] - puntos[i][1],
        puntos[i + 1][0] - puntos[i][0]
      );

      const giro =
        ((salida - entrada) * 180 / Math.PI + 540) % 360 - 180;

      if (Math.abs(giro) < 30) {
        continue;
      }

      return {
        indice: i,
        texto: Math.abs(giro) > 150
          ? this.texto(
              'Próximo giro: media vuelta.',
              'Next turn: turn around.',
              'Próxima mudança: faça meia-volta.'
            )
          : giro > 0
            ? this.texto(
                'Próximo giro a la derecha.',
                'Next turn to the right.',
                'Próxima curva à direita.'
              )
            : this.texto(
                'Próximo giro a la izquierda.',
                'Next turn to the left.',
                'Próxima curva à esquerda.'
              )
      };
    }

    return null;
  }

  traducir(
    clave: string,
    parametros: Record<string, string | number> = {}
  ): string {
    return this.idiomaService.traducir(
      clave,
      parametros
    );
  }

  formatearMetros(distancia: number): string {
    return new Intl.NumberFormat(
      this.idiomaSeleccionado === "pt"
        ? "pt-BR"
        : this.idiomaSeleccionado === "en"
          ? "en-US"
          : "es-CL",
      {
        maximumFractionDigits: 1,
        minimumFractionDigits: 1
      }
    ).format(distancia);
  }

  textoDistanciaRuta(distancia: number | null, aproximacion: MetrajeTramo | null = null): string {
    if (distancia === null || !Number.isFinite(distancia)) {
      if (aproximacion?.metros !== null && aproximacion?.metros !== undefined && Number.isFinite(aproximacion.metros)) {
        return `≈ ${this.formatearMetros(aproximacion.metros)} ${this.traducir("unidades")} ${this.texto("(aprox.)", "(approx.)", "(aprox.)")}`;
      }
      return this.texto("Por medir", "To be measured", "A medir");
    }
    return `${aproximacion?.aproximado ? "≈ " : ""}${this.formatearMetros(distancia)} ${this.traducir("unidades")}`;
  }

vistaMapa = true;

  readonly puntosPlano = new Map<number, PuntoPlanoLista[]>();

  get puntosPlanoNivel(): PuntoPlanoLista[] {
    return this.puntosPlano.get(this.nivelVisualizado) ?? [];
  }

  fotoDesdePlano(nodoId: string): string | null {
    for (const lista of this.puntosPlano.values()) {
      const punto = lista.find(p => p.canonical === nodoId && p.photo);
      if (punto) return punto.photo;
    }
    return null;
  }

  abrirPuntoPlano(punto: PuntoPlanoLista): void {
    const ventana = this.marcoMapa(this.nivelVisualizado)?.nativeElement.contentWindow;
    ventana?.postMessage({ type: 'navinside-open-place', level: this.nivelVisualizado, node: punto.node }, window.location.origin);
  }

  imagenIcono(nodo: Nodo): string {
    return imagenIconoPunto(nodo, this.nombreNodo(nodo));
  }

  imagenIconoNombre(nombre: string): string {
    return imagenIconoPorNombre(nombre);
  }

  iconoPunto(nodo: Nodo): string {
    return iconoPuntoBase(nodo, this.nombreNodo(nodo));
  }

  abrirVistaClasica(seccion?: string): void {
    this.vistaMapa = false;
    this.changeDetectorRef.markForCheck();
    setTimeout(() => this.actualizarCursorMapa(true), 0);
    if (seccion) {
      setTimeout(() => document.getElementById(seccion)?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 80);
    }
  }

  private readonly alBotonAtras = (evento: Event): void => {
    const detalle = (evento as CustomEvent<{ register: (prioridad: number, accion: (siguiente: () => void) => void) => void }>).detail;
    detalle?.register?.(10, siguiente => {
      if (!this.vistaMapa) {
        this.volverVistaMapa();
      } else {
        siguiente();
      }
    });
  };

  volverVistaMapa(): void {
    this.vistaMapa = true;
    this.changeDetectorRef.markForCheck();
    setTimeout(() => this.actualizarCursorMapa(true), 0);
  }

  elegirPuntoRuta(campo: 'origen' | 'destino', nodoId: string): void {
    let nodo = this.mapaService.obtenerNodoPorId(nodoId);
    if (!nodo || nodo.restringido) return;
    if (campo === 'destino' && this.modoAccesible && nodo.id === 'piscina-acceso-escalones-nivel-3') {
      nodo = this.mapaService.obtenerNodoPorId('piscina-acceso-accesible-nivel-3') ?? nodo;
    }
    if (campo === 'origen') {
      this.origen = nodo.id;
      if (this.destino === nodo.id) this.destino = '';
    } else {
      this.destino = nodo.id;
      if (this.origen === nodo.id) this.origen = '';
    }
    this.cambiarSeleccionRuta();
    this.vistaResortCompleto = false;
    this.nivelVisualizado = (campo === 'origen' || !this.origen ? nodo.nivel : this.mapaService.obtenerNodoPorId(this.origen)?.nivel) ?? this.nivelVisualizado;
    if (this.origen && this.destino) {
      this.calcularRuta();
    }
    this.changeDetectorRef.markForCheck();
  }

  intercambiarOrigenDestino(): void {
    const origen = this.origen;
    this.origen = this.destino;
    this.destino = origen;
    this.cambiarSeleccionRuta();
    if (this.origen && this.destino) this.calcularRuta();
  }

  cancelarRuta(): void {
    if (this.recorridoAutomaticoActivo) this.detenerRecorridoAutomatico();
    this.limpiarRuta();
    this.destino = '';
    this.changeDetectorRef.markForCheck();
  }

  escucharVozBusqueda(alOir: (frase: string) => void, alTerminar: (error: string | null) => void): boolean {
    if (!this.reconocimientoVozDisponible) return false;
    this.asistenteVoz.detener();
    return this.asistenteVoz.escucharComando(
      this.idiomaSeleccionado,
      frase => { alOir(frase); this.changeDetectorRef.markForCheck(); },
      codigo => { alTerminar(String(codigo)); this.changeDetectorRef.markForCheck(); },
      () => { alTerminar(null); this.changeDetectorRef.markForCheck(); }
    );
  }

  detenerVozBusqueda(): void {
    this.asistenteVoz.detener();
  }

  lugarEnFrase(frase: string): Nodo | null {
    return this.buscarLugarEnFrase(frase) ?? null;
  }

  async seguirmeConWifi(): Promise<boolean> {
    if (!this.admin.activo) return false;
    return this.navegacionWifi.iniciar();
  }

  async salirModoAdmin(): Promise<void> {
    this.admin.desactivar();
    await this.navegacionWifi.detener();
    this.changeDetectorRef.markForCheck();
  }

  async detenerWifi(): Promise<void> {
    await this.navegacionWifi.detener();
  }

  private metrajeCache: { nodos: Nodo[]; conexiones: Conexion[]; metraje: Metraje } | null = null;

  get metraje(): Metraje {
    if (!this.metrajeCache || this.metrajeCache.nodos !== this.nodosMapa || this.metrajeCache.conexiones !== this.conexionesMapa) {
      this.metrajeCache = { nodos: this.nodosMapa, conexiones: this.conexionesMapa, metraje: crearMetraje(this.nodosMapa, this.conexionesMapa) };
    }
    return this.metrajeCache.metraje;
  }

  metrajeRuta(desde: number, hasta = this.rutaCalculada.length - 1): MetrajeTramo | null {
    const ruta = this.rutaCalculada.slice(Math.max(0, desde), hasta + 1);
    if (ruta.length < 2) return null;
    let metros = 0;
    let aproximado = false;
    for (let i = 1; i < ruta.length; ++i) {
      const tramo = this.metraje.tramo(ruta[i - 1].id, ruta[i].id);
      if (tramo.metros === null) {
        if (ruta[i - 1].nivel !== ruta[i].nivel) continue;
        return null;
      }
      metros += tramo.metros;
      aproximado ||= tramo.aproximado;
    }
    return { metros, aproximado };
  }

  nombreNodo(nodo: Nodo): string {
    return obtenerNombreNodo(
      nodo.id,
      this.idiomaSeleccionado,
      nodo.nombre
    );
  }

  cambiarIdioma(): void {
    this.idiomaService.establecerIdioma(
      this.idiomaSeleccionado
    );

    this.actualizarDatosMapa();
    this.mensajeUbicacion = "";

    if (this.rutaCalculada.length > 0) {
      this.actualizarResultadoRuta();
      this.anunciarInstruccionSiActiva();
      return;
    }

    this.resultado = "";
    this.distanciaTotal = null;
  }

  seleccionarIdioma(idioma: Idioma): void {
    this.idiomaSeleccionado = idioma;
    this.cambiarIdioma();
  }

  seleccionarPuntoInteres(punto: Nodo): void {
    this.destino = punto.id;
    this.nivelVisualizado = punto.nivel ?? 1;
    this.limpiarRuta();
  }

  seleccionarPuntoMapa(nodoId: string): void {
    const idDestino =
      this.modoAccesible &&
      nodoId === "piscina-acceso-escalones-nivel-3"
        ? "piscina-acceso-accesible-nivel-3"
        : nodoId;

    const destino =
      this.mapaService.obtenerNodoPorId(idDestino);

    if (!destino) {
      return;
    }

    this.destino = destino.id;

    this.nivelVisualizado =
      destino.nivel ?? this.nivelVisualizado;

    this.limpiarRuta();
  }

  mostrarNivelMapa(nivel: 1 | 3 | 4 | 5 | 6): void {
    if (this.movimientoEnCurso && nivel !== this.nivelVisualizado) {
      this.continuarRecorridoAutomatico();
    }
    this.vistaResortCompleto = false;
    this.nivelVisualizado = nivel;
    this.changeDetectorRef.markForCheck();
  }

  mostrarVistaResortCompleto(): void {
    if (this.movimientoEnCurso) {
      this.continuarRecorridoAutomatico();
    }
    this.vistaResortCompleto = true;
  }

  alternarOrientacionFisica(): void {
    this.orientacionFisicaVisible = !this.orientacionFisicaVisible;
  }

  cerrarFotoLlegada(): void {
    this.fotoLlegadaCerrada = true;
  }

  alternarMenu(): void {
    this.menuAbierto = !this.menuAbierto;
  }

  get puedeSalirAplicacion(): boolean {
    return Capacitor.getPlatform() === "android" && Capacitor.isPluginAvailable("App");
  }

  async salirAplicacion(): Promise<void> {
    if (this.puedeSalirAplicacion) {
      this.detenerRecorridoAutomatico();
      this.finalizarSeguimientoFisico();
      this.navegacionAutomatica.detener();
      this.asistenteVoz.detener();
      await App.exitApp();
    }
  }

  cambiarSeleccionRuta(): void {
    this.limpiarRuta();
  }

  iniciarSeleccionVoz(
    campo: CampoSeleccionVoz
  ): void {
    if (this.seguimientoFisicoSeleccionado) {
      void this.pausarSeguimientoFisico();
    }

    if (!this.reconocimientoVozDisponible) {
      this.estadoSeleccionVoz =
        this.traducir("reconocimientoVozNoDisponible");
      return;
    }

    this.asistenteVoz.detener();
    this.comandoVozActivo = false;
    this.campoSeleccionVozActivo = campo;

    const pregunta = this.traducir(
      campo === "origen"
        ? "preguntaOrigenVoz"
        : "preguntaDestinoVoz"
    );

    this.estadoSeleccionVoz = pregunta;

    const comenzarEscucha = (): void => {
      if (this.campoSeleccionVozActivo !== campo) {
        return;
      }

      this.escucharSeleccionVoz(campo);
      this.changeDetectorRef.markForCheck();
    };

    if (!this.asistenteVoz.hablar(
      pregunta,
      this.idiomaSeleccionado,
      comenzarEscucha
    )) {
      comenzarEscucha();
    }
  }

  detenerSeleccionVoz(): void {
    this.asistenteVoz.detener();
    this.campoSeleccionVozActivo = null;

    this.estadoSeleccionVoz =
      this.traducir("comandoVozCancelado");
  }

  procesarSeleccionVoz(
    campo: CampoSeleccionVoz,
    frase: string
  ): void {
    const lugarReconocido =
      this.buscarLugarEnFrase(frase);

    this.campoSeleccionVozActivo = null;

    if (!lugarReconocido) {
      this.estadoSeleccionVoz =
        this.traducir("lugarVozNoReconocido");
      return;
    }

    const lugar =
      campo === "destino" &&
      this.modoAccesible &&
      lugarReconocido.id === "piscina-acceso-escalones-nivel-3"
        ? this.mapaService.obtenerNodoPorId(
            "piscina-acceso-accesible-nivel-3"
          ) ?? lugarReconocido
        : lugarReconocido;

    const otroId =
      campo === "origen"
        ? this.destino
        : this.origen;

    if (lugar.id === otroId) {
      this.estadoSeleccionVoz =
        this.traducir("origenDestinoIguales");

      this.asistenteVoz.hablar(
        this.estadoSeleccionVoz,
        this.idiomaSeleccionado
      );
      return;
    }

    this.limpiarRuta();

    if (campo === "origen") {
      this.origen = lugar.id;
    } else {
      this.destino = lugar.id;
    }

    this.nivelVisualizado =
      lugar.nivel ?? this.nivelVisualizado;

    this.estadoSeleccionVoz = this.traducir(
      campo === "origen"
        ? "origenVozSeleccionado"
        : "destinoVozSeleccionado",
      { nombre: this.nombreNodo(lugar) }
    );

    this.asistenteVoz.hablar(
      this.estadoSeleccionVoz,
      this.idiomaSeleccionado
    );
  }

  private escucharSeleccionVoz(
    campo: CampoSeleccionVoz
  ): void {
    this.estadoSeleccionVoz = this.traducir(
      campo === "origen"
        ? "escuchandoOrigenVoz"
        : "escuchandoDestinoVoz"
    );

    const inicioCorrecto =
      this.asistenteVoz.escucharComando(
        this.idiomaSeleccionado,
        frase => {
          this.procesarSeleccionVoz(campo, frase);
          this.changeDetectorRef.markForCheck();
        },
        codigo => {
          this.campoSeleccionVozActivo = null;
          this.manejarErrorSeleccionVoz(codigo);
          this.changeDetectorRef.markForCheck();
        },
        () => {
          if (this.campoSeleccionVozActivo === campo) {
            this.campoSeleccionVozActivo = null;

            this.estadoSeleccionVoz =
              this.traducir("comandoVozSinResultado");
          }

          this.changeDetectorRef.markForCheck();
        }
      );

    if (!inicioCorrecto) {
      this.campoSeleccionVozActivo = null;

      this.estadoSeleccionVoz =
        this.traducir("errorIniciarMicrofono");
    }
  }

  iniciarComandoVozRuta(): void {
    if (this.seguimientoFisicoSeleccionado) {
      void this.pausarSeguimientoFisico();
    }

    if (!this.reconocimientoVozDisponible) {
      this.estadoComandoVoz =
        this.traducir("reconocimientoVozNoDisponible");
      return;
    }

    this.estadoComandoVoz =
      this.traducir("escuchandoComandoRuta");

    this.comandoVozActivo = true;

    const inicioCorrecto =
      this.asistenteVoz.escucharComando(
        this.idiomaSeleccionado,
        frase => {
          this.procesarComandoVozRuta(frase);
          this.changeDetectorRef.markForCheck();
        },
        codigo => {
          this.manejarErrorComandoVoz(codigo);
          this.changeDetectorRef.markForCheck();
        },
        () => {
          this.comandoVozActivo = false;

          if (
            this.estadoComandoVoz ===
            this.traducir("escuchandoComandoRuta")
          ) {
            this.estadoComandoVoz =
              this.traducir("comandoVozSinResultado");
          }

          this.changeDetectorRef.markForCheck();
        }
      );

    if (!inicioCorrecto) {
      this.comandoVozActivo = false;

      this.estadoComandoVoz =
        this.traducir("errorIniciarMicrofono");
    }
  }

  detenerComandoVozRuta(): void {
    this.asistenteVoz.detenerReconocimiento();
    this.comandoVozActivo = false;

    this.estadoComandoVoz =
      this.traducir("comandoVozCancelado");
  }

  procesarComandoVozRuta(frase: string): void {
    const seleccion =
      this.interpretarComandoVoz(frase);

    if (!seleccion) {
      this.comandoVozActivo = false;

      this.estadoComandoVoz =
        this.traducir("formatoComandoVoz");
      return;
    }

    const destinoId =
      this.modoAccesible &&
      seleccion.destino.id === "piscina-acceso-escalones-nivel-3"
        ? "piscina-acceso-accesible-nivel-3"
        : seleccion.destino.id;

    const destino =
      this.mapaService.obtenerNodoPorId(destinoId) ??
      seleccion.destino;

    this.origen = seleccion.origen.id;
    this.destino = destino.id;
    this.nivelVisualizado = destino.nivel ?? 1;
    this.comandoVozActivo = false;

    this.estadoComandoVoz = this.traducir(
      "comandoVozDetectado",
      {
        origen: this.nombreNodo(seleccion.origen),
        destino: this.nombreNodo(destino)
      }
    );

    this.calcularRuta();
  }

  async leerQrReal(): Promise<void> {
    const reanudarTrasLectura =
      this.seguimientoFisicoSeleccionado &&
      ['siguiendo', 'confirmar-nivel'].includes(
        this.seguimientoFisico?.fase ?? ''
      );

    if (reanudarTrasLectura) {
      await this.pausarSeguimientoFisico();
    }

    this.mensajeUbicacion = "";

    try {
      const lectura =
        await CapacitorBarcodeScanner.scanBarcode({
          hint: CapacitorBarcodeScannerTypeHint.QR_CODE,
          cameraDirection:
            CapacitorBarcodeScannerCameraDirection.BACK,
          scanInstructions: this.traducir("apuntarCamara"),
          scanButton: true,
          scanText: this.traducir("escanear")
        });

      if (!lectura.ScanResult) {
        this.mensajeUbicacion =
          this.traducir("lecturaCancelada");
        return;
      }

      this.procesarLecturaQr(lectura.ScanResult);
    } catch (error) {
      console.error(
        "Error al leer el código QR:",
        error
      );

      this.mensajeUbicacion =
        this.traducir("errorCamara");
    } finally {
      if (
        reanudarTrasLectura &&
        this.seguimientoFisicoSeleccionado &&
        this.seguimientoFisico?.fase === 'pausado' &&
        !this.paginaDestruida
      ) {
        await this.reanudarSeguimientoFisico();
      }
    }
  }

  simularLecturaQr(): void {
    if (this.seguimientoFisicoSeleccionado) {
      this.mensajeUbicacion = this.texto(
        'Durante el seguimiento utiliza la lectura real de QR.',
        'Use a real QR scan during tracking.',
        'Durante o acompanhamento, use a leitura real de QR.'
      );
      return;
    }

    this.mensajeUbicacion = "";

    const contenidoQr = JSON.stringify({
      sistema: "navinside",
      version: 1,
      nodoId: "entrada-nivel-4"
    });

    this.procesarLecturaQr(contenidoQr);
  }

  calcularRuta(): void {
    this.limpiarRuta();

    if (!this.mapaEsValido) {
      this.resultado =
        this.obtenerMensajeMapaInvalido();
      return;
    }

    if (!this.origen || !this.destino) {
      this.resultado =
        this.traducir("seleccionarOrigenDestino");
      return;
    }

    if (this.origen === this.destino) {
      this.resultado =
        this.traducir("origenDestinoIguales");
      return;
    }

    const nodoOrigen =
      this.mapaService.obtenerNodoPorId(this.origen);

    const nodoDestino =
      this.mapaService.obtenerNodoPorId(this.destino);

    if (!nodoOrigen || !nodoDestino) {
      this.resultado =
        this.traducir("lugaresNoEncontrados");
      return;
    }

    const ruta = this.rutaService.calcularRuta(
      nodoOrigen.id,
      nodoDestino.id,
      this.modoAccesible
    );

    if (ruta.length === 0) {
      this.resultado = this.modoAccesible
        ? this.traducir("rutaAccesibleNoDisponible")
        : this.traducir("rutaNoDisponible");
      return;
    }

    this.establecerRutaCalculada(ruta);
    this.mapaNavegacion?.nativeElement.scrollIntoView?.({
      block: "start",
      behavior: "smooth"
    });
  }

  alternarAsistenteVoz(): void {
    if (!this.vozDisponible) {
      return;
    }

    if (this.asistenteVozActivo) {
      this.ultimaGuiaMapaAnunciada = null;
      this.asistenteVozActivo = false;
      this.asistenteVoz.detener();
      return;
    }

    this.asistenteVozActivo = true;
    this.changeDetectorRef.markForCheck();
    this.anunciarInstruccionSiActiva();
  }

  repetirIndicacionVoz(): void {
    if (!this.pasoActual || !this.vozDisponible) {
      return;
    }

    this.anunciarInstruccionSiActiva(true);
  }

  iniciarRecorridoAutomatico(): void {
    if (
      this.seguimientoFisicoSeleccionado ||
      this.seguimientoIniciando
    ) {
      return;
    }

    if (
      !this.pasoActual ||
      this.esUltimoPaso ||
      this.recorridoAutomaticoActivo
    ) {
      return;
    }

    this.recorridoAutomaticoActivo = true;
    this.cancelarContinuacionAutomaticaPendiente();

    if (this.vozDisponible) {
      this.asistenteVozActivo = true;
      this.anunciarInstruccionSiActiva();
    }

    if (!this.movimientoEnCurso) {
      this.programarSiguientePasoAutomatico();
    }

    this.changeDetectorRef.markForCheck();
  }

  detenerRecorridoAutomatico(): void {
    const estabaActivo =
      this.recorridoAutomaticoActivo;
    if (estabaActivo) this.ultimaGuiaMapaAnunciada = null;

    this.recorridoAutomaticoActivo = false;
    this.cancelarContinuacionAutomaticaPendiente();

    if (
      estabaActivo &&
      this.asistenteVozActivo &&
      !this.esUltimoPaso
    ) {
      this.asistenteVoz.detener();
      this.pasosVozAnunciados.delete(
        this.pasoActualIndice
      );
    }

    this.changeDetectorRef.markForCheck();
  }

  avanzarPaso(): void {
    if (this.seguimientoFisicoSeleccionado) {
      return;
    }

    if (this.movimientoEnCurso) {
      return;
    }

    if (
      this.pasosRuta.length === 0 ||
      this.esUltimoPaso
    ) {
      return;
    }

    this.cancelarContinuacionAutomaticaPendiente();
    this.nodoAntesDelMovimiento = this.pasoActual?.nodo ?? null;
    this.pasoActualIndice++;
    this.sincronizarPasoActual();
  }

  retrocederPaso(): void {
    if (this.seguimientoFisicoSeleccionado) {
      return;
    }

    if (this.movimientoEnCurso) {
      return;
    }

    if (
      this.pasosRuta.length === 0 ||
      this.esPrimerPaso
    ) {
      return;
    }

    this.cancelarContinuacionAutomaticaPendiente();
    this.nodoAntesDelMovimiento = this.pasoActual?.nodo ?? null;
    this.pasoActualIndice--;
    this.sincronizarPasoActual();
  }

  reiniciarRecorrido(): void {
    this.ultimaGuiaMapaAnunciada = null;
    this.finalizarSeguimientoFisico();

    if (this.pasosRuta.length === 0) {
      return;
    }

    this.cancelarContinuacionAutomaticaPendiente();
    this.detenerRecorridoAutomatico();
    this.nodoAntesDelMovimiento = this.nodoVistaRuta;
    this.movimientoEnCurso = false;
    this.pasosVozAnunciados.clear();
    this.pasoActualIndice = 0;
    this.sincronizarPasoActual();
  }

  cambiarModoAccesible(): void {
    this.limpiarRuta();
  }

  private sincronizarPasoActual(): void {
    const paso = this.pasoActual;

    if (!paso) {
      return;
    }

    this.nivelVisualizado =
      paso.nodo.nivel ?? 1;
    this.vistaResortCompleto = false;

    this.duracionVozPasoMs =
      paso.tipo === "avance" && this.asistenteVozActivo
        ? this.asistenteVoz.duracionCursorRecomendada(
            this.instruccionVozActual
          )
        : 0;

    if (paso.tipo === "llegada") {
      this.recorridoAutomaticoActivo = false;
      this.movimientoEnCurso = false;
      this.cancelarContinuacionAutomaticaPendiente();
    } else {
      this.programarSiguientePasoAutomatico();
    }

    if (paso.tipo !== "avance") {
      this.anunciarInstruccionSiActiva();
    }

    this.changeDetectorRef.markForCheck();
  }

  sincronizarVozConMovimiento(
    duracionMs: number
  ): void {
    if (this.seguimientoFisicoSeleccionado) {
      return;
    }

    this.movimientoEnCurso = true;
    this.cancelarContinuacionAutomaticaPendiente();

    if (this.pasoActual?.tipo === "avance") {
      this.anunciarInstruccionSiActiva(
        false,
        duracionMs
      );
    }
  }

  private anunciarInstruccionSiActiva(
    forzar = false,
    duracionObjetivoMs?: number
  ): void {
    if (this.guiaMapaActual) {
      this.anunciarGuiaMapa(forzar, duracionObjetivoMs);
      return;
    }
    if (this.seguimientoFisicoSeleccionado) {
      this.anunciarSeguimientoFisico(forzar);
      return;
    }

    if (
      (!this.asistenteVozActivo && !forzar) ||
      !this.pasoActual
    ) {
      return;
    }

    if (
      !forzar &&
      this.pasosVozAnunciados.has(this.pasoActualIndice)
    ) {
      return;
    }

    const inicioLectura = this.asistenteVoz.hablar(
      this.instruccionVozActual,
      this.idiomaSeleccionado,
      undefined,
      forzar,
      duracionObjetivoMs
    );

    if (!inicioLectura) {
      this.asistenteVozActivo = false;
      return;
    }

    if (!forzar) {
      this.pasosVozAnunciados.add(
        this.pasoActualIndice
      );
    }
  }

  private anunciarGuiaMapa(forzar = false, duracionObjetivoMs?: number): void {
    const guia = this.guiaMapaActual;
    if (!guia || (!this.asistenteVozActivo && !forzar) || !guia.speech ||
        (!forzar && this.ultimaGuiaMapaAnunciada === guia.key)) return;
    if (this.asistenteVoz.hablar(guia.speech, this.idiomaSeleccionado, undefined, true, duracionObjetivoMs)) {
      this.ultimaGuiaMapaAnunciada = guia.key;
    }
  }

  continuarRecorridoAutomatico(): void {
    if (this.seguimientoFisicoSeleccionado) {
      return;
    }

    this.movimientoEnCurso = false;
    this.nodoAntesDelMovimiento = null;

    if (this.esUltimoPaso) {
      this.recorridoAutomaticoActivo = false;
      this.cancelarContinuacionAutomaticaPendiente();
      this.changeDetectorRef.markForCheck();
      return;
    }

    this.programarSiguientePasoAutomatico();
    this.changeDetectorRef.markForCheck();
  }

  private programarSiguientePasoAutomatico(): void {
    this.cancelarContinuacionAutomaticaPendiente();

    if (this.seguimientoFisicoSeleccionado) {
      return;
    }

    if (
      !this.recorridoAutomaticoActivo ||
      this.movimientoEnCurso ||
      this.esUltimoPaso ||
      !this.pasoActual
    ) {
      return;
    }

    const indiceEsperado =
      this.pasoActualIndice;

    const sigueVigente = (): boolean =>
      this.recorridoAutomaticoActivo &&
      !this.movimientoEnCurso &&
      !this.esUltimoPaso &&
      this.pasoActualIndice === indiceEsperado;

    const esperarVoz = (): void => {
      this.temporizadorContinuacion = null;

      if (!sigueVigente()) {
        return;
      }

      if (
        this.asistenteVozActivo &&
        this.asistenteVoz.hablando
      ) {
        this.temporizadorContinuacion =
          setTimeout(esperarVoz, 90);
        return;
      }

      this.temporizadorContinuacion =
        setTimeout(() => {
          this.temporizadorContinuacion = null;

          if (!sigueVigente()) {
            return;
          }

          if (
            this.asistenteVozActivo &&
            this.asistenteVoz.hablando
          ) {
            esperarVoz();
            return;
          }

          this.avanzarPaso();
          this.changeDetectorRef.markForCheck();
        }, 700);
    };

    esperarVoz();
  }

  private cancelarContinuacionAutomaticaPendiente(): void {
    if (
      this.temporizadorContinuacion === null
    ) {
      return;
    }

    clearTimeout(
      this.temporizadorContinuacion
    );

    this.temporizadorContinuacion = null;
  }

  private procesarLecturaQr(
    contenidoQr: string
  ): void {
    if (!this.mapaEsValido) {
      this.mensajeUbicacion =
        this.obtenerMensajeMapaInvalido();
      return;
    }

    const nodoDetectado =
      this.qrService.procesarCodigo(contenidoQr);

    if (!nodoDetectado) {
      this.mensajeUbicacion =
        this.traducir("qrInvalido");
      return;
    }

    this.navegacionWifi.confirmarPosicion(nodoDetectado.id);

    if (
      this.seguimientoFisicoSeleccionado &&
      this.seguimientoRuta.confirmarNodo(nodoDetectado.id)
    ) {
      this.nivelVisualizado =
        nodoDetectado.nivel ?? this.nivelVisualizado;

      this.mensajeUbicacion = this.traducir(
        nodoDetectado.id === this.destino
          ? 'destinoAlcanzadoQr'
          : 'ubicacionDetectada',
        { nombre: this.nombreNodo(nodoDetectado) }
      );
      return;
    }

    const debeRecalcular =
      this.rutaCalculada.length > 0 &&
      this.destino !== "";

    this.origen = nodoDetectado.id;
    this.nivelVisualizado =
      nodoDetectado.nivel ?? 1;

    if (debeRecalcular) {
      this.recalcularRutaDesdeQr(nodoDetectado);
      return;
    }

    this.mensajeUbicacion = this.traducir(
      "ubicacionDetectada",
      { nombre: this.nombreNodo(nodoDetectado) }
    );
  }

  private recalcularRutaDesdeQr(
    nodoDetectado: Nodo
  ): void {
    this.finalizarSeguimientoFisico();

    const nodoDestino =
      this.mapaService.obtenerNodoPorId(this.destino);

    if (!nodoDestino) {
      this.limpiarRuta();

      this.mensajeUbicacion =
        this.traducir("lugaresNoEncontrados");
      return;
    }

    if (nodoDetectado.id === nodoDestino.id) {
      this.rutaCalculada = [nodoDetectado];

      this.pasosRuta = [
        {
          orden: 1,
          tipo: "llegada",
          nodo: nodoDetectado
        }
      ];

      this.pasoActualIndice = 0;
      this.distanciaTotal = 0;
      this.actualizarResultadoRuta();
      this.sincronizarPasoActual();

      this.mensajeUbicacion =
        this.traducir(
          "destinoAlcanzadoQr",
          { nombre: this.nombreNodo(nodoDetectado) }
        );

      return;
    }

    const nuevaRuta = this.rutaService.calcularRuta(
      nodoDetectado.id,
      nodoDestino.id,
      this.modoAccesible
    );

    if (nuevaRuta.length === 0) {
      this.limpiarRuta();

      this.nivelVisualizado =
        nodoDetectado.nivel ?? 1;

      this.mensajeUbicacion = this.modoAccesible
        ? this.traducir("rutaAccesibleNoDisponible")
        : this.traducir("rutaNoDisponible");
      return;
    }

    this.establecerRutaCalculada(nuevaRuta);

    this.mensajeUbicacion = this.traducir(
      "rutaRecalculada",
      { nombre: this.nombreNodo(nodoDetectado) }
    );
  }

  private establecerRutaCalculada(
    ruta: Nodo[]
  ): void {
    this.guiaMapa = null;
    this.ultimaGuiaMapaAnunciada = null;
    this.finalizarSeguimientoFisico();
    this.recorridoAutomaticoActivo = false;
    this.movimientoEnCurso = false;
    this.nodoAntesDelMovimiento = null;
    this.cancelarContinuacionAutomaticaPendiente();
    this.rutaCalculada = ruta;
    this.pasosVozAnunciados.clear();
    this.pasosRuta =
      this.rutaService.generarPasos(ruta);
    this.pasoActualIndice = 0;

    if (this.vozDisponible) {
      this.asistenteVozActivo = true;
    }

    this.distanciaTotal =
      this.rutaService.calcularDistanciaTotal(ruta);

    this.sincronizarPasoActual();
    this.actualizarResultadoRuta();
  }

  private async cargarMapaInicial(): Promise<void> {
    const mapaCargado =
      await this.mapaService.cargarMapaDesdeSupabase();

    if (mapaCargado && !this.paginaDestruida) {
      this.actualizarDatosMapa();
    }
  }

  private actualizarDatosMapa(): void {
    const mapaActivo =
      this.mapaService.obtenerMapaActivo();

    const conexionesNavegables =
      this.mapaService.obtenerConexionesNavegables();

    const validacion: ResultadoValidacionMapa =
      this.mapaValidadorService.validarMapa(
        mapaActivo.nodos,
        conexionesNavegables
      );

    this.mapaEsValido = validacion.valido;
    this.erroresMapa = validacion.errores;
    this.advertenciasMapa = validacion.advertencias;

    this.lugares = mapaActivo.nodos.filter(
      nodo => nodo.restringido !== true && !esPasoAccesibleNivel3(nodo.id)
    );

    this.conexionesMapa =
      conexionesNavegables;

    this.nodosMapa = mapaActivo.nodos.filter(n => !n.restringido).map(
      nodo => ({
        ...nodo,
        nombre: this.nombreNodo(nodo)
      })
    );

    this.lugaresReferencia =
      this.mapaService.obtenerLugaresPreliminares();

    if (this.movimientoEnCurso) {
      this.continuarRecorridoAutomatico();
    }
  }

  private obtenerMensajeMapaInvalido(): string {
    const cantidadErrores =
      this.erroresMapa.length;

    return this.texto(
      `No se pueden calcular rutas: el mapa tiene ${cantidadErrores} error(es) de configuración.`,
      `Routes cannot be calculated: the map has ${cantidadErrores} configuration error(s).`,
      `Não é possível calcular rotas: o mapa possui ${cantidadErrores} erro(s) de configuração.`
    );
  }

  private actualizarResultadoRuta(): void {
    this.resultado = this.rutaCalculada
      .map(nodo => this.nombreNodo(nodo))
      .join(" → ");
  }

  private obtenerInstruccionVisual(
    paso: PasoRuta
  ): string {
    const textoBase =
      this.traducirPaso(paso);

    if (paso.tipo !== "avance") {
      return textoBase;
    }

    const direccion =
      this.obtenerDireccionFisica(paso);

    const accesoEspecial =
      this.obtenerInstruccionAccesoEspecial(paso.nodo.id);

    return [
      direccion
        ? this.traducir(
            direccion,
            { nombre: this.nombreNodo(paso.nodo) }
          )
        : textoBase,
      accesoEspecial
    ].filter(Boolean).join(" ");
  }

  private obtenerDireccionFisica(
    paso: PasoRuta
  ): string | null {
    const origenId = paso.desde?.id;
    const destinoId = paso.nodo.id;

    if (origenId === "ascensor-central-nivel-1") {
      if (destinoId === "zona-juego-adulto-nivel-1") {
        return "giraDerechaHacia";
      }

      if ([
        "zona-kid-nivel-1",
        "zona-play-nivel-1",
        "mini-market-proa-nivel-1",
        "hall-nivel-1"
      ].includes(destinoId)) {
        return "giraIzquierdaHacia";
      }
    }

    if (
      origenId === "hall-nivel-1" &&
      [
        "salon-eventos-terramar-nivel-1",
        "gimnasio-nivel-1",
        "toallas-nivel-1",
        "alma-spa-nivel-1",
        "salon-eventos-montemar-nivel-1",
        "ascensor-habitaciones-nivel-1"
      ].includes(destinoId)
    ) {
      return "desdeHallDerechaHacia";
    }

    if (
      (origenId === "zona-kid-nivel-1" &&
        destinoId === "zona-play-nivel-1") ||
      (origenId === "zona-play-nivel-1" &&
        destinoId === "mini-market-proa-nivel-1")
    ) {
      return "continuaRectoHacia";
    }

    return null;
  }

  private obtenerInstruccionAccesoEspecial(
    destinoId: string
  ): string {
    if (destinoId === "gimnasio-nivel-1") {
      return this.traducir(
        "accesoGimnasioEscaleras"
      );
    }

    if (
      destinoId === "zona-juego-adulto-nivel-1"
    ) {
      return this.traducir(
        "accesoJuegosAdultosEscaleras"
      );
    }

    return "";
  }

  private traducirPaso(
    paso: PasoRuta
  ): string {
    const nombre =
      this.nombreNodo(paso.nodo);

    if (paso.tipo === "inicio") {
      return this.traducir(
        "inicioRuta",
        { nombre }
      );
    }

    if (paso.tipo === "llegada") {
      return this.traducir(
        "llegadaRuta",
        { nombre }
      );
    }

    if (paso.tipo === "avance") {
      return this.traducir(
        "continuarHacia",
        { nombre }
      );
    }

    const nivel =
      paso.nodo.nivel ?? "";

    if (paso.medio === "ascensor") {
      return this.traducir(
        paso.direccionNivel === "subir"
          ? "subirAscensor"
          : "bajarAscensor",
        { nivel }
      );
    }

    if (paso.medio === "escalera") {
      return this.traducir(
        paso.direccionNivel === "subir"
          ? "subirEscalera"
          : "bajarEscalera",
        { nivel }
      );
    }

    if (paso.medio === "rampa") {
      return this.traducir(
        paso.direccionNivel === "subir"
          ? "subirRampa"
          : "bajarRampa",
        { nivel }
      );
    }

    if (
      paso.medio === "acceso" &&
      (paso.desde?.id === "acceso-costamar-nivel-4" ||
        paso.nodo.id === "acceso-costamar-nivel-4")
    ) {
      return paso.direccionNivel === "subir"
        ? this.texto(
            "Usa el acceso a Costamar y sube al nivel 5.",
            "Take the Costamar access up to level 5.",
            "Use o acesso ao Costamar e suba ao nível 5."
          )
        : this.texto(
            "Baja por el acceso de Costamar al lobby del nivel 4.",
            "Take the Costamar access down to the level 4 lobby.",
            "Desça pelo acesso do Costamar ao lobby do nível 4."
          );
    }

    return this.traducir(
      paso.direccionNivel === "subir"
        ? "cambiarNivelSubir"
        : "cambiarNivelBajar",
      { nivel, nombre }
    );
  }

  texto(
    espanol: string,
    ingles: string,
    portugues: string
  ): string {
    if (this.idiomaSeleccionado === "en") {
      return ingles;
    }

    if (this.idiomaSeleccionado === "pt") {
      return portugues;
    }

    return espanol;
  }

  private limpiarRuta(): void {
    this.guiaMapa = null;
    this.ultimaGuiaMapaAnunciada = null;
    this.fotoLlegadaCerrada = false;
    this.finalizarSeguimientoFisico();
    this.detenerRecorridoAutomatico();
    this.asistenteVoz.detener();
    this.comandoVozActivo = false;
    this.resultado = "";
    this.distanciaTotal = null;
    this.rutaCalculada = [];
    this.pasosRuta = [];
    this.pasoActualIndice = 0;
    this.duracionVozPasoMs = 0;
    this.movimientoEnCurso = false;
    this.nodoAntesDelMovimiento = null;
    this.pasosVozAnunciados.clear();
  }

  private interpretarComandoVoz(
    frase: string
  ): {
    origen: Nodo;
    destino: Nodo;
  } | null {
    const texto =
      this.normalizarTexto(frase);

    const patrones: RegExp[] =
      this.idiomaSeleccionado === "en"
        ? [/\bfrom\s+(.+?)\s+to\s+(.+)$/]
        : this.idiomaSeleccionado === "pt"
          ? [/\b(?:de|do|da)\s+(.+?)\s+(?:ate|para)\s+(.+)$/]
          : [
              /\bdesde\s+(.+?)\s+hasta\s+(.+)$/,
              /\bde\s+(.+?)\s+a\s+(.+)$/
            ];

    let partes:
      RegExpMatchArray | null = null;

    for (const patron of patrones) {
      partes = texto.match(patron);

      if (partes) {
        break;
      }
    }

    if (!partes) {
      partes = texto.match(
        /\borigen\s+(.+?)\s+destino\s+(.+)$/
      );
    }

    if (!partes) {
      return null;
    }

    const origen =
      this.buscarLugarEnFrase(partes[1]);

    const destino =
      this.buscarLugarEnFrase(partes[2]);

    return origen &&
      destino &&
      origen.id !== destino.id
        ? { origen, destino }
        : null;
  }

  private buscarLugarEnFrase(
    fragmento: string
  ): Nodo | null {
    const textoNormalizado =
      this.normalizarTexto(fragmento);

    if (
      ["al", "all", "jal"].includes(
        textoNormalizado
      )
    ) {
      return this.lugares.find(
        lugar => lugar.id === "hall-nivel-1"
      ) ?? null;
    }

    const texto = textoNormalizado.replace(
      /^(?:el|la|los|las|al|a|o|os|as)\s+/,
      ""
    );

    const coincidencias = this.lugares
      .filter(
        lugar => lugar.restringido !== true
      )
      .map(lugar => ({
        lugar,
        nombres: [
          this.nombreNodo(lugar),
          lugar.nombre,
          ...this.aliasVozNodo(lugar.id)
        ].map(
          nombre =>
            this.normalizarTexto(nombre)
        )
      }))
      .flatMap(
        item => item.nombres
          .filter(
            nombre =>
              nombre.length > 2 &&
              texto.includes(nombre)
          )
          .map(
            nombre => ({
              ...item,
              nombre
            })
          )
      )
      .sort(
        (primerResultado, segundoResultado) =>
          segundoResultado.nombre.length -
          primerResultado.nombre.length
      );

    return coincidencias[0]?.lugar ?? null;
  }

  private aliasVozNodo(
    nodoId: string
  ): string[] {
    const alias: Record<string, string[]> = {
      "entrada-nivel-4": [
        "entrada",
        "entrada principal",
        "acceso principal",
        "entrance",
        "main entrance"
      ],
      "lobby-nivel-4": ["lobby", "lobby nivel 4", "main lobby", "lobby nivel quatro"],
      "pasillo-habitaciones-nivel-4": ["pasillo de habitaciones", "pasillo habitaciones nivel 4", "corredor de habitaciones", "guest room corridor", "corredor dos quartos"],
      "salon-costamar-nivel-5": ["costamar", "costa mar", "salon costamar", "salao costamar"],
      "acceso-costamar-nivel-4": ["acceso costa mar", "acceso costamar", "entrada costa mar"],
      "recepcion-turismo-vina-nivel-4": [
        "recepcion turismo",
        "recepcion de turismo",
        "recepcion turismo vina",
        "turismo vina",
        "oficina de turismo",
        "recepcion vina",
        "tourism reception",
        "tourist reception",
        "turismo vina reception",
        "recepcao turismo",
        "recepcao de turismo"
      ],
      "recepcion-resort-nivel-4": [
        "recepcion resort",
        "recepcion del resort",
        "recepcion principal",
        "resort reception",
        "main reception",
        "recepcao do resort",
        "recepcao principal"
      ],
      "ascensor-central-nivel-4": [
        "ascensor central nivel 4",
        "ascensor nivel 4",
        "ascensor principal nivel 4",
        "central elevator level 4",
        "main elevator level 4",
        "elevator level 4",
        "elevador central nivel 4",
        "elevador principal nivel 4"
      ],
      "puerta-exterior-derecha-nivel-4": [
        "puerta derecha",
        "puerta exterior derecha",
        "salida derecha",
        "right door",
        "right exterior door",
        "right exit",
        "porta direita",
        "porta exterior direita",
        "saida direita"
      ],
      "puerta-exterior-izquierda-nivel-4": [
        "puerta izquierda",
        "puerta exterior izquierda",
        "salida izquierda",
        "left door",
        "left exterior door",
        "left exit",
        "porta esquerda",
        "porta exterior esquerda",
        "saida esquerda"
      ],
      "acceso-escalera-derecha-nivel-3": [
        "escalera derecha",
        "acceso escalera derecha",
        "acceso nivel 3 derecha",
        "right stairs",
        "right staircase",
        "level 3 right stairs",
        "escada direita",
        "acesso escada direita"
      ],
      "acceso-escalera-izquierda-nivel-3": [
        "escalera izquierda",
        "acceso escalera izquierda",
        "acceso nivel 3 izquierda",
        "left stairs",
        "left staircase",
        "level 3 left stairs",
        "escada esquerda",
        "acesso escada esquerda"
      ],
      "ascensor-central-nivel-1": [
        "ascensor principal",
        "ascensores principales",
        "ascensor central",
        "main elevator",
        "main elevators",
        "central elevator",
        "elevador principal",
        "elevadores principais",
        "elevador central"
      ],
      "ascensor-central-nivel-3": [
        "ascensor principal nivel 3",
        "ascensor nivel 3",
        "salida del ascensor",
        "main elevator level 3",
        "elevator level 3",
        "elevator exit",
        "elevador principal nivel 3",
        "elevador nivel 3",
        "saida do elevador"
      ],
      "piscina-temperada-nivel-3": [
        "piscina temperada",
        "piscina climatizada",
        "piscina interior",
        "piscina caliente",
        "heated swimming pool",
        "heated pool",
        "indoor pool",
        "swimming pool",
        "piscina aquecida",
        "piscina interna"
      ],
      "ascensor-habitaciones-nivel-1": [
        "ascensor de habitaciones",
        "ascensores habitaciones",
        "elevadores de habitaciones",
        "guest elevators",
        "guest elevator",
        "room elevators",
        "room elevator",
        "elevadores dos quartos",
        "elevador dos quartos"
      ],
      "mini-market-proa-nivel-1": [
        "minimarket",
        "mini market",
        "proa",
        "proa minimarket",
        "proa mini market",
        "mini mercado proa"
      ],
      "zona-kid-nivel-1": [
        "mini club",
        "miniclub",
        "kids",
        "kids area",
        "kids club",
        "mini club kids",
        "area infantil",
        "clube infantil"
      ],
      "zona-juego-adulto-nivel-1": [
        "juegos adultos",
        "juegos de adultos",
        "sala de juegos adultos",
        "zona de juegos adultos",
        "adult",
        "adults",
        "adult game",
        "adult games",
        "adult game room",
        "adult games room",
        "adult games area",
        "game room",
        "games room",
        "jogos adultos",
        "jogos de adultos",
        "sala de jogos adultos",
        "area de jogos para adultos",
        "jogos para adultos"
      ],
      "zona-play-nivel-1": [
        "zona play",
        "area play",
        "zona de juegos",
        "play area",
        "play zone",
        "recreation area",
        "area de recreacao",
        "zona de recreacao"
      ],
      "hall-nivel-1": [
        "hall",
        "all",
        "jal",
        "vestibulo",
        "hall principal",
        "main hall",
        "salao principal"
      ],
      "gimnasio-nivel-1": [
        "gimnasio",
        "gym",
        "jim",
        "gem",
        "sala de gimnasio",
        "fitness",
        "fitness center",
        "fitness centre",
        "fitness room",
        "gym room",
        "academia",
        "ginasio",
        "sala de ginastica",
        "centro fitness"
      ],
      "salon-eventos-montemar-nivel-1": [
        "montemar",
        "monte mar",
        "salon montemar",
        "salon monte mar",
        "montemar lounge",
        "montemar event hall",
        "salao montemar",
        "salao de eventos montemar"
      ],
      "salon-eventos-terramar-nivel-1": [
        "terramar",
        "terra mar",
        "salon terramar",
        "salon terra mar",
        "terramar lounge",
        "terramar event hall",
        "salao terramar",
        "salao de eventos terramar"
      ],
      "salon-eventos-altamar-nivel-1": [
        "altamar",
        "alta mar",
        "salon altamar",
        "salon alta mar",
        "sala altamar",
        "altamar lounge",
        "altamar event hall",
        "salao altamar",
        "salao de eventos altamar"
      ],
      "alma-spa-nivel-1": [
        "alma spa",
        "spa",
        "el spa",
        "the spa",
        "o spa"
      ],
      "restaurant-faro-nivel-3": [
        "faro",
        "restaurante faro",
        "restaurant faro",
        "faro restaurant"
      ],
      "piscina-acceso-escalones-nivel-3": [
        "piscina exterior",
        "piscina por escalones",
        "pool stairs",
        "swimming pool stairs",
        "stair access pool",
        "piscina por escadas",
        "acesso da piscina por escadas"
      ],
      "piscina-acceso-accesible-nivel-3": [
        "piscina accesible",
        "piscina por rampa",
        "accessible pool",
        "accessible swimming pool",
        "pool ramp",
        "piscina acessivel"
      ],
      "canchas-tenis-nivel-3": [
        "tenis",
        "cancha de tenis",
        "canchas de tenis",
        "tennis",
        "tennis court",
        "tennis courts",
        "quadra de tenis",
        "quadras de tenis"
      ],
      "ascensor-habitaciones-piso-6": [
        "ascensor habitaciones piso 6",
        "ascensor piso 6",
        "salida ascensor piso 6",
        "guest elevator floor 6",
        "room elevator floor 6",
        "elevator floor 6",
        "elevador dos quartos andar 6",
        "elevador andar 6"
      ],
      "puerta-acceso-tinajas-piso-6": [
        "puerta de las tinajas",
        "acceso a las tinajas",
        "entrada tinajas",
        "hot tub door",
        "hot tub access",
        "hot tubs access",
        "porta das banheiras",
        "acesso as banheiras",
        "acesso banheiras"
      ],
      "tinajas-piso-6": ["tinaja", "tinajas", "hot tub", "hot tubs", "banheiras"],
      "sauna-piso-6": ["sauna", "sauna piso 6"],
      "alma-spa-tinaja-piso-6": [
        "alma spa masajes",
        "masajes alma spa",
        "alma spa y sauna",
        "alma spa massage",
        "massage spa",
        "alma spa massage and sauna",
        "alma spa massagens",
        "massagem alma spa",
        "alma spa massagens e sauna"
      ]
    };

    return alias[nodoId] ?? [];
  }

  private normalizarTexto(
    texto: string
  ): string {
    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private manejarErrorSeleccionVoz(
    codigo: string
  ): void {
    const clave =
      codigo === "not-allowed" ||
      codigo === "service-not-allowed" ||
      codigo === "audio-capture"
        ? "permisoMicrofonoDenegado"
        : codigo === "no-speech"
          ? "comandoVozSinResultado"
          : "errorReconocimientoVoz";

    this.estadoSeleccionVoz =
      this.traducir(clave);
  }

  private manejarErrorComandoVoz(
    codigo: string
  ): void {
    const clave =
      codigo === "not-allowed" ||
      codigo === "service-not-allowed" ||
      codigo === "audio-capture"
        ? "permisoMicrofonoDenegado"
        : codigo === "no-speech"
          ? "comandoVozSinResultado"
          : "errorReconocimientoVoz";

    this.comandoVozActivo = false;

    this.estadoComandoVoz =
      this.traducir(clave);
  }
}
