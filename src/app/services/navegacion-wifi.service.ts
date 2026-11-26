import { inject, Injectable, NgZone, OnDestroy } from '@angular/core';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import { Conexion, Nodo } from '../models/nodo.model';
import { posicionPlano } from './georreferencia.service';
import { crearMetraje } from '../data/metraje';
import {
  CalibracionRumbo,
  claveAp,
  puntuacionNivel,
  Punto,
  construirGrafoNivel,
  construirModeloRadio,
  desfaseEscaneo,
  DetectorPasos,
  EstimacionWifi,
  FiltroParticulasWifi,
  GrafoNivel,
  ModeloRadio,
  muestrasDeRecorrido,
  muestrasEnNodo,
  normalizarEscaneo,
  ObservacionRadio
} from './localizacion-wifi';
import { MapaRadioService } from './mapa-radio.service';
import { SeguimientoRutaService } from './seguimiento-ruta.service';
import {
  CapacidadesWifiNativas,
  ConexionWifiNativa,
  ResultadoEscaneoNativo,
  WIFI_NATIVO
} from './wifi-nativo';

export interface LevantamientoActivo {
  tipo: 'tramo' | 'punto';
  nivel: number;
  origenId: string;
  destinoId: string;
  inicioMs: number;
  observaciones: number;
}

export interface DiagnosticoWifi {
  capacidades: CapacidadesWifiNativas | null;
  conexion: ConexionWifiNativa | null;
  lecturasMinuto: { conexion: number; escaneo: number; rtt: number };
  puntosRtt: number;
  desfaseDb: number;
  intervaloEscaneoMs: number;
  aristas: number;
  aristasConDatos: number;
  muestras: number;
  calidad: number;
  acelerometro: boolean;
  pasos: number;
  brujula: { disponible: boolean; lista: boolean; muestras: number };
  geometriaPlano: boolean;
  error: string | null;
}

export interface GeometriaPlano {
  escalaM: number;
  nodos: Record<string, Punto>;
  largos: Record<string, number>;
}

export interface EstadoNavegacionWifi {
  disponible: boolean;
  activa: boolean;
  nivel: number | null;
  estimacion: EstimacionWifi | null;
  firme: boolean;
  levantamiento: LevantamientoActivo | null;
  diagnostico: DiagnosticoWifi;
}

const TICK_MS = 250;
const CONEXION_MS = 1000;
const RTT_MS = 1000;
const ESCANEO_LIMITADO_MS = 30500;
const ESCANEO_LIBRE_MS = 3000;

@Injectable({ providedIn: 'root' })
export class NavegacionWifiService implements OnDestroy {
  private readonly mapaRadio = inject(MapaRadioService);
  private readonly seguimiento = inject(SeguimientoRutaService);
  private readonly zona = inject(NgZone);
  private readonly nativo = inject(WIFI_NATIVO);

  private readonly suscripciones = new Subscription();
  private readonly estadoInterno = new BehaviorSubject<EstadoNavegacionWifi>({
    disponible: this.disponible,
    activa: false,
    nivel: null,
    estimacion: null,
    firme: false,
    levantamiento: null,
    diagnostico: this.diagnosticoVacio()
  });

  readonly estado$ = this.estadoInterno.asObservable();

  private nodos: Nodo[] = [];
  private conexiones: Conexion[] = [];
  private ruta: Nodo[] = [];
  private nivel: number | null = null;
  private origenId: string | null = null;

  private grafo: GrafoNivel | null = null;
  private modelo: ModeloRadio | null = null;
  private filtro: FiltroParticulasWifi | null = null;

  private temporizadores: ReturnType<typeof setInterval>[] = [];
  private escucha: PluginListenerHandle | null = null;
  private capturando = false;
  private ultimoTick = 0;
  private ultimoEscaneoProcesado = 0;
  private ultimaConexion: { ap: string; rssi: number; t: number } | null = null;
  private respondedoresRtt: string[] = [];
  private desfaseDb = 0;
  private registro: { fuente: ObservacionRadio['fuente']; t: number }[] = [];
  private observacionesLevantamiento: ObservacionRadio[] = [];
  private ultimaCorreccionRuta = 0;
  private pistaVelocidad: { v: number; t: number } | null = null;
  private pasosPrevios: { metros: number; t: number } | null = null;
  private intervaloEscaneo = ESCANEO_LIMITADO_MS;
  private ocupado = { conexion: false, escaneo: false, rtt: false };
  private readonly detectorPasos = new DetectorPasos(0.7);

  private readonly geometrias = new Map<number, GeometriaPlano>();
  private readonly modelosNivel = new Map<number, ModeloRadio | null>();
  private readonly calibraciones = new Map<number, CalibracionRumbo>();
  private readonly claveRumbo = 'navinside.rumbo-plano.v1';
  private rumbo: { valor: number; absoluto: boolean; t: number } | null = null;
  private ultimoAbsoluto = 0;
  private ticks = 0;
  private candidatoNivel: { nivel: number; veces: number } | null = null;
  private readonly cambiosNivel = new Subject<number>();

  readonly cambioNivel$ = this.cambiosNivel.asObservable();

  private readonly alOrientar = (evento: Event): void => {
    const e = evento as DeviceOrientationEvent & { webkitCompassHeading?: number };
    const absoluto = e.type === 'deviceorientationabsolute' || e.absolute === true;
    if (!absoluto && Date.now() - this.ultimoAbsoluto < 2000) return;
    let grados: number | null = null;
    if (Number.isFinite(e.webkitCompassHeading)) grados = e.webkitCompassHeading!;
    else if (Number.isFinite(e.alpha)) grados = 360 - e.alpha!;
    if (grados === null) return;
    const giroPantalla = typeof screen !== 'undefined' ? screen.orientation?.angle ?? 0 : 0;
    this.registrarRumbo(grados + giroPantalla, absoluto);
  };

  registrarRumbo(grados: number, absoluto: boolean, instanteMs = Date.now()): void {
    if (!Number.isFinite(grados)) return;
    if (absoluto) this.ultimoAbsoluto = instanteMs;
    this.rumbo = { valor: ((grados % 360) + 360) % 360, absoluto, t: instanteMs };
  }

  private readonly alMovimiento = (evento: DeviceMotionEvent): void => {
    const a = evento.accelerationIncludingGravity;
    if (!a || !Number.isFinite(a.x) || !Number.isFinite(a.y) || !Number.isFinite(a.z)) return;
    this.registrarAceleracion(Math.hypot(a.x!, a.y!, a.z!), Date.now());
  };

  registrarAceleracion(magnitud: number, instanteMs: number): void {
    this.detectorPasos.procesar(magnitud, instanteMs);
  }

  constructor() {
    this.suscripciones.add(
      this.mapaRadio.version$.subscribe(() => {
        this.modelosNivel.clear();
        this.reconstruirModelo();
      })
    );

    try {
      const guardadas: unknown = JSON.parse(localStorage.getItem(this.claveRumbo) ?? '{}');
      if (guardadas && typeof guardadas === 'object') {
        for (const [nivel, datos] of Object.entries(guardadas as Record<string, { sx: number; sy: number; n: number }>)) {
          const calibracion = new CalibracionRumbo();
          calibracion.importar(datos);
          if (calibracion.muestras) this.calibraciones.set(Number(nivel), calibracion);
        }
      }
    } catch {
    }

    this.suscripciones.add(
      this.seguimiento.estado$.subscribe(e => {
        const ahora = Date.now();
        const metros = e.pasosEstimados * (e.longitudPasoMetros ?? 0);
        if (this.pasosPrevios && metros > this.pasosPrevios.metros) {
          const dt = (ahora - this.pasosPrevios.t) / 1000;
          if (dt > 0.3 && dt < 5) {
            this.pistaVelocidad = { v: Math.min(1.8, (metros - this.pasosPrevios.metros) / dt), t: ahora };
          }
        }
        this.pasosPrevios = { metros, t: ahora };
      })
    );

    void this.mapaRadio.cargarIncluidas();
  }

  get disponible(): boolean {
    return Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('NavInsideWifi');
  }

  obtenerEstado(): EstadoNavegacionWifi {
    return this.estadoInterno.value;
  }

  configurar(
    nivel: number,
    nodos: readonly Nodo[],
    conexiones: readonly Conexion[],
    ruta: readonly Nodo[] = [],
    origenId: string | null = null
  ): void {
    const cambioGrafo =
      nivel !== this.nivel ||
      nodos.length !== this.nodos.length ||
      conexiones.length !== this.conexiones.length;

    this.nodos = nodos.map(n => ({ ...n }));
    this.conexiones = conexiones.map(c => ({ ...c }));
    this.ruta = ruta.map(n => ({ ...n }));
    this.origenId = origenId;

    if (cambioGrafo) {
      if (nodos.length !== this.nodosPrevios || conexiones.length !== this.conexionesPrevias) {
        this.modelosNivel.clear();
      }
      this.nodosPrevios = nodos.length;
      this.conexionesPrevias = conexiones.length;
      this.nivel = nivel;
      this.candidatoNivel = null;
      this.grafo = this.crearGrafo(nivel);
      this.reconstruirModelo(true);
    } else {
      this.filtro?.establecerRuta(this.ruta.filter(n => n.nivel === nivel).map(n => n.id));
    }

    this.publicar({ nivel });
  }

  async iniciar(): Promise<boolean> {
    if (!this.disponible) {
      this.publicar({ disponible: false, diagnostico: { ...this.estadoInterno.value.diagnostico, error: 'unavailable' } });
      return false;
    }

    if (!this.grafo || !this.grafo.aristas.length) {
      this.publicar({ diagnostico: { ...this.estadoInterno.value.diagnostico, error: 'sin-grafo' } });
      return false;
    }

    await this.mapaRadio.cargarIncluidas();

    if (!this.filtro) this.reconstruirModelo(true);
    this.filtro!.iniciar(this.origenId);
    this.publicar({ activa: true, estimacion: null, firme: false });

    await this.iniciarCaptura();
    return true;
  }

  async detener(): Promise<void> {
    this.publicar({ activa: false, estimacion: null, firme: false });
    if (!this.estadoInterno.value.levantamiento) await this.detenerCaptura();
  }

  registrarGeometria(nivel: number, geometria: GeometriaPlano): void {
    if (!geometria || !Number.isFinite(geometria.escalaM) || typeof geometria.nodos !== 'object') return;
    const anterior = this.geometrias.get(nivel);
    if (anterior && JSON.stringify(anterior) === JSON.stringify(geometria)) return;

    this.geometrias.set(nivel, geometria);
    this.modelosNivel.delete(nivel);

    if (nivel === this.nivel && this.nodos.length) {
      this.grafo = this.crearGrafo(nivel);
      this.reconstruirModelo(true);
    }
  }

  tramosNivel(): { a: string; b: string; largo: number; medida: boolean; muestras: number }[] {
    if (!this.grafo || this.nivel === null) return [];
    const muestras = this.mapaRadio.muestras(this.nivel).filter(m => m.origenId !== m.destinoId);
    return this.grafo.aristas.map(a => ({
      a: a.a,
      b: a.b,
      largo: a.largo,
      medida: a.medida,
      muestras: muestras.filter(m =>
        (m.origenId === a.a && m.destinoId === a.b) || (m.origenId === a.b && m.destinoId === a.a)
      ).length
    }));
  }

  confirmarPosicion(nodoId: string): void {
    this.origenId = nodoId;
    if (this.estadoInterno.value.activa) this.filtro?.iniciar(nodoId);
  }

async iniciarLevantamientoTramo(origenId: string, destinoId: string): Promise<boolean> {
    return this.iniciarLevantamiento('tramo', origenId, destinoId);
  }

  async iniciarCapturaPunto(nodoId: string): Promise<boolean> {
    return this.iniciarLevantamiento('punto', nodoId, nodoId);
  }

  async finalizarLevantamiento(): Promise<number> {
    const activo = this.estadoInterno.value.levantamiento;
    if (!activo) return 0;

    const fin = Date.now();
    const muestras = activo.tipo === 'tramo'
      ? muestrasDeRecorrido(
          this.observacionesLevantamiento, activo.nivel, activo.origenId, activo.destinoId,
          activo.inicioMs, fin, this.detectorPasos.pasosEntre(activo.inicioMs, fin)
        )
      : muestrasEnNodo(this.observacionesLevantamiento, activo.nivel, activo.origenId);

    this.observacionesLevantamiento = [];
    this.publicar({ levantamiento: null });
    if (!this.estadoInterno.value.activa) await this.detenerCaptura();

    return muestras.length && this.mapaRadio.agregar(muestras) ? muestras.length : 0;
  }

  async cancelarLevantamiento(): Promise<void> {
    this.observacionesLevantamiento = [];
    this.publicar({ levantamiento: null });
    if (!this.estadoInterno.value.activa) await this.detenerCaptura();
  }

  ngOnDestroy(): void {
    void this.detenerCaptura();
    this.suscripciones.unsubscribe();
    this.estadoInterno.complete();
    this.cambiosNivel.complete();
  }

private nodosPrevios = -1;
  private conexionesPrevias = -1;

  private crearGrafo(nivel: number): GrafoNivel {
    const geo = this.geometrias.get(nivel);
    const metraje = crearMetraje(this.nodos, this.conexiones);
    return construirGrafoNivel(
      nivel,
      this.nodos,
      this.conexiones,
      nodo => geo?.nodos[nodo.id] ?? (geo ? null : posicionPlano(nodo)),
      (a, b) => {
        const vivo = geo?.largos[`${a}|${b}`] ?? geo?.largos[`${b}|${a}`];
        if (vivo) return vivo * metraje.factor(nivel);
        const tramo = metraje.tramo(a, b);
        return tramo.aproximado ? tramo.metros : null;
      }
    );
  }

  private modeloDeNivel(nivel: number): ModeloRadio | null {
    if (nivel === this.nivel) return this.modelo;
    if (!this.modelosNivel.has(nivel)) {
      const muestras = this.mapaRadio.muestras(nivel);
      this.modelosNivel.set(
        nivel,
        muestras.length ? construirModeloRadio(this.crearGrafo(nivel), muestras) : null
      );
    }
    return this.modelosNivel.get(nivel) ?? null;
  }

  private calibracion(nivel: number): CalibracionRumbo {
    let c = this.calibraciones.get(nivel);
    if (!c) {
      c = new CalibracionRumbo();
      this.calibraciones.set(nivel, c);
    }
    return c;
  }

  private guardarCalibraciones(): void {
    try {
      const datos = Object.fromEntries(
        [...this.calibraciones].filter(([, c]) => c.lista).map(([nivel, c]) => [nivel, c.exportar()])
      );
      localStorage.setItem(this.claveRumbo, JSON.stringify(datos));
    } catch {
    }
  }

  private evaluarNivel(obs: ObservacionRadio): void {
    if (this.nivel === null || !this.estadoInterno.value.activa) return;
    const ctx = { desfaseDb: this.desfaseDb };
    const niveles = [...new Set(this.nodos.map(n => n.nivel).filter((n): n is number => typeof n === 'number'))];
    const actual = this.modelo ? puntuacionNivel(this.modelo, obs, ctx) : null;

    let mejor: { nivel: number; ll: number } | null = null;
    for (const nivel of niveles) {
      if (nivel === this.nivel) continue;
      const modelo = this.modeloDeNivel(nivel);
      const ll = modelo ? puntuacionNivel(modelo, obs, ctx) : null;
      if (ll !== null && (!mejor || ll > mejor.ll)) mejor = { nivel, ll };
    }

    const supera = !!mejor && (
      actual === null ? mejor.ll > -2.5 : mejor.ll > -6 && mejor.ll - actual > 2.5
    );

    if (!supera || !mejor) {
      this.candidatoNivel = null;
      return;
    }

    this.candidatoNivel = this.candidatoNivel?.nivel === mejor.nivel
      ? { nivel: mejor.nivel, veces: this.candidatoNivel.veces + 1 }
      : { nivel: mejor.nivel, veces: 1 };

    if (this.candidatoNivel.veces >= 2) {
      const nivel = this.candidatoNivel.nivel;
      this.candidatoNivel = null;
      this.cambiosNivel.next(nivel);
    }
  }

  private aplicarBrujula(estimacion: EstimacionWifi | null, velocidadPasos: number | null): void {
    if (!this.filtro || this.nivel === null || !this.rumbo || Date.now() - this.rumbo.t > 1500) return;
    if ((velocidadPasos ?? 0) < 0.4) return;

    const calibracion = this.calibracion(this.nivel);
    if (calibracion.lista) {
      this.filtro.actualizarRumbo((this.rumbo.valor - calibracion.desfase + 360) % 360);
    }

    if (estimacion && estimacion.confianza > 0.7 && estimacion.incertidumbreMetros < 4 && estimacion.anguloPlano !== null) {
      const estabaLista = calibracion.lista;
      calibracion.agregar(this.rumbo.valor, estimacion.anguloPlano);
      if (this.rumbo.absoluto && (calibracion.lista !== estabaLista || calibracion.muestras % 20 === 0)) {
        this.guardarCalibraciones();
      }
    }
  }

  private async iniciarLevantamiento(tipo: 'tramo' | 'punto', origenId: string, destinoId: string): Promise<boolean> {
    if (!this.disponible || this.nivel === null || this.estadoInterno.value.levantamiento) return false;
    this.observacionesLevantamiento = [];
    this.publicar({
      levantamiento: { tipo, nivel: this.nivel, origenId, destinoId, inicioMs: Date.now(), observaciones: 0 }
    });
    await this.iniciarCaptura();
    void this.escanear(true);
    return true;
  }

  private reconstruirModelo(reiniciarFiltro = false): void {
    if (!this.grafo || this.nivel === null) return;

    this.modelo = construirModeloRadio(this.grafo, this.mapaRadio.muestras(this.nivel));

    if (!this.filtro || reiniciarFiltro || this.filtro.grafo !== this.grafo) {
      this.filtro = new FiltroParticulasWifi(this.grafo, this.modelo);
      if (this.estadoInterno.value.activa) this.filtro.iniciar(this.origenId);
    } else {
      this.filtro.actualizarModelo(this.modelo);
    }

    this.filtro.establecerRuta(this.ruta.filter(n => n.nivel === this.nivel).map(n => n.id));

    this.publicar({
      diagnostico: {
        ...this.estadoInterno.value.diagnostico,
        aristas: this.grafo.aristas.length,
        aristasConDatos: this.modelo.aristasConDatos,
        muestras: this.modelo.muestras
      }
    });
  }

  private async iniciarCaptura(): Promise<void> {
    if (this.capturando) return;
    this.capturando = true;
    this.ultimoTick = performance.now();

    try {
      const capacidades = await this.nativo.capabilities();
      this.intervaloEscaneo = capacidades.scanThrottleEnabled ? ESCANEO_LIMITADO_MS : ESCANEO_LIBRE_MS;
      this.publicar({
        diagnostico: { ...this.estadoInterno.value.diagnostico, capacidades, intervaloEscaneoMs: this.intervaloEscaneo, error: null }
      });
    } catch {
      this.intervaloEscaneo = ESCANEO_LIMITADO_MS;
    }

    try {
      await this.nativo.startPassive();
      this.escucha = await this.nativo.addListener('scanResults', datos =>
        this.zona.run(() => this.procesarEscaneo(datos))
      );
    } catch {
      this.escucha = null;
    }

    this.zona.runOutsideAngular(() => {
      this.temporizadores = [
        setInterval(() => this.tick(), TICK_MS),
        setInterval(() => void this.leerConexion(), CONEXION_MS),
        setInterval(() => void this.medirRtt(), RTT_MS),
        setInterval(() => void this.escanear(false), 1000)
      ];
      window.addEventListener('devicemotion', this.alMovimiento);
      window.addEventListener('deviceorientationabsolute', this.alOrientar);
      window.addEventListener('deviceorientation', this.alOrientar);
    });

    void this.leerConexion();
    void this.escanear(true);
  }

  private async detenerCaptura(): Promise<void> {
    if (!this.capturando) return;
    this.capturando = false;
    this.temporizadores.forEach(t => clearInterval(t));
    this.temporizadores = [];
    window.removeEventListener('devicemotion', this.alMovimiento);
    window.removeEventListener('deviceorientationabsolute', this.alOrientar);
    window.removeEventListener('deviceorientation', this.alOrientar);

    try {
      await this.escucha?.remove();
      await this.nativo.stopPassive();
    } catch {
    }
    this.escucha = null;
  }

  private tick(): void {
    const ahora = performance.now();
    const dt = (ahora - this.ultimoTick) / 1000;
    this.ultimoTick = ahora;

    if (!this.estadoInterno.value.activa || !this.filtro) return;

    const propia = this.detectorPasos.velocidad(Date.now());
    const pista = propia !== null
      ? { velocidad: propia }
      : this.pistaVelocidad && Date.now() - this.pistaVelocidad.t < 2500
        ? { velocidad: this.pistaVelocidad.v }
        : {};

    this.filtro.predecir(dt, pista);
    const estimacion = this.filtro.estimar();
    const firme = !!estimacion && estimacion.confianza >= 0.45 && estimacion.incertidumbreMetros <= 7 &&
      this.lecturasRecientes(40000) > 0;

    if (++this.ticks % 4 === 0) {
      this.aplicarBrujula(estimacion, propia);
      const calibracion = this.nivel !== null ? this.calibracion(this.nivel) : null;
      this.publicar({
        diagnostico: {
          ...this.estadoInterno.value.diagnostico,
          acelerometro: propia !== null || this.estadoInterno.value.diagnostico.acelerometro,
          pasos: this.detectorPasos.totalPasos,
          brujula: {
            disponible: !!this.rumbo && Date.now() - this.rumbo.t < 3000,
            lista: !!calibracion?.lista,
            muestras: calibracion?.muestras ?? 0
          },
          geometriaPlano: this.nivel !== null && this.geometrias.has(this.nivel)
        }
      });
    }

    this.zona.run(() => this.publicar({ estimacion, firme }));

    if (firme && estimacion) this.corregirSeguimiento(estimacion);
  }

  private async leerConexion(): Promise<void> {
    if (this.ocupado.conexion) return;
    this.ocupado.conexion = true;
    try {
      const c = await this.nativo.getConnectionInfo();
      this.publicar({ diagnostico: { ...this.estadoInterno.value.diagnostico, conexion: c } });

      if (!c.connected || !c.bssid || !Number.isFinite(c.rssi) || c.rssi! < -100 || c.rssi! >= 0) return;

      const ap = claveAp(c.bssid, c.frequency);
      const anterior = this.ultimaConexion;
      if (anterior && anterior.ap === ap && anterior.rssi === c.rssi && c.timestamp - anterior.t < 3000) return;
      this.ultimaConexion = { ap, rssi: c.rssi!, t: c.timestamp };

      this.observar({ fuente: 'conexion', timestamp: c.timestamp, lecturas: [{ ap, rssi: c.rssi! }] });
    } catch {
    } finally {
      this.ocupado.conexion = false;
    }
  }

  private async escanear(forzar: boolean): Promise<void> {
    if (this.ocupado.escaneo) return;
    const ultimo = this.ultimoEscaneoProcesado;
    if (!forzar && Date.now() - ultimo < this.intervaloEscaneo) return;

    this.ocupado.escaneo = true;
    try {
      const r = await this.nativo.scan({ minIntervalMs: this.intervaloEscaneo - 500, allowCached: true });
      this.zona.run(() => this.procesarEscaneo(r));
    } catch (error) {
      const codigo = typeof error === 'object' && error && 'code' in error ? String(error.code) : 'scan-failed';
      this.publicar({ diagnostico: { ...this.estadoInterno.value.diagnostico, error: codigo } });
    } finally {
      this.ocupado.escaneo = false;
    }
  }

  private procesarEscaneo(r: ResultadoEscaneoNativo): void {
    if (!Array.isArray(r.networks) || !r.networks.length) return;

    const edad = Number.isFinite(r.newestAgeMs) && r.newestAgeMs! >= 0 ? r.newestAgeMs! : 0;
    const instante = r.timestamp - edad;
    if (instante <= this.ultimoEscaneoProcesado + 500) return;
    this.ultimoEscaneoProcesado = instante;

    this.respondedoresRtt = r.networks
      .filter(n => n.rtt && n.ageMs <= 15000)
      .sort((a, b) => b.rssi - a.rssi)
      .map(n => n.bssid);

    const lecturas = normalizarEscaneo(r.networks, 12000);
    if (!lecturas.length) return;

    const obs: ObservacionRadio = { fuente: 'escaneo', timestamp: instante, lecturas };
    this.observar(obs);
    this.evaluarNivel(obs);

    const e = this.estadoInterno.value.estimacion;
    if (e && this.modelo && this.grafo) {
      const indice = this.grafo.aristas.findIndex(a => a.a === e.origenId && a.b === e.destinoId);
      const celda = this.modelo.celdas[indice]?.[Math.round(e.metros)];
      const d = desfaseEscaneo(celda, obs);
      if (d !== null) this.desfaseDb = 0.7 * this.desfaseDb + 0.3 * d;
    }

    this.publicar({ diagnostico: { ...this.estadoInterno.value.diagnostico, puntosRtt: this.respondedoresRtt.length } });
  }

  private async medirRtt(): Promise<void> {
    const c = this.estadoInterno.value.diagnostico.capacidades;
    if (this.ocupado.rtt || !c?.rttAvailable || !this.respondedoresRtt.length) return;

    this.ocupado.rtt = true;
    try {
      const r = await this.nativo.rangeRtt({ bssids: this.respondedoresRtt.slice(0, Math.max(1, c.rttMaxPeers || 10)) });
      const lecturas = r.results
        .filter(m => m.ok && Number.isFinite(m.distanceMm) && (m.successful ?? 1) > 0)
        .map(m => ({
          ap: `r:${m.bssid}`,
          distanciaM: m.distanceMm! / 1000,
          desviacionM: Number.isFinite(m.distanceStdDevMm) ? m.distanceStdDevMm! / 1000 : 1
        }));
      if (lecturas.length) {
        this.zona.run(() => this.observar({ fuente: 'rtt', timestamp: r.timestamp, lecturas }));
      }
    } catch {
    } finally {
      this.ocupado.rtt = false;
    }
  }

  private observar(obs: ObservacionRadio): void {
    const ahora = Date.now();
    this.registro = [...this.registro.filter(r => ahora - r.t < 60000), { fuente: obs.fuente, t: ahora }];

    const levantamiento = this.estadoInterno.value.levantamiento;
    if (levantamiento) {
      this.observacionesLevantamiento.push(obs);
      this.publicar({ levantamiento: { ...levantamiento, observaciones: this.observacionesLevantamiento.length } });
    }

    if (this.estadoInterno.value.activa && this.filtro) {
      this.filtro.actualizar(obs, { desfaseDb: this.desfaseDb });
    }

    const lecturasMinuto = { conexion: 0, escaneo: 0, rtt: 0 };
    for (const r of this.registro) ++lecturasMinuto[r.fuente];

    this.publicar({
      diagnostico: {
        ...this.estadoInterno.value.diagnostico,
        lecturasMinuto,
        desfaseDb: Math.round(this.desfaseDb * 10) / 10,
        calidad: this.filtro?.calidadUltimaLectura ?? 0
      }
    });
  }

  private lecturasRecientes(ms: number): number {
    const ahora = Date.now();
    return this.registro.filter(r => ahora - r.t < ms).length;
  }

  private corregirSeguimiento(e: EstimacionWifi): void {
    const s = this.seguimiento.obtenerEstado();
    if (s.fase !== 'siguiendo' || Date.now() - this.ultimaCorreccionRuta < 8000 || e.incertidumbreMetros > 4) return;

    const indice = this.ruta.findIndex((n, i) => {
      const siguiente = this.ruta[i + 1];
      return siguiente && (
        (n.id === e.origenId && siguiente.id === e.destinoId) ||
        (n.id === e.destinoId && siguiente.id === e.origenId)
      );
    });
    if (indice < 0) return;

    const fraccion = this.ruta[indice].id === e.origenId ? e.fraccion : 1 - e.fraccion;
    const mismoTramo = s.origenTramoId === this.ruta[indice].id;
    const diferencia = mismoTramo ? Math.abs(s.fraccionTramo - fraccion) * e.largo : Infinity;
    if (diferencia < 3) return;

    if (this.seguimiento.corregirTramo(indice, fraccion)) {
      this.ultimaCorreccionRuta = Date.now();
    }
  }

  private publicar(cambios: Partial<EstadoNavegacionWifi>): void {
    if (this.estadoInterno.closed) return;
    this.estadoInterno.next({ ...this.estadoInterno.value, ...cambios });
  }

  private diagnosticoVacio(): DiagnosticoWifi {
    return {
      capacidades: null,
      conexion: null,
      lecturasMinuto: { conexion: 0, escaneo: 0, rtt: 0 },
      puntosRtt: 0,
      desfaseDb: 0,
      intervaloEscaneoMs: ESCANEO_LIMITADO_MS,
      aristas: 0,
      aristasConDatos: 0,
      muestras: 0,
      calidad: 0,
      acelerometro: false,
      pasos: 0,
      brujula: { disponible: false, lista: false, muestras: 0 },
      geometriaPlano: false,
      error: null
    };
  }
}
