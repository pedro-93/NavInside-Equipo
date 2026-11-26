import { Nodo } from '../models/nodo.model';

const POR_NOMBRE: readonly [RegExp, string, string][] = [
  [/ascensor/, '🛗', 'ascensor'],
  [/escaler/, '🪜', 'escalera'],
  [/toalla/, '🧺', 'toallas'],
  [/bano|camarin/, '🚻', 'banos'],
  [/jacuzzi|tinaja|hot ?tub/, '♨️', 'jacuzzi'],
  [/sauna/, '🧖', 'sauna'],
  [/masaje|spa/, '💆', 'spa'],
  [/gimnasio|gym/, '🏋️', 'gimnasio'],
  [/tobogan/, '🛝', 'tobogan'],
  [/piscina|pool/, '🏊', 'piscina'],
  [/restaurant/, '🍽️', 'restaurante'],
  [/terraza/, '☀️', 'terraza'],
  [/mirador/, '🌊', 'mirador'],
  [/cancha|tenis/, '🎾', 'cancha'],
  [/salon|evento/, '🎉', 'salon'],
  [/recepcion/, '🛎️', 'recepcion'],
  [/lobby/, '🛋️', 'lobby'],
  [/hall/, '🏛️', 'hall'],
  [/minimarket|market/, '🛒', 'minimarket'],
  [/kid|club/, '🧸', 'kids'],
  [/juego|play/, '🎮', 'juegos'],
  [/habitacion/, '🛏️', 'habitacion'],
  [/pasillo/, '🚶', 'pasillo'],
  [/entrada|puerta|acceso/, '🚪', 'puerta'],
  [/estacionamiento/, '🅿️', 'estacionamiento']
];

const POR_TIPO: Partial<Record<Nodo['tipo'], [string, string]>> = {
  ascensor: ['🛗', 'ascensor'],
  escalera: ['🪜', 'escalera'],
  rampa: ['♿', 'rampa'],
  baño: ['🚻', 'banos'],
  salon: ['🎉', 'salon'],
  piscina: ['🏊', 'piscina'],
  restaurante: ['🍽️', 'restaurante'],
  mirador: ['🌊', 'mirador'],
  cancha: ['🎾', 'cancha'],
  spa: ['💆', 'spa'],
  gimnasio: ['🏋️', 'gimnasio'],
  recepcion: ['🛎️', 'recepcion'],
  entrada: ['🚪', 'puerta'],
  pasillo: ['🚶', 'pasillo'],
  habitacion: ['🛏️', 'habitacion'],
  estacionamiento: ['🅿️', 'estacionamiento'],
  parque: ['🌳', 'parque']
};

export const CARPETA_ICONOS_PUNTOS = 'assets/iconos-puntos/';

export function normalizarTexto(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function buscar(texto: string, tipo?: Nodo['tipo']): [string, string] {
  const encontrado = POR_NOMBRE.find(([re]) => re.test(texto));
  if (encontrado) return [encontrado[1], encontrado[2]];
  return (tipo && POR_TIPO[tipo]) || ['📍', 'punto'];
}

export function iconoPunto(nodo: Pick<Nodo, 'id' | 'nombre' | 'tipo'>, nombreVisible = ''): string {
  return buscar(normalizarTexto(`${nombreVisible} ${nodo.nombre} ${nodo.id}`), nodo.tipo)[0];
}

export function imagenIconoPunto(nodo: Pick<Nodo, 'id' | 'nombre' | 'tipo'>, nombreVisible = ''): string {
  return `${CARPETA_ICONOS_PUNTOS}${buscar(normalizarTexto(`${nombreVisible} ${nodo.nombre} ${nodo.id}`), nodo.tipo)[1]}.svg`;
}

export function imagenIconoPorNombre(nombre: string): string {
  return `${CARPETA_ICONOS_PUNTOS}${buscar(normalizarTexto(nombre))[1]}.svg`;
}
