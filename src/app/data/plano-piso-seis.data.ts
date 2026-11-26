import { ZonaMapaInteractiva } from './plano-nivel-uno.data';

export const POSICIONES_PLANO_PISO_SEIS: Record<string, readonly [number, number]> = {
  'ascensor-habitaciones-piso-6': [1096, 350],
  'puerta-acceso-tinajas-piso-6': [241, 350],
  'alma-spa-tinaja-piso-6': [315, 520]
};

export const TRAMOS_PLANO_PISO_SEIS: Record<string, readonly (readonly [number, number])[]> = {
  'ascensor-habitaciones-piso-6|puerta-acceso-tinajas-piso-6': [
    [1085, 350], [980, 350], [875, 350], [770, 350],
    [665, 350], [560, 350], [455, 350], [350, 350],
    [255, 350]
  ],
  'puerta-acceso-tinajas-piso-6|alma-spa-tinaja-piso-6': [
    [241, 405], [270, 462], [300, 500]
  ]
};

export const ZONAS_CLICABLES_PISO_SEIS: readonly ZonaMapaInteractiva[] = [
  { nodoId: 'ascensor-habitaciones-piso-6', x: 1030, y: 280, ancho: 132, alto: 142 },
  { nodoId: 'puerta-acceso-tinajas-piso-6', x: 54, y: 603, ancho: 154, alto: 178 },
  { nodoId: 'alma-spa-tinaja-piso-6', x: 212, y: 603, ancho: 312, alto: 178 }
];
