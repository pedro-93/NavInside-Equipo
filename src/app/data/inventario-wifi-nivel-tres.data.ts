// Inventario de campo. Estas observaciones no son huellas de posicionamiento.
// No se combinan capturas ni se completan BSSID, canal o frecuencia por inferencia.
interface SenalObservada {
  ssid: string;
  rssi: number | null;
  posibleHotspot?: boolean;
}

interface CapturaWifiNivelTres {
  id: 'lectura-general' | 'lectura-sin-punto' | 'historico-sector-faro';
  lecturas: readonly SenalObservada[];
}

export const INVENTARIO_WIFI_NIVEL_TRES: readonly CapturaWifiNivelTres[] = [
  {
    id: 'lectura-general',
    lecturas: [
      { ssid: 'HONOR X7c', rssi: -33, posibleHotspot: true },
      { ssid: 'Tercerpiso', rssi: -65 },
      { ssid: 'Tercerpiso', rssi: -74 },
      { ssid: 'Admin_hippo', rssi: -77 },
      { ssid: 'Administracion', rssi: -78 },
      { ssid: 'Hippocampus', rssi: -78 },
      { ssid: 'VTR-4563517', rssi: -88 },
      { ssid: 'VTR-5983364', rssi: -88 },
      { ssid: '1302AB 2.4', rssi: -94 }
    ]
  },
  {
    id: 'lectura-sin-punto',
    lecturas: [
      { ssid: '1304AB 2.4', rssi: -79 },
      { ssid: '1303AB 2.4', rssi: -84 },
      { ssid: 'Red oculta', rssi: -84 },
      { ssid: '1303AB 5', rssi: -84 },
      { ssid: 'SEGURIDAD 2,4 Ghz', rssi: -87 },
      { ssid: '1503AB 2.4', rssi: -89 },
      { ssid: '1403AB 2.4', rssi: -92 },
      { ssid: 'Red oculta', rssi: -93 },
      { ssid: '1603AB 2.4', rssi: -94 }
    ]
  },
  {
    id: 'historico-sector-faro',
    // Lista histórica de nombres, sin intensidad documentada para este grupo.
    // Las mediciones específicas de Restaurante Faro se conservan aparte.
    lecturas: [
      { ssid: 'Getnet_Faro', rssi: null },
      { ssid: 'Administracion', rssi: null },
      { ssid: 'Hippocampus', rssi: null },
      { ssid: 'Admin_hippo', rssi: null },
      { ssid: '1303AB 2.4', rssi: null },
      { ssid: '1304AB 2.4', rssi: null },
      { ssid: '1501AB 2.4', rssi: null },
      { ssid: '1503AB 2.4', rssi: null },
      { ssid: 'SEGURIDAD 2,4 Ghz', rssi: null },
      { ssid: 'movistar2,4GHZ_E23C58', rssi: null },
      { ssid: 'Minimarket', rssi: null }
    ]
  }
];
