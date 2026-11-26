import { Conexion, Nodo } from '../models/nodo.model';
import { HuellaWifi } from '../data/referencias-wifi.data';

export type FuenteRadio = 'escaneo' | 'conexion' | 'rtt';

export interface LecturaRadio {
  ap: string;
  rssi?: number;
  distanciaM?: number;
  desviacionM?: number;
}

export interface ObservacionRadio {
  fuente: FuenteRadio;
  timestamp: number;
  lecturas: LecturaRadio[];
}

export interface MuestraRadio extends ObservacionRadio {
  nivel: number;
  origenId: string;
  destinoId: string;
  fraccion: number;
}

export interface MapaRadio {
  version: 1;
  actualizado: string;
  muestras: MuestraRadio[];
}

export interface Punto {
  x: number;
  y: number;
}

const BSSID = /^(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$/i;

export function bssidValido(bssid: string | null | undefined): bssid is string {
  return typeof bssid === 'string' && BSSID.test(bssid) &&
    bssid !== '00:00:00:00:00:00' && bssid !== '02:00:00:00:00:00';
}

export function bandaWifi(frecuenciaMhz: number | null | undefined): '2' | '5' | '6' {
  const f = Number(frecuenciaMhz);
  return !Number.isFinite(f) || f < 3000 ? '2' : f < 5925 ? '5' : '6';
}

export function claveAp(bssid: string, frecuenciaMhz?: number | null): string {
  const octetos = bssid.toLowerCase().split(':');
  return `${bandaWifi(frecuenciaMhz)}:${octetos.slice(1).join(':')}`;
}

export function frecuenciaDesdeCanal(canal: string): number | null {
  const numero = Number(/^\d+/.exec(canal)?.[0]);
  if (!Number.isFinite(numero) || numero <= 0) return null;
  if (numero === 14) return 2484;
  if (numero <= 13) return 2407 + numero * 5;
  if (numero >= 32 && numero <= 177) return 5000 + numero * 5;
  return null;
}

export function normalizarEscaneo(
  redes: readonly { bssid: string; rssi: number; frequency: number; ageMs?: number }[],
  edadMaximaMs = 12000
): LecturaRadio[] {
  const porAp = new Map<string, number>();

  for (const red of redes) {
    if (
      !bssidValido(red.bssid) ||
      !Number.isFinite(red.rssi) ||
      red.rssi < -100 ||
      red.rssi > 0 ||
      (red.ageMs !== undefined && (!Number.isFinite(red.ageMs) || red.ageMs > edadMaximaMs))
    ) {
      continue;
    }

    const ap = claveAp(red.bssid, red.frequency);
    porAp.set(ap, Math.max(porAp.get(ap) ?? -Infinity, red.rssi));
  }

  return [...porAp].map(([ap, rssi]) => ({ ap, rssi }));
}

export function muestrasDesdeHuellas(
  huellas: readonly HuellaWifi[],
  nivelDe: (nodoId: string) => number | null
): MuestraRadio[] {
  return huellas.flatMap(huella => {
    if (huella.nodoIds.length !== 1) return [];
    const nodoId = huella.nodoIds[0];
    const nivel = nivelDe(nodoId);
    if (nivel === null) return [];

    const lecturas = normalizarEscaneo(
      huella.lecturas
        .filter(l => l.usarParaComparar !== false && !l.aproximada && bssidValido(l.bssid) && Number.isFinite(l.rssi))
        .map(l => ({
          bssid: l.bssid!,
          rssi: l.rssi,
          frequency: l.frecuenciaMhz ?? frecuenciaDesdeCanal(l.canal) ?? 2437
        }))
    );

    return lecturas.length >= 2
      ? [{
          nivel,
          origenId: nodoId,
          destinoId: nodoId,
          fraccion: 0,
          fuente: 'escaneo' as const,
          timestamp: 0,
          lecturas
        }]
      : [];
  });
}

export function muestrasDeRecorrido(
  observaciones: readonly ObservacionRadio[],
  nivel: number,
  origenId: string,
  destinoId: string,
  inicioMs: number,
  finMs: number,
  pasosMs: readonly number[] = []
): MuestraRadio[] {
  const duracion = finMs - inicioMs;
  if (!(duracion > 0) || origenId === destinoId) return [];

  return observaciones
    .filter(o => o.timestamp >= inicioMs && o.timestamp <= finMs && o.lecturas.length > 0)
    .map(o => ({
      ...o,
      lecturas: o.lecturas.map(l => ({ ...l })),
      nivel,
      origenId,
      destinoId,
      fraccion: fraccionRecorrido(o.timestamp, inicioMs, finMs, pasosMs)
    }));
}

export function fraccionRecorrido(
  t: number,
  inicioMs: number,
  finMs: number,
  pasosMs: readonly number[] = []
): number {
  const pasos = pasosMs.filter(p => p > inicioMs && p < finMs).sort((a, b) => a - b);

  if (pasos.length < 6) {
    return Math.min(1, Math.max(0, (t - inicioMs) / (finMs - inicioMs)));
  }

  const hitos = [inicioMs, ...pasos, finMs];
  const valores = [0, ...pasos.map((_, i) => i + 0.5), pasos.length + 1];
  const total = valores[valores.length - 1];

  for (let i = 1; i < hitos.length; ++i) {
    if (t <= hitos[i]) {
      const u = hitos[i] > hitos[i - 1] ? (t - hitos[i - 1]) / (hitos[i] - hitos[i - 1]) : 1;
      return Math.min(1, Math.max(0, (valores[i - 1] + u * (valores[i] - valores[i - 1])) / total));
    }
  }
  return 1;
}

export function muestrasEnNodo(
  observaciones: readonly ObservacionRadio[],
  nivel: number,
  nodoId: string
): MuestraRadio[] {
  return observaciones
    .filter(o => o.lecturas.length > 0)
    .map(o => ({
      ...o,
      lecturas: o.lecturas.map(l => ({ ...l })),
      nivel,
      origenId: nodoId,
      destinoId: nodoId,
      fraccion: 0
    }));
}

export function mapaRadioValido(valor: unknown): valor is MapaRadio {
  if (!valor || typeof valor !== 'object') return false;
  const m = valor as Partial<MapaRadio>;
  return m.version === 1 && Array.isArray(m.muestras) && m.muestras.every(muestraValida);
}

export function muestraValida(valor: unknown): valor is MuestraRadio {
  if (!valor || typeof valor !== 'object') return false;
  const m = valor as Partial<MuestraRadio>;
  return (
    typeof m.nivel === 'number' &&
    typeof m.origenId === 'string' &&
    typeof m.destinoId === 'string' &&
    typeof m.fraccion === 'number' && m.fraccion >= 0 && m.fraccion <= 1 &&
    (m.fuente === 'escaneo' || m.fuente === 'conexion' || m.fuente === 'rtt') &&
    typeof m.timestamp === 'number' &&
    Array.isArray(m.lecturas) &&
    m.lecturas.every(l =>
      l && typeof l.ap === 'string' &&
      (l.rssi === undefined || (Number.isFinite(l.rssi) && l.rssi <= 0 && l.rssi >= -120)) &&
      (l.distanciaM === undefined || (Number.isFinite(l.distanciaM) && l.distanciaM >= -5 && l.distanciaM < 500))
    )
  );
}

export interface AristaGrafo {
  indice: number;
  a: string;
  b: string;
  largo: number;
  medida: boolean;
  pa: Punto | null;
  pb: Punto | null;
}

export interface GrafoNivel {
  nivel: number;
  aristas: AristaGrafo[];
  incidentes: Map<string, number[]>;
  largoTotal: number;
}

const LARGO_POR_DEFECTO_M = 8;

export function construirGrafoNivel(
  nivel: number,
  nodos: readonly Nodo[],
  conexiones: readonly Conexion[],
  posicion: (nodo: Nodo) => Punto | null,
  largoPlano: (a: string, b: string) => number | null = () => null
): GrafoNivel {
  const enNivel = new Map(
    nodos.filter(n => n.nivel === nivel && !n.restringido).map(n => [n.id, n])
  );

  const vistas = new Set<string>();
  const candidatas = conexiones.filter(c => {
    const clave = [c.origen, c.destino].sort().join('|');
    if (
      vistas.has(clave) ||
      c.origen === c.destino ||
      c.habilitada === false ||
      c.restringida === true ||
      c.tipo === 'ascensor' ||
      !enNivel.has(c.origen) ||
      !enNivel.has(c.destino)
    ) {
      return false;
    }
    vistas.add(clave);
    return true;
  });

  const puntos = new Map<string, Punto | null>(
    [...enNivel.values()].map(n => [n.id, posicion(n)])
  );

  const planar = (c: Conexion): number | null => {
    const pa = puntos.get(c.origen);
    const pb = puntos.get(c.destino);
    const d = pa && pb ? Math.hypot(pb.x - pa.x, pb.y - pa.y) : null;
    return d && d > 1e-6 ? d : null;
  };

  const razones = candidatas
    .map(c => {
      const p = planar(c);
      return p && !c.estimada && typeof c.distancia === 'number' && c.distancia > 0 ? c.distancia / p : null;
    })
    .filter((r): r is number => r !== null)
    .sort((x, y) => x - y);

  const escala = razones.length ? razones[Math.floor(razones.length / 2)] : null;

  const aristas: AristaGrafo[] = candidatas.map((c, indice) => {
    const medida = typeof c.distancia === 'number' && Number.isFinite(c.distancia) && c.distancia > 0;
    const p = planar(c);
    const dibujado = largoPlano(c.origen, c.destino);
    const largo = medida
      ? c.distancia!
      : dibujado && Number.isFinite(dibujado) && dibujado > 0
        ? dibujado
        : p && escala
          ? p * escala
          : LARGO_POR_DEFECTO_M;

    return {
      indice,
      a: c.origen,
      b: c.destino,
      largo: Math.max(0.5, largo),
      medida: medida && !c.estimada,
      pa: puntos.get(c.origen) ?? null,
      pb: puntos.get(c.destino) ?? null
    };
  });

  const incidentes = new Map<string, number[]>();
  for (const arista of aristas) {
    for (const id of [arista.a, arista.b]) {
      const lista = incidentes.get(id) ?? [];
      lista.push(arista.indice);
      incidentes.set(id, lista);
    }
  }

  return {
    nivel,
    aristas,
    incidentes,
    largoTotal: aristas.reduce((s, a) => s + a.largo, 0)
  };
}

interface ReferenciaAp {
  rssi: number | null;
  distancia: number | null;
  presencia: number;
}

interface CeldaFuente {
  peso: number;
  aps: Map<string, ReferenciaAp>;
}

type Celda = Partial<Record<FuenteRadio, CeldaFuente>>;

export interface ModeloRadio {
  celdas: Celda[][];
  muestras: number;
  aristasConDatos: number;
}

const SIGMA_KERNEL_M = 1.6;
const ALCANCE_KERNEL_M = 4.5;
const PESO_MINIMO = 0.08;

export function construirModeloRadio(
  grafo: GrafoNivel,
  muestras: readonly MuestraRadio[]
): ModeloRadio {
  const porArista: { s: number; m: MuestraRadio }[][] = grafo.aristas.map(() => []);
  const recorridas = new Set<number>();
  let usadas = 0;

  for (const m of muestras) {
    if (m.nivel !== grafo.nivel) continue;
    let usada = false;

    if (m.origenId === m.destinoId) {
      for (const i of grafo.incidentes.get(m.origenId) ?? []) {
        const a = grafo.aristas[i];
        porArista[i].push({ s: a.a === m.origenId ? 0 : a.largo, m });
        usada = true;
      }
    } else {
      const arista = grafo.aristas.find(
        a => (a.a === m.origenId && a.b === m.destinoId) || (a.a === m.destinoId && a.b === m.origenId)
      );
      if (arista) {
        const f = arista.a === m.origenId ? m.fraccion : 1 - m.fraccion;
        porArista[arista.indice].push({ s: f * arista.largo, m });
        recorridas.add(arista.indice);
        usada = true;

        for (const [nodo, distancia] of [[arista.a, f * arista.largo], [arista.b, (1 - f) * arista.largo]] as const) {
          if (distancia > ALCANCE_KERNEL_M) continue;
          for (const j of grafo.incidentes.get(nodo) ?? []) {
            if (j === arista.indice) continue;
            const vecina = grafo.aristas[j];
            porArista[j].push({ s: vecina.a === nodo ? -distancia : vecina.largo + distancia, m });
          }
        }
      }
    }

    if (usada) ++usadas;
  }

  const celdas = grafo.aristas.map((arista, i) => {
    const lista = porArista[i];
    const n = Math.max(1, Math.round(arista.largo) + 1);

    return Array.from({ length: n }, (_, k): Celda => {
      const s = Math.min(arista.largo, k);
      const celda: Celda = {};

      const acumulado: Partial<Record<FuenteRadio, {
        peso: number;
        aps: Map<string, { rssi: number; prssi: number; dist: number; pdist: number; pres: number }>;
      }>> = {};

      for (const { s: sm, m } of lista) {
        const d = Math.abs(sm - s);
        if (d > ALCANCE_KERNEL_M) continue;
        const w = Math.exp(-(d * d) / (2 * SIGMA_KERNEL_M * SIGMA_KERNEL_M));
        const acc = acumulado[m.fuente] ??= { peso: 0, aps: new Map() };
        acc.peso += w;

        for (const l of m.lecturas) {
          const ap = acc.aps.get(l.ap) ?? { rssi: 0, prssi: 0, dist: 0, pdist: 0, pres: 0 };
          ap.pres += w;
          if (Number.isFinite(l.rssi)) { ap.rssi += w * l.rssi!; ap.prssi += w; }
          if (Number.isFinite(l.distanciaM)) { ap.dist += w * l.distanciaM!; ap.pdist += w; }
          acc.aps.set(l.ap, ap);
        }
      }

      for (const fuente of Object.keys(acumulado) as FuenteRadio[]) {
        const acc = acumulado[fuente]!;
        if (acc.peso < PESO_MINIMO) continue;
        celda[fuente] = {
          peso: acc.peso,
          aps: new Map([...acc.aps].map(([ap, v]) => [ap, {
            rssi: v.prssi > 0 ? v.rssi / v.prssi : null,
            distancia: v.pdist > 0 ? v.dist / v.pdist : null,
            presencia: Math.min(1, v.pres / acc.peso)
          }]))
        };
      }

      return celda;
    });
  });

  return { celdas, muestras: usadas, aristasConDatos: recorridas.size };
}

const LL_NEUTRO: Record<FuenteRadio, number> = { escaneo: -3.2, conexion: -1.6, rtt: -3 };
const RSSI_AUSENTE = -93;

function mediana(valores: number[]): number {
  const v = [...valores].sort((a, b) => a - b);
  return v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
}

export interface ContextoVerosimilitud {
  desfaseDb: number;
}

export function verosimilitudCelda(
  celda: Celda | undefined,
  obs: ObservacionRadio,
  ctx: ContextoVerosimilitud
): number {
  if (!celda) return LL_NEUTRO[obs.fuente];

  if (obs.fuente === 'escaneo') {
    const ref = celda.escaneo;
    if (!ref) return LL_NEUTRO.escaneo;

    const observadas = new Map(
      obs.lecturas.filter(l => Number.isFinite(l.rssi)).map(l => [l.ap, l.rssi!])
    );

    const diferencias: number[] = [];
    for (const [ap, r] of ref.aps) {
      const o = observadas.get(ap);
      if (o !== undefined && r.rssi !== null) diferencias.push(o - r.rssi);
    }

    const desfase = diferencias.length >= 3
      ? Math.max(-12, Math.min(12, mediana(diferencias)))
      : ctx.desfaseDb;

    const sigma = 6;
    let suma = 0;
    let pesos = 0;

    for (const [ap, r] of ref.aps) {
      if (r.rssi === null) continue;
      const esperado = r.rssi + desfase;
      const o = observadas.get(ap);

      if (o !== undefined) {
        const e = o - esperado;
        suma += e * e;
        pesos += 1;
      } else if (esperado > -80 && r.presencia >= 0.5) {
        const e = Math.min(20, esperado - RSSI_AUSENTE);
        suma += r.presencia * e * e * 0.6;
        pesos += r.presencia;
      }
    }

    for (const [ap, o] of observadas) {
      if (ref.aps.has(ap)) continue;
      const corregido = o - desfase;
      if (corregido > -72) {
        const e = Math.min(20, corregido - RSSI_AUSENTE);
        suma += 0.5 * e * e * 0.6;
        pesos += 0.5;
      }
    }

    if (pesos === 0) return LL_NEUTRO.escaneo;
    return -(suma / pesos) / (2 * sigma * sigma) * Math.min(pesos, 7);
  }

  if (obs.fuente === 'conexion') {
    const lectura = obs.lecturas[0];
    if (!lectura || !Number.isFinite(lectura.rssi)) return 0;

    const ref = celda.conexion?.aps.get(lectura.ap) ?? celda.escaneo?.aps.get(lectura.ap);
    const hayDatos = !!(celda.conexion || celda.escaneo);

    if (!ref || ref.rssi === null) {
      return hayDatos ? -4.5 : LL_NEUTRO.conexion;
    }

    const sigma = 5;
    const e = lectura.rssi! - ctx.desfaseDb - ref.rssi;
    return -(e * e) / (2 * sigma * sigma);
  }

  const ref = celda.rtt;
  if (!ref) return LL_NEUTRO.rtt;

  let suma = 0;
  let n = 0;

  for (const l of obs.lecturas) {
    if (!Number.isFinite(l.distanciaM)) continue;
    const r = ref.aps.get(l.ap);
    if (!r || r.distancia === null) continue;
    const sigma = Math.max(1, (l.desviacionM ?? 1) + 0.8);
    const e = (l.distanciaM! - r.distancia) / sigma;
    suma += e * e;
    ++n;
  }

  if (!n) return LL_NEUTRO.rtt;
  return -(suma / n) / 2 * Math.min(n, 5);
}

export function desfaseEscaneo(celda: Celda | undefined, obs: ObservacionRadio): number | null {
  if (obs.fuente !== 'escaneo' || !celda?.escaneo) return null;
  const diferencias: number[] = [];
  for (const l of obs.lecturas) {
    const r = celda.escaneo.aps.get(l.ap);
    if (r && r.rssi !== null && Number.isFinite(l.rssi)) diferencias.push(l.rssi! - r.rssi);
  }
  return diferencias.length >= 3 ? Math.max(-12, Math.min(12, mediana(diferencias))) : null;
}

export function puntuacionNivel(
  modelo: ModeloRadio,
  obs: ObservacionRadio,
  ctx: ContextoVerosimilitud
): number | null {
  if (obs.fuente !== 'escaneo') return null;
  let mejor: number | null = null;
  for (const celdas of modelo.celdas) {
    for (const celda of celdas) {
      if (!celda.escaneo) continue;
      const ll = verosimilitudCelda(celda, obs, ctx);
      if (mejor === null || ll > mejor) mejor = ll;
    }
  }
  return mejor;
}

export function anguloArista(arista: AristaGrafo, sentido: 1 | -1): number | null {
  if (!arista.pa || !arista.pb) return null;
  const dx = arista.pb.x - arista.pa.x;
  const dy = arista.pb.y - arista.pa.y;
  if (Math.hypot(dx, dy) < 1e-9) return null;
  const angulo = (Math.atan2(dx, -dy) * 180) / Math.PI + (sentido === -1 ? 180 : 0);
  return ((angulo % 360) + 360) % 360;
}

export function diferenciaAngular(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}

export class CalibracionRumbo {
  private sx = 0;
  private sy = 0;
  private n = 0;

  get lista(): boolean {
    return this.n >= 8 && this.concentracion >= 0.6;
  }

  get muestras(): number {
    return this.n;
  }

  get concentracion(): number {
    const peso = Math.min(this.n, 40);
    return peso ? Math.hypot(this.sx, this.sy) / peso : 0;
  }

  get desfase(): number {
    return ((Math.atan2(this.sy, this.sx) * 180) / Math.PI + 360) % 360;
  }

  agregar(rumbo: number, anguloPlano: number): void {
    const d = ((rumbo - anguloPlano) * Math.PI) / 180;
    const factor = this.n >= 40 ? 39 / 40 : 1;
    this.sx = this.sx * factor + Math.cos(d);
    this.sy = this.sy * factor + Math.sin(d);
    this.n = Math.min(this.n + 1, 1000);
  }

  reiniciar(): void {
    this.sx = 0;
    this.sy = 0;
    this.n = 0;
  }

  exportar(): { sx: number; sy: number; n: number } {
    return { sx: this.sx, sy: this.sy, n: this.n };
  }

  importar(datos: { sx: number; sy: number; n: number }, pesoMaximo = 12): void {
    if (![datos?.sx, datos?.sy, datos?.n].every(Number.isFinite) || datos.n <= 0) return;
    const peso = Math.min(datos.n, pesoMaximo);
    const escala = peso / Math.min(datos.n, 40);
    this.sx = datos.sx * escala;
    this.sy = datos.sy * escala;
    this.n = peso;
  }
}

export class DetectorPasos {
  private suave: number | null = null;
  private media: number | null = null;
  private ultimoT: number | null = null;
  private enPico = false;
  private inicioPico = 0;
  private maximoPico = 0;
  private pasos: number[] = [];

  constructor(private readonly largoPasoM = 0.7) {}

  get totalPasos(): number {
    return this.conteo;
  }

  private conteo = 0;

  procesar(magnitud: number, t: number): boolean {
    if (!Number.isFinite(magnitud) || !Number.isFinite(t)) return false;

    if (this.ultimoT === null || t <= this.ultimoT || t - this.ultimoT > 500) {
      this.suave = magnitud;
      this.media = magnitud;
      this.ultimoT = t;
      this.enPico = false;
      return false;
    }

    const dt = t - this.ultimoT;
    this.ultimoT = t;
    this.suave! += (1 - Math.exp(-dt / 40)) * (magnitud - this.suave!);
    this.media! += (1 - Math.exp(-dt / 800)) * (this.suave! - this.media!);
    const oscilacion = this.suave! - this.media!;

    if (!this.enPico) {
      if (oscilacion >= 1) {
        this.enPico = true;
        this.inicioPico = t;
        this.maximoPico = oscilacion;
      }
      return false;
    }

    this.maximoPico = Math.max(this.maximoPico, oscilacion);

    if (t - this.inicioPico > 650 || this.maximoPico > 9) {
      this.enPico = false;
      return false;
    }

    if (oscilacion > -0.3) return false;
    this.enPico = false;

    const anterior = this.pasos.at(-1);
    if (anterior !== undefined && this.inicioPico - anterior < 280) return false;

    this.pasos = [...this.pasos.slice(-7), this.inicioPico];
    this.historial = [...this.historial.filter(p => this.inicioPico - p < 600000), this.inicioPico];
    ++this.conteo;
    return true;
  }

  private historial: number[] = [];

  pasosEntre(t0: number, t1: number): number[] {
    return this.historial.filter(p => p >= t0 && p <= t1);
  }

  velocidad(t: number): number | null {
    if (this.ultimoT === null || t - this.ultimoT > 1500) return null;

    const ultimo = this.pasos.at(-1);
    const recientes = this.pasos.filter(p => t - p <= 4000);
    if (ultimo === undefined || t - ultimo > 1600 || recientes.length < 2) return 0;

    const intervalos = recientes.slice(1).map((p, i) => p - recientes[i]).sort((a, b) => a - b);
    const intervalo = intervalos[Math.floor(intervalos.length / 2)];
    return intervalo > 0 ? Math.min(2, (this.largoPasoM * 1000) / intervalo) : 0;
  }
}

interface Particula {
  arista: number;
  s: number;
  sentido: 1 | -1;
  v: number;
  escala: number;
  lw: number;
}

export interface EstimacionWifi {
  nivel: number;
  origenId: string;
  destinoId: string;
  fraccion: number;
  metros: number;
  largo: number;
  punto: Punto | null;
  incertidumbreMetros: number;
  confianza: number;
  velocidad: number;
  anguloPlano: number | null;
  timestamp: number;
}

export interface OpcionesFiltro {
  particulas?: number;
  aleatorio?: () => number;
  velocidadMaxima?: number;
}

export interface PistaMovimiento {
  velocidad?: number | null;
}

export class FiltroParticulasWifi {
  private particulas: Particula[] = [];
  private readonly n: number;
  private readonly rnd: () => number;
  private readonly vMax: number;
  private aristasRuta = new Set<number>();
  private ultimaVerosimilitud = 0;

  constructor(
    readonly grafo: GrafoNivel,
    private modelo: ModeloRadio,
    opciones: OpcionesFiltro = {}
  ) {
    this.n = opciones.particulas ?? 800;
    this.rnd = opciones.aleatorio ?? Math.random;
    this.vMax = opciones.velocidadMaxima ?? 1.9;
  }

  get iniciado(): boolean {
    return this.particulas.length > 0;
  }

  get calidadUltimaLectura(): number {
    return this.ultimaVerosimilitud;
  }

  actualizarModelo(modelo: ModeloRadio): void {
    this.modelo = modelo;
  }

  establecerRuta(nodoIds: readonly string[]): void {
    this.aristasRuta = new Set(
      nodoIds.slice(1).flatMap((id, i) => {
        const previo = nodoIds[i];
        const arista = this.grafo.aristas.find(
          a => (a.a === previo && a.b === id) || (a.b === previo && a.a === id)
        );
        return arista ? [arista.indice] : [];
      })
    );
  }

  iniciar(nodoId?: string | null): void {
    const aristas = this.grafo.aristas;
    if (!aristas.length) {
      this.particulas = [];
      return;
    }

    const cerca = nodoId ? this.grafo.incidentes.get(nodoId) ?? [] : [];
    this.particulas = Array.from({ length: this.n }, () =>
      cerca.length
        ? this.particulaEnNodo(nodoId!, cerca[Math.floor(this.rnd() * cerca.length)], 2.5)
        : this.particulaUniforme()
    );
  }

  predecir(dt: number, pista: PistaMovimiento = {}): void {
    if (!this.particulas.length || !(dt > 0)) return;
    const paso = Math.min(dt, 2);
    const raiz = Math.sqrt(paso);

    for (const p of this.particulas) {
      if (this.rnd() < 0.06 * paso) {
        p.v = p.v > 0.3 ? 0 : 0.9 + this.rnd() * 0.6;
      }
      p.v += this.normal() * 0.35 * raiz;

      if (Number.isFinite(pista.velocidad)) {
        p.v = 0.5 * p.v + 0.5 * (pista.velocidad! * p.escala + this.normal() * 0.25);
      }

      p.v = Math.max(0, Math.min(this.vMax, p.v));

      if (this.rnd() < 0.015 * paso) {
        p.sentido = p.sentido === 1 ? -1 : 1;
      }

      p.s += p.sentido * p.v * paso + this.normal() * 0.12 * raiz;
      this.transitar(p);
    }
  }

  actualizar(obs: ObservacionRadio, ctx: ContextoVerosimilitud): void {
    if (!this.particulas.length || !obs.lecturas.length) return;

    let maximo = -Infinity;
    const cache = new Map<string, number>();

    for (const p of this.particulas) {
      const k = this.indiceCelda(p);
      const clave = `${p.arista}:${k}`;
      let ll = cache.get(clave);
      if (ll === undefined) {
        ll = verosimilitudCelda(this.modelo.celdas[p.arista]?.[k], obs, ctx);
        cache.set(clave, ll);
      }
      p.lw += ll;
      maximo = Math.max(maximo, ll);
    }

    this.ultimaVerosimilitud = maximo;
    this.normalizar();

    if (maximo < -9) {
      this.reinyectar(0.15);
    }

    if (this.tamanoEfectivo() < this.n * 0.5) {
      this.remuestrear();
    }
  }

  actualizarRumbo(rumboPlano: number, sigmaGrados = 40): void {
    if (!this.particulas.length || !Number.isFinite(rumboPlano)) return;
    const dosSigma2 = 2 * sigmaGrados * sigmaGrados;
    const penalizacionSinDato = -(45 * 45) / dosSigma2;

    for (const p of this.particulas) {
      const angulo = anguloArista(this.grafo.aristas[p.arista], p.sentido);
      if (angulo === null || p.v < 0.3) {
        p.lw += p.v < 0.3 ? -(60 * 60) / dosSigma2 : penalizacionSinDato;
        continue;
      }
      const d = diferenciaAngular(rumboPlano, angulo);
      p.lw += -(d * d) / dosSigma2;
    }

    this.normalizar();
    if (this.tamanoEfectivo() < this.n * 0.5) this.remuestrear();
  }

  estimar(timestamp = Date.now()): EstimacionWifi | null {
    if (!this.particulas.length) return null;

    const pesos = this.particulas.map(p => Math.exp(p.lw));
    const total = pesos.reduce((a, b) => a + b, 0) || 1;
    const porArista = new Map<number, number>();

    this.particulas.forEach((p, i) =>
      porArista.set(p.arista, (porArista.get(p.arista) ?? 0) + pesos[i])
    );

    let mejor = -1;
    let mejorPeso = -1;
    for (const [i, w] of porArista) {
      if (w > mejorPeso) { mejor = i; mejorPeso = w; }
    }

    const arista = this.grafo.aristas[mejor];
    let ws = 0;
    let s = 0;
    let s2 = 0;
    let vel = 0;

    this.particulas.forEach((p, i) => {
      if (p.arista !== mejor) return;
      ws += pesos[i];
      s += pesos[i] * p.s;
      s2 += pesos[i] * p.s * p.s;
      vel += pesos[i] * p.v * p.sentido;
    });

    const media = s / ws;
    const varianza = Math.max(0, s2 / ws - media * media);
    const confianza = mejorPeso / total;
    const metros = Math.max(0, Math.min(arista.largo, media));
    const f = metros / arista.largo;

    return {
      nivel: this.grafo.nivel,
      origenId: arista.a,
      destinoId: arista.b,
      fraccion: f,
      metros,
      largo: arista.largo,
      punto: arista.pa && arista.pb
        ? { x: arista.pa.x + (arista.pb.x - arista.pa.x) * f, y: arista.pa.y + (arista.pb.y - arista.pa.y) * f }
        : null,
      incertidumbreMetros: Math.sqrt(varianza) + (1 - confianza) * 8,
      confianza,
      velocidad: vel / ws,
      anguloPlano: Math.abs(vel / ws) >= 0.3 ? anguloArista(arista, vel >= 0 ? 1 : -1) : null,
      timestamp
    };
  }

private indiceCelda(p: Particula): number {
    const celdas = this.modelo.celdas[p.arista];
    if (!celdas?.length) return 0;
    return Math.max(0, Math.min(celdas.length - 1, Math.round(p.s)));
  }

  private transitar(p: Particula): void {
    for (let vueltas = 0; vueltas < 6; ++vueltas) {
      const arista = this.grafo.aristas[p.arista];
      if (p.s >= 0 && p.s <= arista.largo) return;

      const enB = p.s > arista.largo;
      const nodo = enB ? arista.b : arista.a;
      const exceso = enB ? p.s - arista.largo : -p.s;
      const opciones = (this.grafo.incidentes.get(nodo) ?? []).filter(i => i !== p.arista);

      if (!opciones.length) {
        p.sentido = enB ? -1 : 1;
        p.s = enB ? arista.largo - exceso : exceso;
        continue;
      }

      const pesos = opciones.map(i => (this.aristasRuta.has(i) ? 3 : 1));
      let r = this.rnd() * pesos.reduce((a, b) => a + b, 0);
      let elegida = opciones[opciones.length - 1];
      for (let k = 0; k < opciones.length; ++k) {
        r -= pesos[k];
        if (r <= 0) { elegida = opciones[k]; break; }
      }

      const siguiente = this.grafo.aristas[elegida];
      p.arista = elegida;
      if (siguiente.a === nodo) {
        p.s = exceso;
        p.sentido = 1;
      } else {
        p.s = siguiente.largo - exceso;
        p.sentido = -1;
      }
    }

    const arista = this.grafo.aristas[p.arista];
    p.s = Math.max(0, Math.min(arista.largo, p.s));
  }

  private normalizar(): void {
    const maximo = Math.max(...this.particulas.map(p => p.lw));
    for (const p of this.particulas) p.lw -= maximo;
  }

  private tamanoEfectivo(): number {
    const w = this.particulas.map(p => Math.exp(p.lw));
    const suma = w.reduce((a, b) => a + b, 0);
    const suma2 = w.reduce((a, b) => a + b * b, 0);
    return suma2 > 0 ? (suma * suma) / suma2 : 0;
  }

  private remuestrear(): void {
    const w = this.particulas.map(p => Math.exp(p.lw));
    const suma = w.reduce((a, b) => a + b, 0);
    const paso = suma / this.n;
    let u = this.rnd() * paso;
    let acumulado = w[0];
    let i = 0;
    const nuevas: Particula[] = [];

    for (let k = 0; k < this.n; ++k) {
      while (u > acumulado && i < w.length - 1) {
        acumulado += w[++i];
      }
      const base = this.particulas[i];
      const copia: Particula = {
        ...base,
        s: base.s + this.normal() * 0.35,
        v: Math.max(0, Math.min(this.vMax, base.v + this.normal() * 0.1)),
        escala: Math.max(0.65, Math.min(1.35, base.escala + this.normal() * 0.015)),
        lw: 0
      };
      this.transitar(copia);
      nuevas.push(copia);
      u += paso;
    }

    this.particulas = nuevas;
  }

  private reinyectar(proporcion: number): void {
    const cantidad = Math.floor(this.n * proporcion);
    for (let k = 0; k < cantidad; ++k) {
      const i = Math.floor(this.rnd() * this.particulas.length);
      this.particulas[i] = { ...this.particulaUniforme(), lw: -2 };
    }
  }

  private particulaUniforme(): Particula {
    let r = this.rnd() * this.grafo.largoTotal;
    let arista = this.grafo.aristas[this.grafo.aristas.length - 1];
    for (const a of this.grafo.aristas) {
      if (r <= a.largo) { arista = a; break; }
      r -= a.largo;
    }
    return {
      arista: arista.indice,
      s: Math.min(arista.largo, Math.max(0, r)),
      sentido: this.rnd() < 0.5 ? 1 : -1,
      v: this.rnd() < 0.5 ? 0 : 0.8 + this.rnd() * 0.7,
      escala: 0.85 + this.rnd() * 0.3,
      lw: 0
    };
  }

  private particulaEnNodo(nodoId: string, indice: number, radio: number): Particula {
    const arista = this.grafo.aristas[indice];
    const d = Math.min(arista.largo, this.rnd() * radio);
    const desdeA = arista.a === nodoId;
    return {
      arista: indice,
      s: desdeA ? d : arista.largo - d,
      sentido: desdeA ? 1 : -1,
      v: this.rnd() < 0.5 ? 0 : 0.8 + this.rnd() * 0.7,
      escala: 0.85 + this.rnd() * 0.3,
      lw: 0
    };
  }

  private normal(): number {
    let u = 0;
    let v = 0;
    while (u === 0) u = this.rnd();
    while (v === 0) v = this.rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
}
