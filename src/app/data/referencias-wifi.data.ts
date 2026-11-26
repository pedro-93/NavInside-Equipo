export interface ReferenciaWifi {
  ssid: string;
  bssid: string | null;
  rssi: number;
  canal: string;
  usarParaComparar?: boolean;
  frecuenciaMhz?: number;
  aproximada?: boolean;
}

export interface FuenteCapturaWifi {
  archivo: string;
  libraryFileId: string;
}

export interface HuellaWifi {
  tipo?: "registro-local";
  id: string;
  nombre: string;
  nodoIds: readonly string[];
  hora: string;
  observacion: string;
  fuentes?: readonly FuenteCapturaWifi[];
  redesSinRssi?: readonly { ssid: string; bssid: string | null; canal: string }[];
  lecturas: readonly ReferenciaWifi[];
}

export interface ReferenciaSectorWifi {
  id: string;
  nombre: string;
  nodoIds: readonly string[];
  huellaOrigenId: string;
  nodoMedidoId: string;
  ssid: string;
  bssid: string;
  observacion: string;
  fuente: FuenteCapturaWifi;
}

export const ORIGEN_LEVANTAMIENTO_WIFI = { herramienta: 'WiFi Analyzer', fecha: '2026-10-20' } as const;

export const HUELLAS_WIFI: readonly HuellaWifi[] = [
  {
    "id": "hall",
    "nombre": "Hall",
    "nodoIds": [
      "hall-nivel-1"
    ],
    "hora": "11:33",
    "observacion": "WiFi Analyzer: BSSID completos recuperados de la lista original. La lectura se tomó en el Hall; la referencia compartida con otros puntos no equivale a una medición individual en cada uno.",
    "fuentes": [
      {
        "archivo": "image(20261022-021912).png",
        "libraryFileId": "libfile_d32280f461c881919a33e2062e3efa17"
      },
      {
        "archivo": "image(20261022-021922).png",
        "libraryFileId": "libfile_a8a27a42e90481919ded389fcd26dad8"
      }
    ],
    "lecturas": [
      {
        "ssid": "movistar2,4GHZ_E23C58",
        "bssid": "e4:ab:89:e2:3c:58",
        "rssi": -36,
        "canal": "1",
        "frecuenciaMhz": 2412
      },
      {
        "ssid": "Hippocampus",
        "bssid": "dc:9f:db:1c:ed:e3",
        "rssi": -53,
        "canal": "11",
        "frecuenciaMhz": 2462
      },
      {
        "ssid": "Administracion",
        "bssid": "ee:9f:db:1c:ed:e3",
        "rssi": -54,
        "canal": "11",
        "frecuenciaMhz": 2462
      },
      {
        "ssid": "HiddenSSID",
        "bssid": "fe:9f:db:1c:ed:e3",
        "rssi": -54,
        "canal": "11",
        "frecuenciaMhz": 2462
      },
      {
        "ssid": "Minimarket",
        "bssid": "ec:08:6b:60:aa:ca",
        "rssi": -63,
        "canal": "9(7)",
        "frecuenciaMhz": 2452
      },
      {
        "ssid": "Admin_hippo",
        "bssid": "de:9f:db:f7:79:54",
        "rssi": -75,
        "canal": "1",
        "frecuenciaMhz": 2412
      },
      {
        "ssid": "RRHH",
        "bssid": "c0:25:e9:32:33:26",
        "rssi": -85,
        "canal": "2(4)",
        "frecuenciaMhz": 2417
      },
      {
        "ssid": "Experiencia al Socio",
        "bssid": "00:24:01:fd:2e:5a",
        "rssi": -86,
        "canal": "11",
        "frecuenciaMhz": 2462
      }
    ]
  },
  {
    "id": "gimnasio",
    "nombre": "Gimnasio",
    "nodoIds": [
      "gimnasio-nivel-1"
    ],
    "hora": "11:36",
    "observacion": "Una única señal débil: insuficiente para confirmar ubicación automáticamente. Los reenvíos de esta captura no se cuentan como mediciones nuevas.",
    "fuentes": [
      {
        "archivo": "image(20261022-021757).png",
        "libraryFileId": "libfile_2a373536ca40819180517b9f05859f43"
      },
      {
        "archivo": "image(20261022-021806).png",
        "libraryFileId": "libfile_f1cde9469f68819194e16d36ae37938a"
      },
      {
        "archivo": "image(20261022-023443).png",
        "libraryFileId": "libfile_54bd3e8e3f608191a16d1879772623ae"
      },
      {
        "archivo": "image(20261022-023453).png",
        "libraryFileId": "libfile_27680ae7754c8191ac64ed3ce71cd940"
      }
    ],
    "lecturas": [
      {
        "ssid": "movistar2,4GHZ_E23C58",
        "bssid": "e4:ab:89:e2:3c:58",
        "rssi": -91,
        "canal": "1",
        "frecuenciaMhz": 2412
      }
    ]
  },
  {
    "id": "alma-montemar",
    "nombre": "Sector Alma Spa / Montemar",
    "nodoIds": [
      "alma-spa-nivel-1",
      "salon-eventos-montemar-nivel-1"
    ],
    "hora": "11:42",
    "observacion": "Medición conjunta; no distingue los dos recintos. Se recuperaron las redes 809AB y el segundo Admin_hippo omitidas en la transcripción. Redmi A3 se conserva como inventario y no se usa para comparar.",
    "fuentes": [
      {
        "archivo": "image(20261022-021834).png",
        "libraryFileId": "libfile_8c985a1e83588191b4af3e21d1e96ded"
      },
      {
        "archivo": "image(20261022-021846).png",
        "libraryFileId": "libfile_475e9301fe048191b98fc6671603d2c8"
      },
      {
        "archivo": "image(20261022-023607).png",
        "libraryFileId": "libfile_8b595223dffc8191b60be529659327c2"
      },
      {
        "archivo": "image(20261022-023615).png",
        "libraryFileId": "libfile_ee76f607f32c8191955ee6ebb40d3db2"
      }
    ],
    "lecturas": [
      {
        "ssid": "movistar2,4GHZ_E23C58",
        "bssid": "e4:ab:89:e2:3c:58",
        "rssi": -38,
        "canal": "1",
        "frecuenciaMhz": 2412
      },
      {
        "ssid": "Administracion",
        "bssid": "ee:9f:db:1c:ed:e3",
        "rssi": -74,
        "canal": "11",
        "frecuenciaMhz": 2462
      },
      {
        "ssid": "Hippocampus",
        "bssid": "dc:9f:db:1c:c6:aa",
        "rssi": -84,
        "canal": "6",
        "frecuenciaMhz": 2437
      },
      {
        "ssid": "Hippocampus",
        "bssid": "dc:9f:db:1c:ed:e3",
        "rssi": -74,
        "canal": "11",
        "frecuenciaMhz": 2462
      },
      {
        "ssid": "Admin_hippo",
        "bssid": "de:9f:db:1c:c6:a9",
        "rssi": -78,
        "canal": "6",
        "frecuenciaMhz": 2437
      },
      {
        "ssid": "Redmi A3",
        "bssid": "52:fc:7f:57:0e:c5",
        "rssi": -63,
        "canal": "1",
        "frecuenciaMhz": 2412,
        "usarParaComparar": false
      },
      {
        "ssid": "809AB 2.4",
        "bssid": "58:d3:12:03:b2:7a",
        "rssi": -85,
        "canal": "10",
        "frecuenciaMhz": 2457
      },
      {
        "ssid": "Admin_hippo",
        "bssid": "de:9f:db:1c:c6:aa",
        "rssi": -85,
        "canal": "6",
        "frecuenciaMhz": 2437
      }
    ]
  },
  {
    "id": "altamar",
    "nombre": "Salón Altamar",
    "nodoIds": [
      "salon-eventos-altamar-nivel-1"
    ],
    "hora": "11:50",
    "observacion": "Se conserva la asociación existente de la captura con Altamar. Los reenvíos de las mismas imágenes no son mediciones independientes en Tinajas. La lectura de 614AB procede del gráfico, es aproximada y no se usa para comparar; la última fila Hippocampus tiene el RSSI parcialmente tapado por publicidad.",
    "fuentes": [
      {
        "archivo": "image(20261022-021716).png",
        "libraryFileId": "libfile_9841a8140b3c8191adac98bcb0c0e58d"
      },
      {
        "archivo": "image(20261022-021727).png",
        "libraryFileId": "libfile_11535ec5536881918a748289995ee8ca"
      },
      {
        "archivo": "image(20261022-023325).png",
        "libraryFileId": "libfile_72e3d72dbedc81919e457d0323d7f8d7"
      },
      {
        "archivo": "image(20261022-023337).png",
        "libraryFileId": "libfile_0f0e78bf58bc8191b321ff638c76fbda"
      }
    ],
    "lecturas": [
      {
        "ssid": "Admin_hippo",
        "bssid": "02:ec:da:1d:79:ea",
        "rssi": -66,
        "canal": "6",
        "frecuenciaMhz": 2437
      },
      {
        "ssid": "WiFi_Mesh-170384",
        "bssid": "58:d3:12:03:84:1e",
        "rssi": -73,
        "canal": "1",
        "frecuenciaMhz": 2412
      },
      {
        "ssid": "2301",
        "bssid": "dc:62:79:69:ed:b6",
        "rssi": -88,
        "canal": "9(7)",
        "frecuenciaMhz": 2452
      },
      {
        "ssid": "Hippocampus",
        "bssid": "78:8a:20:2a:95:6f",
        "rssi": -83,
        "canal": "6",
        "frecuenciaMhz": 2437
      },
      {
        "ssid": "514AB 2.4",
        "bssid": "2c:b6:c2:26:33:2a",
        "rssi": -70,
        "canal": "1",
        "frecuenciaMhz": 2412
      },
      {
        "ssid": "WiFi_Mesh-043813",
        "bssid": "0c:01:4b:85:c8:9c",
        "rssi": -84,
        "canal": "11",
        "frecuenciaMhz": 2462
      },
      {
        "ssid": "614AB 2.4",
        "bssid": null,
        "rssi": -49,
        "canal": "11",
        "frecuenciaMhz": 2462,
        "usarParaComparar": false,
        "aproximada": true
      }
    ],
    "redesSinRssi": [
      {
        "ssid": "Hippocampus",
        "bssid": "fc:ec:da:1d:79:ea",
        "canal": "6"
      }
    ]
  },
  {
    "id": "recepcion-turismo",
    "nombre": "Sector Entrada / Recepciones / Ascensores nivel 4",
    "nodoIds": [
      "entrada-nivel-4",
      "recepcion-turismo-vina-nivel-4",
      "recepcion-resort-nivel-4",
      "ascensor-central-nivel-4"
    ],
    "hora": "12:08",
    "observacion": "El usuario identificó conjuntamente Entrada principal, Recepción Turismo, Recepción Hippocampus y Ascensores del piso 4. Esta captura no distingue esos cuatro puntos.",
    "fuentes": [
      {
        "archivo": "image(20261022-021544).png",
        "libraryFileId": "libfile_2febf78bcab88191a32c400c803f3dde"
      },
      {
        "archivo": "image(20261022-021555).png",
        "libraryFileId": "libfile_965278ca1ef88191bd9d7ae8e4591868"
      }
    ],
    "lecturas": [
      {
        "ssid": "Admin_hippo",
        "bssid": "fa:92:bf:cd:a3:2c",
        "rssi": -69,
        "canal": "6",
        "frecuenciaMhz": 2437
      },
      {
        "ssid": "Hippocampus",
        "bssid": "f4:92:bf:cd:a3:2c",
        "rssi": -70,
        "canal": "6",
        "frecuenciaMhz": 2437
      },
      {
        "ssid": "HiddenSSID",
        "bssid": "fe:9f:c2:aa:20:79",
        "rssi": -64,
        "canal": "11",
        "frecuenciaMhz": 2462
      },
      {
        "ssid": "Admin_hippo",
        "bssid": "f6:9f:c2:aa:20:79",
        "rssi": -65,
        "canal": "11",
        "frecuenciaMhz": 2462
      },
      {
        "ssid": "Administracion",
        "bssid": "fa:9f:c2:aa:20:79",
        "rssi": -64,
        "canal": "11",
        "frecuenciaMhz": 2462
      },
      {
        "ssid": "HiddenSSID",
        "bssid": "8a:d7:9a:17:6c:6c",
        "rssi": -93,
        "canal": "1",
        "frecuenciaMhz": 2412
      }
    ],
    "redesSinRssi": [
      {
        "ssid": "HiddenSSID",
        "bssid": "02:92:bf:cd:a3:2c",
        "canal": "6"
      }
    ]
  },
  {
    "id": "recepciones-nivel-4-1216",
    "nombre": "Sector Entrada / Recepciones / Ascensores nivel 4",
    "nodoIds": [
      "entrada-nivel-4",
      "recepcion-turismo-vina-nivel-4",
      "recepcion-resort-nivel-4",
      "ascensor-central-nivel-4"
    ],
    "hora": "12:16",
    "observacion": "Segunda captura del sector informado para nivel 4, antes omitida. No se asigna a una recepción concreta: los cuatro lugares se conservan como un sector compartido.",
    "fuentes": [
      {
        "archivo": "image(20261022-021433).png",
        "libraryFileId": "libfile_5a535d68236481918b6269c9ffb3bcde"
      },
      {
        "archivo": "image(20261022-021447).png",
        "libraryFileId": "libfile_862f43e74f588191982520c8fb1bf892"
      }
    ],
    "lecturas": [
      {
        "ssid": "Admin_hippo",
        "bssid": "fa:92:bf:cd:a3:2c",
        "rssi": -48,
        "canal": "6",
        "frecuenciaMhz": 2437
      },
      {
        "ssid": "Hippocampus",
        "bssid": "f4:92:bf:cd:a3:2c",
        "rssi": -48,
        "canal": "6",
        "frecuenciaMhz": 2437
      },
      {
        "ssid": "Austral Home.",
        "bssid": "e4:ab:89:66:72:00",
        "rssi": -87,
        "canal": "6(8)",
        "frecuenciaMhz": 2437
      },
      {
        "ssid": "HiddenSSID",
        "bssid": "fe:9f:c2:aa:20:79",
        "rssi": -82,
        "canal": "11",
        "frecuenciaMhz": 2462
      },
      {
        "ssid": "Administracion",
        "bssid": "fa:9f:c2:aa:20:79",
        "rssi": -83,
        "canal": "11",
        "frecuenciaMhz": 2462
      },
      {
        "ssid": "HiddenSSID",
        "bssid": "6e:04:7a:6f:a1:3f",
        "rssi": -86,
        "canal": "6",
        "frecuenciaMhz": 2437
      }
    ],
    "redesSinRssi": [
      {
        "ssid": "HiddenSSID",
        "bssid": "02:92:bf:cd:a3:2c",
        "canal": "6"
      }
    ]
  },
  {
    "id": "piscina-temperada",
    "nombre": "Piscina temperada",
    "nodoIds": [
      "piscina-temperada-nivel-3"
    ],
    "hora": "12:20",
    "observacion": "Lecturas de la lista original de WiFi Analyzer. Galaxy A31BE7C se excluyó por solicitud del usuario. La fila 1501AB está recortada y no se inventa su RSSI.",
    "fuentes": [
      {
        "archivo": "image(20261022-021349).png",
        "libraryFileId": "libfile_4d277c471360819181b4ce5805e389d7"
      },
      {
        "archivo": "image(20261022-021402).png",
        "libraryFileId": "libfile_2a21dc3e7d9081918fed9281714a9b7a"
      }
    ],
    "lecturas": [
      {
        "ssid": "Getnet_Faro",
        "bssid": "40:3f:8c:cb:33:08",
        "rssi": -55,
        "canal": "6(8)",
        "frecuenciaMhz": 2437
      },
      {
        "ssid": "Administracion",
        "bssid": "ee:9f:db:f7:7a:0f",
        "rssi": -60,
        "canal": "1",
        "frecuenciaMhz": 2412
      },
      {
        "ssid": "Hippocampus",
        "bssid": "dc:9f:db:f7:7a:0f",
        "rssi": -68,
        "canal": "1",
        "frecuenciaMhz": 2412
      },
      {
        "ssid": "Admin_hippo",
        "bssid": "de:9f:db:f7:7a:0f",
        "rssi": -65,
        "canal": "1",
        "frecuenciaMhz": 2412
      },
      {
        "ssid": "1303AB 2.4",
        "bssid": "58:d3:12:6d:f6:4a",
        "rssi": -86,
        "canal": "1",
        "frecuenciaMhz": 2412
      }
    ],
    "redesSinRssi": [
      {
        "ssid": "1501AB 2.4",
        "bssid": "64:85:05:1f:5b:00",
        "canal": "No visible"
      }
    ]
  },
  {
    "id": "toallas",
    "nombre": "Entrega de toallas",
    "nodoIds": [
      "toallas-nivel-1"
    ],
    "hora": "12:23",
    "observacion": "Captura vinculada a Entrega de Toallas, nivel 1. Se recuperaron BSSID completos y el segundo Admin_hippo. La fila Minimarket se conserva sin un RSSI inventado porque la tapa la publicidad.",
    "fuentes": [
      {
        "archivo": "image(20261022-021252).png",
        "libraryFileId": "libfile_0a843af6128c819182cbff128a4c258e"
      },
      {
        "archivo": "image(20261022-021313).png",
        "libraryFileId": "libfile_b14761df1c408191b1dfcfd9697b08e0"
      }
    ],
    "lecturas": [
      {
        "ssid": "Getnet_Faro",
        "bssid": "40:3f:8c:cb:33:08",
        "rssi": -83,
        "canal": "6(8)",
        "frecuenciaMhz": 2437
      },
      {
        "ssid": "Administracion",
        "bssid": "ee:9f:db:1c:ed:e3",
        "rssi": -72,
        "canal": "11",
        "frecuenciaMhz": 2462
      },
      {
        "ssid": "movistar2,4GHZ_E23C58",
        "bssid": "e4:ab:89:e2:3c:58",
        "rssi": -45,
        "canal": "1",
        "frecuenciaMhz": 2412
      },
      {
        "ssid": "Hippocampus",
        "bssid": "dc:9f:db:1c:ed:e3",
        "rssi": -78,
        "canal": "11",
        "frecuenciaMhz": 2462
      },
      {
        "ssid": "Admin_hippo",
        "bssid": "fa:92:bf:c4:8d:69",
        "rssi": -80,
        "canal": "6",
        "frecuenciaMhz": 2437
      },
      {
        "ssid": "Admin_hippo",
        "bssid": "de:9f:db:f7:79:54",
        "rssi": -87,
        "canal": "1",
        "frecuenciaMhz": 2412
      }
    ],
    "redesSinRssi": [
      {
        "ssid": "Minimarket",
        "bssid": "ec:08:6b:60:aa:ca",
        "canal": "No visible"
      }
    ]
  },
  {
    "id": "faro",
    "nombre": "Restaurante Faro",
    "nodoIds": [
      "restaurant-faro-nivel-3"
    ],
    "hora": "12:28",
    "observacion": "Lecturas de la lista original, con BSSID completos. Se recuperó 1304AB 2.4. La distancia estimada por WiFi Analyzer no se convierte en distancia real de navegación.",
    "fuentes": [
      {
        "archivo": "image(20261022-021124).png",
        "libraryFileId": "libfile_a99a3a4392ac819180d669deb8ae88a0"
      },
      {
        "archivo": "image(20261022-021211).png",
        "libraryFileId": "libfile_eda33d808f388191814951bbebb5d744"
      }
    ],
    "lecturas": [
      {
        "ssid": "Getnet_Faro",
        "bssid": "40:3f:8c:cb:33:08",
        "rssi": -28,
        "canal": "6(8)",
        "frecuenciaMhz": 2437
      },
      {
        "ssid": "Administracion",
        "bssid": "ee:9f:db:f7:7a:0f",
        "rssi": -50,
        "canal": "1",
        "frecuenciaMhz": 2412
      },
      {
        "ssid": "Hippocampus",
        "bssid": "dc:9f:db:f7:7a:0f",
        "rssi": -53,
        "canal": "1",
        "frecuenciaMhz": 2412
      },
      {
        "ssid": "1303AB 2.4",
        "bssid": "58:d3:12:6d:f6:4a",
        "rssi": -78,
        "canal": "1",
        "frecuenciaMhz": 2412
      },
      {
        "ssid": "1503AB 2.4",
        "bssid": "58:d3:12:03:a9:aa",
        "rssi": -78,
        "canal": "11",
        "frecuenciaMhz": 2462
      },
      {
        "ssid": "1304AB 2.4",
        "bssid": "58:d3:12:03:7f:50",
        "rssi": -85,
        "canal": "6",
        "frecuenciaMhz": 2437
      }
    ],
    "redesSinRssi": [
      {
        "ssid": "SEGURIDAD 2,4 Ghz",
        "bssid": "e0:1c:fc:dc:d5:f8",
        "canal": "No visible"
      }
    ]
  }
];

export const CAPTURAS_WIFI_POR_ASOCIAR: readonly HuellaWifi[] = [
  {
    "id": "captura-1157",
    "nombre": "Captura 11:57 · punto por asociar",
    "nodoIds": [],
    "hora": "11:57",
    "observacion": "La captura original existe y se conserva. No se ha recuperado una asociación inequívoca con un POI; queda fuera de la comparación de ubicación hasta confirmar su lugar. No se etiqueta como Tinajas por inferencia.",
    "fuentes": [
      {
        "archivo": "image(20261022-021629).png",
        "libraryFileId": "libfile_3527558c65e48191a7160e2ca67e4a9b"
      },
      {
        "archivo": "image(20261022-021639).png",
        "libraryFileId": "libfile_916b5b8082c08191af5e217c31bca484"
      }
    ],
    "lecturas": [
      {
        "ssid": "Administracion",
        "bssid": "ee:9f:db:1c:ed:e3",
        "rssi": -87,
        "canal": "11",
        "frecuenciaMhz": 2462
      },
      {
        "ssid": "Administracion",
        "bssid": "06:92:bf:ca:f9:19",
        "rssi": -72,
        "canal": "11",
        "frecuenciaMhz": 2462
      },
      {
        "ssid": "movistar2,4GHZ_884CEF",
        "bssid": "fe:12:63:2c:5d:88",
        "rssi": -85,
        "canal": "1",
        "frecuenciaMhz": 2412
      },
      {
        "ssid": "Administracion",
        "bssid": "06:92:bf:ca:f9:26",
        "rssi": -61,
        "canal": "1",
        "frecuenciaMhz": 2412
      },
      {
        "ssid": "Hippocampus",
        "bssid": "dc:9f:db:1c:ed:e3",
        "rssi": -82,
        "canal": "11",
        "frecuenciaMhz": 2462
      },
      {
        "ssid": "HiddenSSID",
        "bssid": "16:5a:95:cb:6a:87",
        "rssi": -88,
        "canal": "4(6)",
        "frecuenciaMhz": 2427
      }
    ],
    "redesSinRssi": [
      {
        "ssid": "Hippocampus",
        "bssid": "68:d7:9a:14:fd:a8",
        "canal": "6"
      }
    ]
  }
];

export const REFERENCIAS_WIFI_COMPARTIDAS: readonly ReferenciaSectorWifi[] = [
  {
    "id": "movistar-sector-hall",
    "nombre": "Referencia Movistar del sector Hall",
    "nodoIds": [
      "mini-market-proa-nivel-1",
      "zona-play-nivel-1",
      "zona-juego-adulto-nivel-1",
      "zona-kid-nivel-1"
    ],
    "huellaOrigenId": "hall",
    "nodoMedidoId": "hall-nivel-1",
    "ssid": "movistar2,4GHZ_E23C58",
    "bssid": "e4:ab:89:e2:3c:58",
    "observacion": "El usuario indicó que la señal del Hall sirve como referencia compartida para Proa, Play, Juegos Adultos y Kids. No se duplican los −36 dBm del Hall como si fueran mediciones individuales en esos lugares.",
    "fuente": {
      "archivo": "WhatsApp Video 2026-10-21 at 23.20.39.mp4",
      "libraryFileId": "libfile_72614548a6e8819192bca4218ade3ee8"
    }
  }
];
