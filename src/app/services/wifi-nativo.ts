import { InjectionToken } from '@angular/core';
import { PluginListenerHandle, registerPlugin } from '@capacitor/core';

export interface RedWifiNativa {
  ssid: string;
  bssid: string;
  rssi: number;
  frequency: number;
  ageMs: number;
  rtt?: boolean;
}

export interface ResultadoEscaneoNativo {
  networks: RedWifiNativa[];
  timestamp: number;
  fresh?: boolean;
  reason?: string;
  newestAgeMs?: number;
  updated?: boolean;
  source?: string;
}

export interface ConexionWifiNativa {
  connected: boolean;
  timestamp: number;
  ssid?: string;
  bssid?: string;
  rssi?: number;
  frequency?: number;
  linkSpeedMbps?: number;
}

export interface CapacidadesWifiNativas {
  sdk: number;
  wifiEnabled: boolean;
  locationEnabled: boolean;
  locationPermission: boolean;
  rttSupported: boolean;
  rttAvailable: boolean;
  rttMaxPeers: number;
  scanThrottleEnabled: boolean;
}

export interface MedicionRttNativa {
  bssid: string;
  ok: boolean;
  distanceMm?: number;
  distanceStdDevMm?: number;
  rssi?: number;
  attempted?: number;
  successful?: number;
}

export interface ResultadoRttNativo {
  results: MedicionRttNativa[];
  timestamp: number;
}

export interface WifiNativo {
  scan(opciones?: {
    minIntervalMs?: number;
    allowCached?: boolean;
  }): Promise<ResultadoEscaneoNativo>;
  getCachedResults(): Promise<ResultadoEscaneoNativo>;
  getConnectionInfo(): Promise<ConexionWifiNativa>;
  capabilities(): Promise<CapacidadesWifiNativas>;
  rangeRtt(opciones: { bssids: string[] }): Promise<ResultadoRttNativo>;
  startPassive(): Promise<void>;
  stopPassive(): Promise<void>;
  addListener(
    evento: 'scanResults',
    funcion: (datos: ResultadoEscaneoNativo) => void
  ): Promise<PluginListenerHandle>;
}

export const wifiNativo = registerPlugin<WifiNativo>('NavInsideWifi');

export const WIFI_NATIVO = new InjectionToken<WifiNativo>('WIFI_NATIVO', {
  providedIn: 'root',
  factory: (): WifiNativo => ({
    scan: opciones => wifiNativo.scan(opciones),
    getCachedResults: () => wifiNativo.getCachedResults(),
    getConnectionInfo: () => wifiNativo.getConnectionInfo(),
    capabilities: () => wifiNativo.capabilities(),
    rangeRtt: opciones => wifiNativo.rangeRtt(opciones),
    startPassive: () => wifiNativo.startPassive(),
    stopPassive: () => wifiNativo.stopPassive(),
    addListener: (evento, funcion) => wifiNativo.addListener(evento, funcion)
  })
});
