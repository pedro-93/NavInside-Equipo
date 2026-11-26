import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Conexion, Nodo } from '../models/nodo.model';

const nativo = {
  rssi: -45,
  bssid: 'dc:9f:db:00:00:01',
  capabilities: vi.fn(),
  getConnectionInfo: vi.fn(),
  scan: vi.fn(),
  rangeRtt: vi.fn(),
  startPassive: vi.fn(),
  stopPassive: vi.fn(),
  addListener: vi.fn(),
  getCachedResults: vi.fn()
};

import { MapaRadioService } from './mapa-radio.service';
import { NavegacionWifiService } from './navegacion-wifi.service';
import { WIFI_NATIVO, WifiNativo } from './wifi-nativo';

const NODOS: Nodo[] = [
  { id: 'A', nombre: 'A', x: 0, y: 0, tipo: 'pasillo', nivel: 7 },
  { id: 'B', nombre: 'B', x: 20, y: 0, tipo: 'pasillo', nivel: 7 }
];
const CONEXIONES: Conexion[] = [{ origen: 'A', destino: 'B', distancia: 20 }];

describe('NavegacionWifiService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
    vi.spyOn(Capacitor, 'isPluginAvailable').mockReturnValue(true);
    nativo.capabilities.mockResolvedValue({
      sdk: 34, wifiEnabled: true, locationEnabled: true, locationPermission: true,
      rttSupported: false, rttAvailable: false, rttMaxPeers: 0, scanThrottleEnabled: true
    });
    nativo.getConnectionInfo.mockImplementation(async () => ({
      connected: true, timestamp: Date.now(), ssid: 'Hippocampus', bssid: nativo.bssid, rssi: nativo.rssi, frequency: 2437
    }));
    nativo.scan.mockResolvedValue({ networks: [], timestamp: Date.now(), fresh: false });
    nativo.startPassive.mockResolvedValue(undefined);
    nativo.stopPassive.mockResolvedValue(undefined);
    nativo.addListener.mockResolvedValue({ remove: async () => undefined });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    TestBed.configureTestingModule({
      providers: [{ provide: WIFI_NATIVO, useValue: nativo as unknown as WifiNativo }]
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('guarda un levantamiento de pasillo y luego sigue a la persona con el RSSI de conexión', async () => {
    const servicio = TestBed.inject(NavegacionWifiService);
    servicio.configurar(7, NODOS, CONEXIONES, NODOS, 'A');

    expect(await servicio.iniciarLevantamientoTramo('A', 'B')).toBe(true);
    for (let s = 0; s <= 20; ++s) {
      nativo.rssi = -40 - 2 * s;
      await vi.advanceTimersByTimeAsync(1000);
    }
    const guardadas = await servicio.finalizarLevantamiento();
    expect(guardadas).toBeGreaterThan(10);
    expect(TestBed.inject(MapaRadioService).resumen(7).locales).toBe(guardadas);
    expect(servicio.tramosNivel()[0].muestras).toBe(guardadas);

    nativo.rssi = -40;
    expect(await servicio.iniciar()).toBe(true);
    const posiciones: number[] = [];
    for (let s = 0; s <= 18; ++s) {
      nativo.rssi = -40 - 2 * s + (s % 3) - 1;
      await vi.advanceTimersByTimeAsync(1000);
      const e = servicio.obtenerEstado().estimacion;
      if (e) posiciones.push(e.origenId === 'A' ? e.metros : e.largo - e.metros);
    }

    expect(posiciones.length).toBeGreaterThan(10);
    expect(posiciones.at(-1)!).toBeGreaterThan(12);
    expect(posiciones.at(-1)! - posiciones[2]).toBeGreaterThan(8);
    expect(servicio.obtenerEstado().diagnostico.lecturasMinuto.conexion).toBeGreaterThan(10);

    await servicio.detener();
    expect(servicio.obtenerEstado().activa).toBe(false);
    expect(nativo.stopPassive).toHaveBeenCalled();
  });

  it('SIN conexión: levanta y sigue a la persona solo con escaneos y pasos', async () => {
    nativo.getConnectionInfo.mockImplementation(async () => ({ connected: false, timestamp: Date.now() }));
    let x = 0;
    const antenas = [
      { bssid: 'dc:9f:db:00:00:01', x: 0 },
      { bssid: 'dc:9f:db:00:00:02', x: 10 },
      { bssid: 'dc:9f:db:00:00:03', x: 20 }
    ];
    nativo.scan.mockImplementation(async () => ({
      timestamp: Date.now(),
      fresh: true,
      newestAgeMs: 0,
      networks: antenas.map(a => ({
        ssid: 'Hippocampus', bssid: a.bssid, frequency: 2437, ageMs: 0,
        rssi: Math.round(-35 - 25 * Math.log10(Math.max(1, Math.abs(a.x - x) + 1)))
      }))
    }));

    const servicio = TestBed.inject(NavegacionWifiService);
    servicio.configurar(7, NODOS, CONEXIONES, NODOS, 'A');

    nativo.capabilities.mockResolvedValue({
      sdk: 34, wifiEnabled: true, locationEnabled: true, locationPermission: true,
      rttSupported: false, rttAvailable: false, rttMaxPeers: 0, scanThrottleEnabled: false
    });
    await servicio.iniciarLevantamientoTramo('A', 'B');
    for (let s = 0; s <= 20; ++s) {
      x = s;
      await vi.advanceTimersByTimeAsync(1000);
    }
    expect(await servicio.finalizarLevantamiento()).toBeGreaterThanOrEqual(5);

    nativo.capabilities.mockResolvedValue({
      sdk: 34, wifiEnabled: true, locationEnabled: true, locationPermission: true,
      rttSupported: false, rttAvailable: false, rttMaxPeers: 0, scanThrottleEnabled: true
    });
    x = 0;
    await servicio.iniciar();

    const caminar = async (segundos: number, moviendo: boolean) => {
      for (let ms = 0; ms < segundos * 1000; ms += 20) {
        const t = Date.now();
        if (moviendo) x = Math.min(20, x + 0.02 * 1.25);
        servicio.registrarAceleracion(9.81 + (moviendo ? 2.5 * Math.sin((2 * Math.PI * 1.8 * t) / 1000) : 0), t);
        await vi.advanceTimersByTimeAsync(20);
      }
    };

    await caminar(12, true);
    const e1 = servicio.obtenerEstado().estimacion!;
    const m1 = e1.origenId === 'A' ? e1.metros : e1.largo - e1.metros;
    expect(servicio.obtenerEstado().diagnostico.pasos).toBeGreaterThan(15);
    expect(servicio.obtenerEstado().diagnostico.lecturasMinuto.conexion).toBe(0);
    expect(m1).toBeGreaterThan(9);

    await caminar(4, false);
    const e2 = servicio.obtenerEstado().estimacion!;
    const m2 = e2.origenId === 'A' ? e2.metros : e2.largo - e2.metros;
    expect(Math.abs(m2 - m1)).toBeLessThan(2.5);

    await servicio.detener();
  });

  it('detecta el cambio de piso con el mapa de radio de cada nivel', async () => {
    const nodos: Nodo[] = [
      ...NODOS,
      { id: 'C', nombre: 'C', x: 0, y: 0, tipo: 'pasillo', nivel: 8 },
      { id: 'D', nombre: 'D', x: 20, y: 0, tipo: 'pasillo', nivel: 8 }
    ];
    const conexiones: Conexion[] = [...CONEXIONES, { origen: 'C', destino: 'D', distancia: 20 }];
    const huella = (bssid: string, rssi: number) => ({ ap: `2:${bssid.split(':').slice(1).join(':')}`, rssi });
    const mapa = TestBed.inject(MapaRadioService);
    mapa.agregar([0, 0.5, 1].flatMap(f => [
      { nivel: 7, origenId: 'A', destinoId: 'B', fraccion: f, fuente: 'escaneo' as const, timestamp: 1,
        lecturas: [huella('dc:9f:db:00:00:01', -45), huella('dc:9f:db:00:00:02', -55), huella('dc:9f:db:00:00:03', -65)] },
      { nivel: 8, origenId: 'C', destinoId: 'D', fraccion: f, fuente: 'escaneo' as const, timestamp: 1,
        lecturas: [huella('dc:9f:db:00:00:04', -45), huella('dc:9f:db:00:00:05', -55), huella('dc:9f:db:00:00:06', -65)] }
    ]));

    nativo.getConnectionInfo.mockImplementation(async () => ({ connected: false, timestamp: Date.now() }));
    nativo.scan.mockImplementation(async () => ({
      timestamp: Date.now(), fresh: true, newestAgeMs: 0,
      networks: [['04', -46], ['05', -56], ['06', -64]].map(([n, rssi]) => ({
        ssid: 'x', bssid: `dc:9f:db:00:00:${n}`, rssi: rssi as number, frequency: 2437, ageMs: 0
      }))
    }));
    nativo.capabilities.mockResolvedValue({
      sdk: 34, wifiEnabled: true, locationEnabled: true, locationPermission: true,
      rttSupported: false, rttAvailable: false, rttMaxPeers: 0, scanThrottleEnabled: false
    });

    const servicio = TestBed.inject(NavegacionWifiService);
    const niveles: number[] = [];
    servicio.cambioNivel$.subscribe(n => niveles.push(n));
    servicio.configurar(7, nodos, conexiones, [], 'A');
    await servicio.iniciar();
    await vi.advanceTimersByTimeAsync(8000);

    expect(niveles[0]).toBe(8);
    await servicio.detener();
  });

  it('usa la geometría del plano interactivo para el largo de los pasillos', () => {
    const servicio = TestBed.inject(NavegacionWifiService);
    servicio.configurar(7, NODOS, [{ origen: 'A', destino: 'B', distancia: null }]);
    expect(servicio.tramosNivel()[0].medida).toBe(false);
    servicio.registrarGeometria(7, {
      escalaM: 0.1,
      nodos: { A: { x: 0, y: 0 }, B: { x: 170, y: 0 } },
      largos: { 'A|B': 17 }
    });
    expect(servicio.tramosNivel()[0].largo).toBe(17);
  });

  it('no inicia fuera de Android', async () => {
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('web');
    const servicio = TestBed.inject(NavegacionWifiService);
    servicio.configurar(7, NODOS, CONEXIONES);
    expect(await servicio.iniciar()).toBe(false);
    expect(servicio.obtenerEstado().activa).toBe(false);
  });

  it('exporta e importa el mapa de radio', () => {
    const mapa = TestBed.inject(MapaRadioService);
    mapa.agregar([{
      nivel: 7, origenId: 'A', destinoId: 'B', fraccion: 0.5, fuente: 'conexion',
      timestamp: 1, lecturas: [{ ap: '2:9f:db:00:00:01', rssi: -60 }]
    }]);
    const texto = mapa.exportar();
    mapa.borrarLocales();
    expect(mapa.resumen(7).locales).toBe(0);
    expect(mapa.importar(texto)).toBe(1);
    expect(mapa.importar('{"version":1,"muestras":[{"nivel":"x"}]}')).toBe(0);
    expect(mapa.resumen(7).tramos).toBe(1);
  });
});
