import { describe, expect, it } from 'vitest';
import { Conexion, Nodo } from '../models/nodo.model';
import {
  claveAp,
  construirGrafoNivel,
  CalibracionRumbo,
  construirModeloRadio,
  DetectorPasos,
  diferenciaAngular,
  fraccionRecorrido,
  puntuacionNivel,
  FiltroParticulasWifi,
  LecturaRadio,
  MuestraRadio,
  muestrasDeRecorrido,
  muestrasDesdeHuellas,
  normalizarEscaneo,
  ObservacionRadio,
  verosimilitudCelda
} from './localizacion-wifi';
import { HUELLAS_WIFI } from '../data/referencias-wifi.data';

function aleatorio(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rnd: () => number): number {
  return Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd());
}

const NODOS: Nodo[] = [
  { id: 'A', nombre: 'A', x: 0, y: 0, tipo: 'pasillo', nivel: 1 },
  { id: 'B', nombre: 'B', x: 30, y: 0, tipo: 'pasillo', nivel: 1 },
  { id: 'C', nombre: 'C', x: 30, y: 20, tipo: 'pasillo', nivel: 1 },
  { id: 'D', nombre: 'D', x: 50, y: 0, tipo: 'pasillo', nivel: 1 }
];

const CONEXIONES: Conexion[] = [
  { origen: 'A', destino: 'B', distancia: 30 },
  { origen: 'B', destino: 'C', distancia: 20 },
  { origen: 'B', destino: 'D', distancia: 20 }
];

const APS = [
  { bssid: 'dc:9f:db:00:00:01', x: 2, y: 3 },
  { bssid: 'dc:9f:db:00:00:02', x: 16, y: -4 },
  { bssid: 'dc:9f:db:00:00:03', x: 29, y: 4 },
  { bssid: 'dc:9f:db:00:00:04', x: 34, y: 18 },
  { bssid: 'dc:9f:db:00:00:05', x: 48, y: -3 }
];

function sombra(x: number, y: number, i: number): number {
  return 3 * Math.sin(x * 0.37 + i) * Math.cos(y * 0.29 + i * 1.7);
}

function rssiReal(x: number, y: number, i: number): number {
  const ap = APS[i];
  const d = Math.max(1, Math.hypot(ap.x - x, ap.y - y));
  return -32 - 27 * Math.log10(d) + sombra(x, y, i);
}

function escaneo(x: number, y: number, rnd: () => number, ruido: number, desfase: number) {
  return APS.flatMap((ap, i) => {
    const rssi = Math.round(rssiReal(x, y, i) + desfase + normal(rnd) * ruido);
    return rssi > -92 ? [{ bssid: ap.bssid, rssi, frequency: 2437, ageMs: 100 }] : [];
  });
}

class Conectado {
  actual = -1;
  lectura(x: number, y: number, rnd: () => number, ruido: number, desfase: number): LecturaRadio {
    const valores = APS.map((_, i) => rssiReal(x, y, i));
    const mejor = valores.indexOf(Math.max(...valores));
    if (this.actual < 0 || valores[mejor] - valores[this.actual] > 8) this.actual = mejor;
    return {
      ap: claveAp(APS[this.actual].bssid, 2437),
      rssi: Math.round(valores[this.actual] + desfase + normal(rnd) * ruido)
    };
  }
}

function posicionEn(tramo: [Nodo, Nodo], f: number) {
  return {
    x: tramo[0].x + (tramo[1].x - tramo[0].x) * f,
    y: tramo[0].y + (tramo[1].y - tramo[0].y) * f
  };
}

function levantar(rnd: () => number): MuestraRadio[] {
  const muestras: MuestraRadio[] = [];
  let t = 0;

  for (const c of CONEXIONES) {
    for (const [o, d] of [[c.origen, c.destino], [c.destino, c.origen]]) {
      const a = NODOS.find(n => n.id === o)!;
      const b = NODOS.find(n => n.id === d)!;
      const duracion = c.distancia! * 1000;
      const inicio = t;
      const obs: ObservacionRadio[] = [];
      const conectado = new Conectado();

      for (let ms = 0; ms <= duracion; ms += 1000) {
        const p = posicionEn([a, b], ms / duracion);
        obs.push({ fuente: 'conexion', timestamp: inicio + ms, lecturas: [conectado.lectura(p.x, p.y, rnd, 3, 0)] });
        if (ms % 3000 === 0) {
          obs.push({ fuente: 'escaneo', timestamp: inicio + ms, lecturas: normalizarEscaneo(escaneo(p.x, p.y, rnd, 3, 0)) });
        }
      }

      muestras.push(...muestrasDeRecorrido(obs, 1, o, d, inicio, inicio + duracion));
      t += duracion + 5000;
    }
  }

  return muestras;
}

function crearFiltro(semilla: number) {
  const rnd = aleatorio(semilla);
  const grafo = construirGrafoNivel(1, NODOS, CONEXIONES, n => ({ x: n.x, y: n.y }));
  const modelo = construirModeloRadio(grafo, levantar(rnd));
  const filtro = new FiltroParticulasWifi(grafo, modelo, { particulas: 500, aleatorio: rnd });
  return { rnd, grafo, modelo, filtro };
}

function caminar(opciones: {
  semilla: number;
  desfase: number;
  ruido: number;
  escaneoCadaS: number;
  conexion: boolean;
  origenConocido: boolean;
  pasos?: boolean;
  pausa?: boolean;
  brujula?: boolean;
}) {
  const calibracion = new CalibracionRumbo();
  const { rnd, filtro } = crearFiltro(opciones.semilla);
  filtro.iniciar(opciones.origenConocido ? 'A' : null);
  filtro.establecerRuta(['A', 'B', 'C']);

  const [A, B, C] = ['A', 'B', 'C'].map(id => NODOS.find(n => n.id === id)!);
  const velocidad = 1.2;
  const pausaS = opciones.pausa ? 10 : 0;
  const inicioPausa = 15 / velocidad;
  const total = (30 + 20) / velocidad + pausaS;
  const recorridoEn = (t: number) =>
    t < inicioPausa ? t * velocidad : t < inicioPausa + pausaS ? 15 : (t - pausaS) * velocidad;
  const conectado = new Conectado();
  const errores: number[] = [];
  const avance: number[] = [];
  let desfase = 0;

  for (let t = 0; t <= total; t += 0.25) {
    const d = recorridoEn(t);
    const real = d <= 30 ? posicionEn([A, B], d / 30) : posicionEn([B, C], (d - 30) / 20);
    const caminando = recorridoEn(t + 0.25) > d;

    const pista = opciones.pasos && rnd() > 0.1
      ? { velocidad: caminando ? Math.max(0, velocidad * 1.12 + normal(rnd) * 0.15) : 0 }
      : {};
    filtro.predecir(0.25, pista);

    if (opciones.conexion && Math.abs(t % 1) < 1e-9) {
      filtro.actualizar(
        { fuente: 'conexion', timestamp: t * 1000, lecturas: [conectado.lectura(real.x, real.y, rnd, opciones.ruido, opciones.desfase)] },
        { desfaseDb: desfase }
      );
    }

    if (Math.abs(t % opciones.escaneoCadaS) < 1e-9) {
      const obs: ObservacionRadio = {
        fuente: 'escaneo',
        timestamp: t * 1000,
        lecturas: normalizarEscaneo(escaneo(real.x, real.y, rnd, opciones.ruido, opciones.desfase))
      };
      filtro.actualizar(obs, { desfaseDb: desfase });
      desfase = 0.7 * desfase + 0.3 * opciones.desfase;
    }

    if (opciones.brujula && caminando && Math.abs(t % 1) < 1e-9) {
      const real = d < 30 ? 90 : 180;
      const rumbo = (real + 70 + normal(rnd) * 20 + 360) % 360;
      const e = filtro.estimar()!;
      if (calibracion.lista) {
        filtro.actualizarRumbo((rumbo - calibracion.desfase + 360) % 360);
      } else if (e.confianza > 0.7 && e.incertidumbreMetros < 4 && e.anguloPlano !== null) {
        calibracion.agregar(rumbo, e.anguloPlano);
      }
    }

    if (Math.abs(t % 1) < 1e-9) {
      const e = filtro.estimar()!;
      errores.push(Math.hypot(e.punto!.x - real.x, e.punto!.y - real.y));
      const recorrido = e.origenId === 'A' && e.destinoId === 'B'
        ? e.metros
        : e.origenId === 'B' && e.destinoId === 'C'
          ? 30 + e.metros
          : NaN;
      avance.push(recorrido);
    }
  }

  return { errores, avance };
}

function percentil(v: number[], p: number): number {
  const o = [...v].sort((a, b) => a - b);
  return o[Math.min(o.length - 1, Math.floor(p * o.length))];
}

describe('localización Wi-Fi continua', () => {
  it('agrupa los BSSID virtuales de una misma radio', () => {
    const lecturas = normalizarEscaneo([
      { bssid: 'dc:9f:db:1c:ed:e3', rssi: -53, frequency: 2462 },
      { bssid: 'ee:9f:db:1c:ed:e3', rssi: -54, frequency: 2462 },
      { bssid: 'fe:9f:db:1c:ed:e3', rssi: -50, frequency: 2462 },
      { bssid: 'fe:9f:db:1c:ed:e3', rssi: -60, frequency: 5180 }
    ]);
    expect(lecturas).toHaveLength(2);
    expect(lecturas.find(l => l.ap.startsWith('2:'))?.rssi).toBe(-50);
  });

  it('descarta lecturas antiguas o inválidas', () => {
    expect(normalizarEscaneo([
      { bssid: '02:00:00:00:00:00', rssi: -40, frequency: 2412 },
      { bssid: 'aa:bb:cc:dd:ee:ff', rssi: -40, frequency: 2412, ageMs: 60000 },
      { bssid: 'aa:bb:cc:dd:ee:fe', rssi: 10, frequency: 2412 }
    ])).toEqual([]);
  });

  it('reparte el levantamiento por tiempo a lo largo del tramo', () => {
    const muestras = muestrasDeRecorrido(
      [0, 5000, 10000].map(t => ({ fuente: 'escaneo' as const, timestamp: 1000 + t, lecturas: [{ ap: 'x', rssi: -50 }] })),
      1, 'A', 'B', 1000, 11000
    );
    expect(muestras.map(m => m.fraccion)).toEqual([0, 0.5, 1]);
  });

  it('usa las huellas existentes de un solo punto', () => {
    const muestras = muestrasDesdeHuellas(HUELLAS_WIFI, id => (id.endsWith('nivel-1') ? 1 : 3));
    expect(muestras.some(m => m.origenId === 'hall-nivel-1')).toBe(true);
    expect(muestras.some(m => m.origenId === 'alma-spa-nivel-1')).toBe(false);
    const hall = muestras.find(m => m.origenId === 'hall-nivel-1')!;
    expect(hall.lecturas.filter(l => l.ap.endsWith('9f:db:1c:ed:e3'))).toHaveLength(1);
  });

  it('calcula el largo de tramos sin medir con la escala del dibujo', () => {
    const grafo = construirGrafoNivel(1, NODOS, [
      { origen: 'A', destino: 'B', distancia: 30 },
      { origen: 'B', destino: 'C', distancia: null }
    ], n => ({ x: n.x * 10, y: n.y * 10 }));
    expect(grafo.aristas[1].largo).toBeCloseTo(20, 5);
    expect(grafo.aristas[1].medida).toBe(false);
  });

  it('penaliza estar conectado a una radio que no se ve en ese punto', () => {
    const { modelo } = crearFiltro(3);
    const celdaA = modelo.celdas[0][0];
    const lejana = claveAp(APS[4].bssid, 2437);
    const cercana = claveAp(APS[0].bssid, 2437);
    const ctx = { desfaseDb: 0 };
    const enA = verosimilitudCelda(celdaA, { fuente: 'conexion', timestamp: 0, lecturas: [{ ap: cercana, rssi: -40 }] }, ctx);
    const malo = verosimilitudCelda(celdaA, { fuente: 'conexion', timestamp: 0, lecturas: [{ ap: lejana, rssi: -40 }] }, ctx);
    expect(enA).toBeGreaterThan(malo);
  });

  it('sigue a la persona caminando con RSSI de conexión y escaneos cada 30 s (teléfono distinto, -6 dB)', () => {
    const { errores, avance } = caminar({
      semilla: 11, desfase: -6, ruido: 4, escaneoCadaS: 30, conexion: true, origenConocido: true
    });
    const tras10s = errores.slice(10);
    expect(percentil(tras10s, 0.5)).toBeLessThan(4);
    expect(percentil(tras10s, 0.9)).toBeLessThan(8);
    const validos = avance.filter(Number.isFinite);
    expect(validos.at(-1)! - validos[0]).toBeGreaterThan(30);
  });

  it('encuentra a la persona sin origen conocido usando escaneos cada 3 s', () => {
    const { errores } = caminar({
      semilla: 5, desfase: 4, ruido: 4, escaneoCadaS: 3, conexion: true, origenConocido: false
    });
    expect(percentil(errores.slice(15), 0.5)).toBeLessThan(4);
  });

  it('detecta pasos y ritmo con el acelerómetro, y se detiene al parar', () => {
    const rnd = aleatorio(4);
    const detector = new DetectorPasos(0.7);
    let t = 0;
    for (; t < 10000; t += 20) {
      detector.procesar(9.81 + 2.5 * Math.sin((2 * Math.PI * 1.8 * t) / 1000) + normal(rnd) * 0.3, t);
    }
    expect(detector.totalPasos).toBeGreaterThanOrEqual(16);
    expect(detector.totalPasos).toBeLessThanOrEqual(19);
    expect(detector.velocidad(t)).toBeGreaterThan(1.1);
    expect(detector.velocidad(t)).toBeLessThan(1.4);
    for (const fin = t + 3000; t < fin; t += 20) {
      detector.procesar(9.81 + normal(rnd) * 0.1, t);
    }
    expect(detector.velocidad(t)).toBe(0);
    expect(detector.velocidad(t + 5000)).toBeNull();
  });

  it('SIN conexión: sigue a la persona con escaneos cada 30 s y pasos', () => {
    const med: number[] = [];
    const p90: number[] = [];
    for (let semilla = 1; semilla <= 8; ++semilla) {
      const { errores } = caminar({
        semilla, desfase: -6, ruido: 4, escaneoCadaS: 30, conexion: false, origenConocido: true, pasos: true
      });
      med.push(percentil(errores.slice(10), 0.5));
      p90.push(percentil(errores.slice(10), 0.9));
    }
    expect(percentil(med, 0.5)).toBeLessThan(3.5);
    expect(percentil(p90, 0.5)).toBeLessThan(6);
  });

  it('SIN conexión: el cursor se detiene cuando la persona se detiene', () => {
    const { errores } = caminar({
      semilla: 2, desfase: 0, ruido: 4, escaneoCadaS: 30, conexion: false, origenConocido: true, pasos: true, pausa: true
    });
    expect(Math.max(...errores.slice(13, 23))).toBeLessThan(5);
  });

  it('ubica el levantamiento por pasos: una pausa no desplaza las muestras', () => {
    const pasos = [
      ...Array.from({ length: 10 }, (_, i) => 250 + i * 500),
      ...Array.from({ length: 10 }, (_, i) => 15250 + i * 500)
    ];
    const durantePausa = fraccionRecorrido(10000, 0, 20000, pasos);
    expect(durantePausa).toBeGreaterThan(0.45);
    expect(durantePausa).toBeLessThan(0.55);
    expect(fraccionRecorrido(5500, 0, 20000, pasos)).toBeCloseTo(durantePausa, 1);
    expect(fraccionRecorrido(5000, 0, 20000, [1000, 2000])).toBe(0.25);
  });

  it('aprende el giro entre la brújula y el plano', () => {
    const rnd = aleatorio(9);
    const c = new CalibracionRumbo();
    for (let i = 0; i < 12; ++i) c.agregar((90 + 70 + normal(rnd) * 10 + 360) % 360, 90);
    expect(c.lista).toBe(true);
    expect(diferenciaAngular(c.desfase, 70)).toBeLessThan(8);
    const copia = new CalibracionRumbo();
    copia.importar(c.exportar());
    expect(copia.lista).toBe(true);
    expect(diferenciaAngular(copia.desfase, c.desfase)).toBeLessThan(0.5);
  });

  it('la brújula ayuda a seguir a la persona por el cruce correcto', () => {
    const med: number[] = [];
    for (let semilla = 1; semilla <= 8; ++semilla) {
      const { errores } = caminar({
        semilla, desfase: -6, ruido: 4, escaneoCadaS: 30, conexion: false, origenConocido: true, pasos: true, brujula: true
      });
      med.push(percentil(errores.slice(10), 0.9));
    }
    expect(percentil(med, 0.5)).toBeLessThan(4.5);
  });

  it('usa el largo dibujado en el plano interactivo para tramos sin medir', () => {
    const grafo = construirGrafoNivel(1, NODOS, [
      { origen: 'A', destino: 'B', distancia: 30 },
      { origen: 'B', destino: 'C', distancia: null }
    ], n => ({ x: n.x, y: n.y }), (a, b) => (a === 'B' && b === 'C' ? 23.5 : null));
    expect(grafo.aristas[1].largo).toBe(23.5);
    expect(grafo.aristas[0].largo).toBe(30);
  });

  it('elige el nivel cuyo mapa de radio explica mejor el escaneo', () => {
    const { grafo, modelo } = crearFiltro(6);
    const obs: ObservacionRadio = {
      fuente: 'escaneo', timestamp: 0,
      lecturas: normalizarEscaneo(escaneo(10, 0, aleatorio(1), 2, 0))
    };
    const otro = construirModeloRadio(grafo, []);
    expect(puntuacionNivel(modelo, obs, { desfaseDb: 0 })!).toBeGreaterThan(-3);
    expect(puntuacionNivel(otro, obs, { desfaseDb: 0 })).toBeNull();
  });

  it('funciona solo con escaneos frecuentes (teléfono sin limitación de escaneo)', () => {
    const { errores } = caminar({
      semilla: 8, desfase: 0, ruido: 4, escaneoCadaS: 3, conexion: false, origenConocido: true
    });
    expect(percentil(errores.slice(10), 0.5)).toBeLessThan(4);
  });
});
