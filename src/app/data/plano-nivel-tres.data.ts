import { ZonaMapaInteractiva } from './plano-nivel-uno.data';

/** Puntos colocados sobre el plano visual confirmado del Nivel 3. */
export const POSICIONES_PLANO_NIVEL_TRES: Record<string, readonly [number, number]> = {
  'ascensor-central-nivel-3': [665, 700],
  'piscina-acceso-escalones-nivel-3': [520, 520],
  'piscina-acceso-accesible-nivel-3': [625, 520],
  'piscina-temperada-nivel-3': [755, 480],
  'restaurant-faro-nivel-3': [915, 515],
  'canchas-tenis-nivel-3': [240, 680]
};

/** Curvas de referencia para que la ruta siga la orientación del mapa. */
export const TRAMOS_PLANO_NIVEL_TRES: Record<string, readonly (readonly [number, number])[]> = {
  'ascensor-central-nivel-3|piscina-acceso-escalones-nivel-3': [[665, 610], [520, 610]],
  'ascensor-central-nivel-3|piscina-acceso-accesible-nivel-3': [[665, 610], [625, 610]],
  'ascensor-central-nivel-3|piscina-temperada-nivel-3': [[665, 610], [755, 610]],
  'ascensor-central-nivel-3|restaurant-faro-nivel-3': [[665, 610], [915, 610]],
  'ascensor-central-nivel-3|canchas-tenis-nivel-3': [[450, 700], [385, 680]]
};

/** Zonas transparentes que vuelven seleccionables los destinos dibujados. */
export const ZONAS_CLICABLES_NIVEL_TRES: readonly ZonaMapaInteractiva[] = [
  { nodoId: 'canchas-tenis-nivel-3', x: 97, y: 572, ancho: 288, alto: 204 },
  { nodoId: 'piscina-acceso-escalones-nivel-3', x: 351, y: 357, ancho: 341, alto: 200 },
  { nodoId: 'piscina-temperada-nivel-3', x: 690, y: 369, ancho: 121, alto: 186 },
  { nodoId: 'restaurant-faro-nivel-3', x: 831, y: 482, ancho: 167, alto: 58 },
  { nodoId: 'ascensor-central-nivel-3', x: 483, y: 616, ancho: 386, alto: 157 }
];
