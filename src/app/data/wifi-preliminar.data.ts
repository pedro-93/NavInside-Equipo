export type EstadoPuntoWifi =
  | 'pendiente_validacion'
  | 'validado';

export interface PuntoWifiPreliminar {
  id: string;
  ubicacion: string;
  cobertura: string | null;
  ssids: string[];
  piso: number | null;
  bssid: string | null;
  rssiReferencia: number | null;
  estado: EstadoPuntoWifi;
  observaciones: string | null;
}

export const SSIDS_HIPPOCAMPUS: string[] = [
  'Administracion',
  'hippocampus'
];

export const PUNTOS_WIFI_PRELIMINARES:
  PuntoWifiPreliminar[] = [
    {
      id: 'wifi-restaurant',
      ubicacion: 'Restaurant',
      cobertura: 'Restaurant',
      ssids: SSIDS_HIPPOCAMPUS,
      piso: null,
      bssid: null,
      rssiReferencia: null,
      estado: 'pendiente_validacion',
      observaciones:
        'Ubicación y cobertura informadas. Falta identificar la antena.'
    },
    {
      id: 'wifi-hall-piso-1',
      ubicacion: 'Hall Piso 1',
      cobertura: 'Hall Piso 1',
      ssids: SSIDS_HIPPOCAMPUS,
      piso: 1,
      bssid: null,
      rssiReferencia: null,
      estado: 'pendiente_validacion',
      observaciones:
        'Falta obtener BSSID y mediciones RSSI.'
    },
    {
      id: 'wifi-salon-montemar-1',
      ubicacion: 'Salón Montemar',
      cobertura: 'Salón Montemar',
      ssids: SSIDS_HIPPOCAMPUS,
      piso: null,
      bssid: null,
      rssiReferencia: null,
      estado: 'pendiente_validacion',
      observaciones:
        'Primer punto informado para el sector Montemar.'
    },
    {
      id: 'wifi-salon-terramar',
      ubicacion: 'Salón Terramar',
      cobertura: 'Salón Terramar',
      ssids: SSIDS_HIPPOCAMPUS,
      piso: null,
      bssid: null,
      rssiReferencia: null,
      estado: 'pendiente_validacion',
      observaciones:
        'Falta confirmar piso, BSSID y potencia de referencia.'
    },
    {
      id: 'wifi-salon-montemar-3',
      ubicacion: 'Salón Montemar',
      cobertura: 'Salón Montemar 3',
      ssids: SSIDS_HIPPOCAMPUS,
      piso: null,
      bssid: null,
      rssiReferencia: null,
      estado: 'pendiente_validacion',
      observaciones:
        'Tercer punto informado para el sector Montemar.'
    },
    {
      id: 'wifi-poste-departamentos-nuevos',
      ubicacion: 'Poste Departamentos Nuevos',
      cobertura:
        'Departamentos nuevos',
      ssids: SSIDS_HIPPOCAMPUS,
      piso: null,
      bssid: null,
      rssiReferencia: null,
      estado: 'pendiente_validacion',
      observaciones:
        'Cobertura informada para departamentos 1101 a 1605. Debe verificarse en terreno.'
    },
    {
      id: 'wifi-poste-paseo',
      ubicacion: 'Poste Paseo',
      cobertura: 'Ex parque',
      ssids: SSIDS_HIPPOCAMPUS,
      piso: null,
      bssid: null,
      rssiReferencia: null,
      estado: 'pendiente_validacion',
      observaciones:
        'Falta confirmar la denominación actual del sector.'
    },
    {
      id: 'wifi-salon-montemar-2',
      ubicacion: 'Salón Montemar',
      cobertura: 'Salón Montemar 2',
      ssids: SSIDS_HIPPOCAMPUS,
      piso: null,
      bssid: null,
      rssiReferencia: null,
      estado: 'pendiente_validacion',
      observaciones:
        'Segundo punto informado para el sector Montemar.'
    },
    {
      id: 'wifi-salon-costamar',
      ubicacion: 'Salón Costamar',
      cobertura: 'Salón Costamar',
      ssids: SSIDS_HIPPOCAMPUS,
      piso: null,
      bssid: null,
      rssiReferencia: null,
      estado: 'pendiente_validacion',
      observaciones:
        'Falta confirmar piso y posición en el plano.'
    },
    {
      id: 'wifi-stock',
      ubicacion: 'Stock',
      cobertura: 'Stock',
      ssids: SSIDS_HIPPOCAMPUS,
      piso: null,
      bssid: null,
      rssiReferencia: null,
      estado: 'pendiente_validacion',
      observaciones:
        'Falta identificar ubicación física exacta.'
    },
    {
      id: 'wifi-faro',
      ubicacion: 'Faro',
      cobertura: 'Faro',
      ssids: SSIDS_HIPPOCAMPUS,
      piso: null,
      bssid: null,
      rssiReferencia: null,
      estado: 'pendiente_validacion',
      observaciones:
        'Falta confirmar si corresponde al Restaurant Faro.'
    },
    {
      id: 'wifi-edificio-5-1',
      ubicacion: 'Edificio 5.1',
      cobertura: 'Edificio 5.1',
      ssids: SSIDS_HIPPOCAMPUS,
      piso: null,
      bssid: null,
      rssiReferencia: null,
      estado: 'pendiente_validacion',
      observaciones:
        'Falta determinar cobertura por piso.'
    },
    {
      id: 'wifi-edificio-5-2',
      ubicacion: 'Edificio 5.2',
      cobertura: 'Edificio 5.2',
      ssids: SSIDS_HIPPOCAMPUS,
      piso: null,
      bssid: null,
      rssiReferencia: null,
      estado: 'pendiente_validacion',
      observaciones:
        'Falta determinar cobertura por piso.'
    },
    {
      id: 'wifi-central-telefonica',
      ubicacion: 'Central Telefónica',
      cobertura: null,
      ssids: SSIDS_HIPPOCAMPUS,
      piso: null,
      bssid: null,
      rssiReferencia: null,
      estado: 'pendiente_validacion',
      observaciones:
        'Cobertura no especificada.'
    },
    {
      id: 'wifi-sector-piso-4-departamentos-viejos',
      ubicacion:
        'Sector Piso 4 Departamentos Viejos',
      cobertura: null,
      ssids: SSIDS_HIPPOCAMPUS,
      piso: 4,
      bssid: null,
      rssiReferencia: null,
      estado: 'pendiente_validacion',
      observaciones:
        'Cobertura no especificada.'
    },
    {
      id: 'wifi-salon-altamar',
      ubicacion: 'Salón Altamar',
      cobertura: null,
      ssids: SSIDS_HIPPOCAMPUS,
      piso: 1,
      bssid: null,
      rssiReferencia: null,
      estado: 'pendiente_validacion',
      observaciones:
        'Cobertura, BSSID y RSSI pendientes de validación.'
    }
  ];

export const SECTORES_COBERTURA_LIMITADA:
  string[] = [
    'Oficinas de administración',
    'Pasillos del edificio 1',
    'Pasillos del edificio 3',
    'Pasillos del edificio 4'
  ];

export const CONFIGURACION_WIFI_PRELIMINAR = {
  bandasGhz: [
    2.4,
    5
  ],
  canalesAutomaticos: true,
  usoPosicionamientoActivo: false,
  requiereBssid: true,
  requiereMedicionesRssi: true
} as const;