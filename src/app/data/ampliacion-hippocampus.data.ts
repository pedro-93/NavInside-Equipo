import type { Conexion, Nodo, TipoConexion } from '../models/nodo.model';

export const NODOS_COMPLEMENTARIOS: Nodo[] = [
  { id:'ascensor-central-nivel-5',nombre:'Ascensores centrales · Nivel 5',nivel:5,tipo:'ascensor',x:120,y:60,accesible:true },
  { id: 'lobby-nivel-4', nombre: 'Lobby', nivel: 4, tipo: 'recepcion', x: 2, y: 0 },
  { id: 'pasillo-habitaciones-nivel-4', nombre: 'Pasillo de habitaciones', nivel: 4, tipo: 'pasillo', x: 2, y: 0 },
  { id: 'acceso-costamar-nivel-4', nombre: 'Acceso al Salón CostaMar', nivel: 4, tipo: 'entrada', x: 2, y: 0 },
  { id: 'salon-costamar-nivel-5', nombre: 'Salón CostaMar', nivel: 5, tipo: 'salon', x: 0, y: 0 },
  { id: 'toallas-nivel-1', nombre: 'Entrega de Toallas', nivel: 1, tipo: 'servicio', x: 390, y: 100 },
  { id: 'acceso-gimnasio-nivel-1', nombre: 'Acceso al gimnasio · sector Toallas', nivel: 1, tipo: 'entrada', x: 390, y: 100 },
  { id: 'banos-damas-nivel-1', nombre: 'Baños Damas · Toallas', nivel: 1, tipo: 'baño', x: 390, y: 100 },
  { id: 'banos-varones-nivel-1', nombre: 'Baños Varones · Toallas', nivel: 1, tipo: 'baño', x: 390, y: 100 },
  { id: 'banos-juegos-adultos-nivel-1', nombre: 'Baños · Juegos de adultos', nivel: 1, tipo: 'baño', x: 177, y: 72 },
  { id: 'pasillo-los-faros-nivel-1', nombre: 'Pasillo Los Faros', nivel: 1, tipo: 'pasillo', x: 430, y: 164 },
  { id: 'salon-eventos-altamar-nivel-1', nombre: 'Salón de Eventos Altamar', nivel: 1, tipo: 'salon', x: 430, y: 164, restringido: false },
  { id: 'acceso-faro-nivel-3', nombre: 'Acceso al Restaurant Faro', nivel: 3, tipo: 'entrada', x: 7, y: 3 },
  { id: 'terraza-faro-nivel-3', nombre: 'Terraza Faro', nivel: 3, tipo: 'restaurante', x: 8, y: 3 },
  { id: 'piscina-tobogan-nivel-3', nombre: 'Piscina con tobogán', nivel: 3, tipo: 'piscina', x: 8, y: 4 },
  { id: 'jacuzzi-nivel-3', nombre: 'Jacuzzi · sector tobogán', nivel: 3, tipo: 'piscina', x: 8, y: 4 },
  { id: 'banos-camarines-nivel-3', nombre: 'Baños y camarines', nivel: 3, tipo: 'baño', x: 7, y: 3 },
  { id: 'mirador-nivel-3', nombre: 'Mirador', nivel: 3, tipo: 'mirador', x: 7, y: 6 },
  { id: 'ascensor-habitaciones-nivel-3', nombre: 'Ascensores de habitaciones · sector Mirador', nivel: 3, tipo: 'ascensor', x: 7, y: 6 },
  { id: 'tinajas-piso-6', nombre: 'Tinajas de Alma Spa', nivel: 6, tipo: 'spa', x: 6, y: 0 },
  { id: 'sauna-piso-6', nombre: 'Sauna de Alma Spa', nivel: 6, tipo: 'spa', x: 8, y: 0 }
];

function tramoDeReferencia(origen: string, destino: string, tipo: TipoConexion = 'pasillo'): Conexion {
  return { origen, destino, tipo, distancia: null, habilitada: true };
}

export const CONEXIONES_COMPLEMENTARIAS: Conexion[] = [
  ...[1,3,4].map(nivel=>({origen:`ascensor-central-nivel-${nivel}`,destino:'ascensor-central-nivel-5',
    distancia:0,tipo:'ascensor' as const,accesible:true,habilitada:true})),
  tramoDeReferencia('ascensor-central-nivel-5','salon-costamar-nivel-5'),
  {
    origen: 'ascensor-central-nivel-4',
    destino: 'ascensor-central-nivel-1',
    distancia: 0,
    tipo: 'ascensor',
    accesible: true,
    restringida: false,
    habilitada: true
  },
  {
    origen: 'hall-nivel-1',
    destino: 'salon-eventos-altamar-nivel-1',
    distancia: null,
    tipo: 'pasillo',
    restringida: false,
    habilitada: true
  },
  tramoDeReferencia('entrada-nivel-4', 'lobby-nivel-4'),
  tramoDeReferencia('lobby-nivel-4', 'pasillo-habitaciones-nivel-4'),
  tramoDeReferencia('lobby-nivel-4', 'recepcion-turismo-vina-nivel-4'),
  tramoDeReferencia('lobby-nivel-4', 'recepcion-resort-nivel-4'),
  tramoDeReferencia('lobby-nivel-4', 'ascensor-central-nivel-4'),
  tramoDeReferencia('lobby-nivel-4', 'acceso-costamar-nivel-4'),
  tramoDeReferencia('acceso-costamar-nivel-4', 'salon-costamar-nivel-5', 'acceso'),
  tramoDeReferencia('acceso-escalera-izquierda-nivel-3', 'ascensor-central-nivel-3'),
  tramoDeReferencia('acceso-escalera-derecha-nivel-3', 'ascensor-central-nivel-3'),
  tramoDeReferencia('hall-nivel-1', 'toallas-nivel-1'),
  tramoDeReferencia('toallas-nivel-1', 'acceso-gimnasio-nivel-1'),
  tramoDeReferencia('acceso-gimnasio-nivel-1', 'gimnasio-nivel-1', 'escalera'),
  tramoDeReferencia('toallas-nivel-1', 'banos-damas-nivel-1'),
  tramoDeReferencia('toallas-nivel-1', 'banos-varones-nivel-1'),
  tramoDeReferencia('toallas-nivel-1', 'piscina-temperada-nivel-3', 'escalera'),
  tramoDeReferencia('zona-juego-adulto-nivel-1', 'banos-juegos-adultos-nivel-1'),
  tramoDeReferencia('hall-nivel-1', 'pasillo-los-faros-nivel-1'),
  tramoDeReferencia('pasillo-los-faros-nivel-1', 'salon-eventos-altamar-nivel-1'),
  tramoDeReferencia('restaurant-faro-nivel-3', 'acceso-faro-nivel-3'),
  tramoDeReferencia('acceso-faro-nivel-3', 'terraza-faro-nivel-3'),
  tramoDeReferencia('acceso-faro-nivel-3', 'piscina-tobogan-nivel-3'),
  tramoDeReferencia('piscina-tobogan-nivel-3', 'jacuzzi-nivel-3'),
  tramoDeReferencia('acceso-faro-nivel-3', 'banos-camarines-nivel-3'),
  tramoDeReferencia('acceso-faro-nivel-3', 'mirador-nivel-3'),
  tramoDeReferencia('mirador-nivel-3', 'ascensor-habitaciones-nivel-3'),
  {
    origen: 'ascensor-habitaciones-nivel-3',
    destino: 'ascensor-habitaciones-piso-6',
    tipo: 'ascensor',
    distancia: 0,
    direccionIda: 'bajar',
    habilitada: true
  },
  tramoDeReferencia('puerta-acceso-tinajas-piso-6', 'tinajas-piso-6'),
  tramoDeReferencia('alma-spa-tinaja-piso-6', 'sauna-piso-6')
];
