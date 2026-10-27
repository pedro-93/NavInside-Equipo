/** Lecturas preliminares del 20-10-2026. No son coordenadas ni distancias. */
export interface ReferenciaWifi {
  ssid: string;
  bssid: string | null;
  rssi: number;
  canal: string;
  usarParaComparar?: boolean;
}

export interface HuellaWifi {
  id: string;
  nombre: string;
  nodoIds: readonly string[];
  hora: string;
  observacion: string;
  lecturas: readonly ReferenciaWifi[];
}

export const HUELLAS_WIFI: readonly HuellaWifi[] = [
  {
    id: 'hall',
    nombre: 'Hall',
    nodoIds: ['hall-nivel-1'],
    hora: '11:33',
    observacion:
      'Los BSSID incompletos se conservan tal como fueron registrados; no se completan por inferencia.',
    lecturas: [
      {
        ssid: 'movistar2,4GHZ_E23C58',
        bssid: 'e4:ab:89:e2:3c:58',
        canal: '1',
        rssi: -36
      },
      {
        ssid: 'Hippocampus',
        bssid: 'dc:9f:db:1c:ed',
        canal: '11',
        rssi: -53
      },
      {
        ssid: 'Administracion',
        bssid: 'ee:9f:db:1c:ed',
        canal: '11',
        rssi: -54
      },
      {
        ssid: 'HiddenSSID',
        bssid: 'fe:9f:db:1c:ed',
        canal: '11',
        rssi: -54
      },
      {
        ssid: 'Minimarket',
        bssid: 'ec:08:6b:60:aa',
        canal: '9(7)',
        rssi: -63
      },
      {
        ssid: 'Admin_hippo',
        bssid: 'de:9f:db:f7:79:54',
        canal: '1',
        rssi: -75
      },
      {
        ssid: 'RRHH',
        bssid: 'c0:25:e9:32:33:26',
        canal: '2(4)',
        rssi: -85
      },
      {
        ssid: 'Experiencia al Socio',
        bssid: '00:24:01:fd:2e:5a',
        canal: '11',
        rssi: -86
      }
    ]
  },
  {
    id: 'gimnasio',
    nombre: 'Gimnasio',
    nodoIds: ['gimnasio-nivel-1'],
    hora: '11:36',
    observacion:
      'Una única señal débil: insuficiente para confirmar ubicación automáticamente.',
    lecturas: [
      {
        ssid: 'movistar2,4GHZ_E23C58',
        bssid: 'e4:ab:89:e2:3c:58',
        canal: '1',
        rssi: -91
      }
    ]
  },
  {
    id: 'alma-montemar',
    nombre: 'Sector Alma Spa / Montemar',
    nodoIds: [
      'alma-spa-nivel-1',
      'salon-eventos-montemar-nivel-1'
    ],
    hora: '11:42',
    observacion:
      'Medición conjunta; no distingue los dos recintos.',
    lecturas: [
      {
        ssid: 'movistar2,4GHZ_E23C58',
        bssid: null,
        canal: '1',
        rssi: -38
      },
      {
        ssid: 'Administracion',
        bssid: null,
        canal: '11',
        rssi: -74
      },
      {
        ssid: 'Hippocampus',
        bssid: null,
        canal: '6',
        rssi: -84
      },
      {
        ssid: 'Hippocampus',
        bssid: null,
        canal: '11',
        rssi: -74
      },
      {
        ssid: 'Admin_hippo',
        bssid: null,
        canal: '6',
        rssi: -78
      },
      {
        ssid: 'Redmi A3',
        bssid: null,
        canal: '1',
        rssi: -63,
        usarParaComparar: false
      }
    ]
  },
  {
    id: 'altamar',
    nombre: 'Salón Altamar',
    nodoIds: ['salon-eventos-altamar-nivel-1'],
    hora: '11:50',
    observacion:
      'Piso físico 8, Nivel 1 de NavInside. La lectura de 614AB proviene del gráfico y es aproximada.',
    lecturas: [
      {
        ssid: 'Admin_hippo',
        bssid: null,
        canal: '6',
        rssi: -66
      },
      {
        ssid: 'WiFi_Mesh-170384',
        bssid: null,
        canal: '1',
        rssi: -73
      },
      {
        ssid: '2301',
        bssid: null,
        canal: '9(7)',
        rssi: -88
      },
      {
        ssid: 'Hippocampus',
        bssid: null,
        canal: '6',
        rssi: -83
      },
      {
        ssid: '514AB 2.4',
        bssid: null,
        canal: '1',
        rssi: -70
      },
      {
        ssid: 'WiFi_Mesh-043813',
        bssid: null,
        canal: '11',
        rssi: -84
      },
      {
        ssid: '614AB 2.4',
        bssid: null,
        canal: '11',
        rssi: -49
      }
    ]
  },
  {
    id: 'recepcion-turismo',
    nombre: 'Entrada / Recepción Turismo',
    nodoIds: [
      'entrada-nivel-4',
      'recepcion-turismo-vina-nivel-4'
    ],
    hora: '12:08',
    observacion:
      'Captura del sector; no distingue Entrada de Recepción Turismo.',
    lecturas: [
      {
        ssid: 'Admin_hippo',
        bssid: 'fa:92:bf:cd:a3:2c',
        canal: '6',
        rssi: -69
      },
      {
        ssid: 'Hippocampus',
        bssid: 'f4:92:bf:cd:a3:2c',
        canal: '6',
        rssi: -70
      },
      {
        ssid: 'HiddenSSID',
        bssid: 'fe:9f:c2:aa:20:79',
        canal: '11',
        rssi: -64
      },
      {
        ssid: 'Admin_hippo',
        bssid: 'f6:9f:c2:aa:20:79',
        canal: '11',
        rssi: -65
      },
      {
        ssid: 'Administracion',
        bssid: 'fa:9f:c2:aa:20:79',
        canal: '11',
        rssi: -64
      }
    ]
  },
  {
    id: 'piscina-temperada',
    nombre: 'Piscina temperada',
    nodoIds: ['piscina-temperada-nivel-3'],
    hora: '12:20',
    observacion:
      'BSSID no registrado; comparación por nombre de red de confianza baja.',
    lecturas: [
      {
        ssid: 'Getnet_Faro',
        bssid: null,
        canal: '6(8)',
        rssi: -55
      },
      {
        ssid: 'Administracion',
        bssid: null,
        canal: '1',
        rssi: -60
      },
      {
        ssid: 'Hippocampus',
        bssid: null,
        canal: '1',
        rssi: -68
      },
      {
        ssid: 'Admin_hippo',
        bssid: null,
        canal: '1',
        rssi: -65
      },
      {
        ssid: 'Galaxy A31BE7C',
        bssid: null,
        canal: '6',
        rssi: -80,
        usarParaComparar: false
      }
    ]
  },
  {
    id: 'toallas',
    nombre: 'Entrega de toallas',
    nodoIds: [],
    hora: '12:23',
    observacion:
      'Sin nodo propio confirmado en el grafo activo.',
    lecturas: [
      {
        ssid: 'Getnet_Faro',
        bssid: null,
        canal: '6(8)',
        rssi: -83
      },
      {
        ssid: 'Administracion',
        bssid: null,
        canal: '11',
        rssi: -72
      },
      {
        ssid: 'movistar2,4GHZ_E23C58',
        bssid: null,
        canal: '1',
        rssi: -45
      },
      {
        ssid: 'Hippocampus',
        bssid: null,
        canal: '11',
        rssi: -78
      },
      {
        ssid: 'Admin_hippo',
        bssid: null,
        canal: '6',
        rssi: -80
      }
    ]
  },
  {
    id: 'faro',
    nombre: 'Restaurante Faro',
    nodoIds: ['restaurant-faro-nivel-3'],
    hora: '12:28',
    observacion:
      'BSSID Getnet_Faro confirmado únicamente para esta captura.',
    lecturas: [
      {
        ssid: 'Getnet_Faro',
        bssid: '40:3f:8c:cb:33:08',
        canal: '6(8)',
        rssi: -28
      },
      {
        ssid: 'Administracion',
        bssid: null,
        canal: '1',
        rssi: -50
      },
      {
        ssid: 'Hippocampus',
        bssid: null,
        canal: '1',
        rssi: -53
      },
      {
        ssid: '1303AB 2.4',
        bssid: null,
        canal: '1',
        rssi: -78
      },
      {
        ssid: '1503AB 2.4',
        bssid: null,
        canal: '11',
        rssi: -78
      }
    ]
  }
];