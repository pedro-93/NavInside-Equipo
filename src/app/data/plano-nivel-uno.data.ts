export const POSICIONES_PLANO_NIVEL_UNO: Record<string, readonly [number, number]> = {
  'ascensor-central-nivel-1': [170, 455],
  'zona-kid-nivel-1': [300, 210],
  'zona-juego-adulto-nivel-1': [170, 660],
  'zona-play-nivel-1': [480, 210],
  'hall-nivel-1': [800, 455],
  'toallas-nivel-1': [1070, 710],
  'salon-eventos-altamar-nivel-1': [1108, 286],
  'mini-market-proa-nivel-1': [660, 210],
  'salon-eventos-terramar-nivel-1': [900, 710],
  'gimnasio-nivel-1': [1070, 826],
  'alma-spa-nivel-1': [1230, 710],
  'salon-eventos-montemar-nivel-1': [1390, 710],
  'ascensor-habitaciones-nivel-1': [1517, 425]
};

export const TRAMOS_PLANO_NIVEL_UNO: Record<string, readonly (readonly [number, number])[]> = {
  'ascensor-central-nivel-1|zona-kid-nivel-1': [[300, 455], [300, 285]],
  'ascensor-central-nivel-1|zona-juego-adulto-nivel-1': [[300, 455], [300, 660]],
  'ascensor-central-nivel-1|zona-play-nivel-1': [[300, 455], [300, 285], [480, 285]],
  'hall-nivel-1|mini-market-proa-nivel-1': [[900, 455], [900, 285], [660, 285]],
  'hall-nivel-1|gimnasio-nivel-1': [[900, 455], [900, 585], [1070, 585], [1070, 826]],
  'hall-nivel-1|toallas-nivel-1': [[900, 455], [900, 585], [1070, 585]],
  'hall-nivel-1|salon-eventos-altamar-nivel-1': [[885, 373], [970, 315], [1108, 315]],
  'hall-nivel-1|salon-eventos-terramar-nivel-1': [[900, 585], [900, 710]],
  'hall-nivel-1|alma-spa-nivel-1': [[900, 455], [900, 585], [1230, 585], [1230, 710]],
  'hall-nivel-1|salon-eventos-montemar-nivel-1': [[900, 455], [900, 585], [1390, 585]],
  'salon-eventos-montemar-nivel-1|ascensor-habitaciones-nivel-1': [[1517, 710], [1517, 500]]
};

export interface ZonaMapaInteractiva {
  nodoId: string;
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

export const ZONAS_CLICABLES_NIVEL_UNO: readonly ZonaMapaInteractiva[] = [
  { nodoId: 'zona-kid-nivel-1', x: 215, y: 135, ancho: 170, alto: 150 },
  { nodoId: 'zona-play-nivel-1', x: 395, y: 135, ancho: 170, alto: 150 },
  { nodoId: 'mini-market-proa-nivel-1', x: 575, y: 135, ancho: 170, alto: 150 },
  { nodoId: 'ascensor-central-nivel-1', x: 62, y: 370, ancho: 216, alto: 170 },
  { nodoId: 'hall-nivel-1', x: 700, y: 390, ancho: 200, alto: 130 },
  { nodoId: 'toallas-nivel-1', x: 990, y: 650, ancho: 160, alto: 120 },
  { nodoId: 'salon-eventos-altamar-nivel-1', x: 1020, y: 225, ancho: 180, alto: 120 },
  { nodoId: 'zona-juego-adulto-nivel-1', x: 62, y: 585, ancho: 216, alto: 150 },
  { nodoId: 'salon-eventos-terramar-nivel-1', x: 825, y: 650, ancho: 150, alto: 120 },
  { nodoId: 'gimnasio-nivel-1', x: 990, y: 785, ancho: 160, alto: 82 },
  { nodoId: 'alma-spa-nivel-1', x: 1155, y: 650, ancho: 150, alto: 120 },
  { nodoId: 'salon-eventos-montemar-nivel-1', x: 1310, y: 650, ancho: 160, alto: 120 },
  { nodoId: 'ascensor-habitaciones-nivel-1', x: 1435, y: 350, ancho: 165, alto: 150 }
];
