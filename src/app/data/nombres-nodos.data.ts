import {
  Idioma
} from '../services/idioma.service';

const NOMBRES_NODOS: Record<
  Idioma,
  Record<string, string>
> = {
  es: {
    'ascensor-central-nivel-1': 'Ascensor principal',
    'zona-kid-nivel-1': 'Mini Club Kids',
    'zona-juego-adulto-nivel-1': 'Zona de juegos de adultos',
    'zona-play-nivel-1': 'Zona Play',
    'hall-nivel-1': 'Hall',
    'mini-market-proa-nivel-1': 'Minimarket Proa',
    'gimnasio-nivel-1': 'Gimnasio',
    'salon-eventos-montemar-nivel-1': 'Salón MonteMar',
    'salon-eventos-terramar-nivel-1': 'Salón TerraMar',
    'alma-spa-nivel-1': 'Alma Spa',
    'ascensor-habitaciones-nivel-1': 'Ascensores de habitaciones',
    entrada: 'Entrada',
    recepcion: 'Recepción',
    pasillo: 'Pasillo principal',
    'habitacion-101': 'Habitación 101',
    baño: 'Baño',
    ascensor: 'Ascensor nivel 1',
    'escalera-nivel-1':
      'Escalera nivel 1',
    'ascensor-nivel-3':
      'Ascensor nivel 3',
    'escalera-nivel-3':
      'Escalera nivel 3',
    'pasillo-nivel-3':
      'Pasillo nivel 3',
    'salon-nivel-3':
      'Salón nivel 3'
  },

  en: {
    'ascensor-central-nivel-1': 'Main elevator',
    'zona-kid-nivel-1': 'Mini Club Kids',
    'zona-juego-adulto-nivel-1': 'Adult Games Area',
    'zona-play-nivel-1': 'Play Area',
    'hall-nivel-1': 'Hall',
    'mini-market-proa-nivel-1': 'Minimarket Proa',
    'gimnasio-nivel-1': 'Gym',
    'salon-eventos-montemar-nivel-1': 'MonteMar Lounge',
    'salon-eventos-terramar-nivel-1': 'TerraMar Lounge',
    'alma-spa-nivel-1': 'Alma Spa',
    'ascensor-habitaciones-nivel-1': 'Guest elevators',
    entrada: 'Entrance',
    recepcion: 'Reception',
    pasillo: 'Main corridor',
    'habitacion-101': 'Room 101',
    baño: 'Restroom',
    ascensor: 'Elevator level 1',
    'escalera-nivel-1':
      'Stairs level 1',
    'ascensor-nivel-3':
      'Elevator level 3',
    'escalera-nivel-3':
      'Stairs level 3',
    'pasillo-nivel-3':
      'Corridor level 3',
    'salon-nivel-3':
      'Hall level 3'
  },

  pt: {
    'ascensor-central-nivel-1': 'Elevador principal',
    'zona-kid-nivel-1': 'Mini Club Kids',
    'zona-juego-adulto-nivel-1': 'Área de Jogos para Adultos',
    'zona-play-nivel-1': 'Zona Play',
    'hall-nivel-1': 'Hall',
    'mini-market-proa-nivel-1': 'Minimarket Proa',
    'gimnasio-nivel-1': 'Academia',
    'salon-eventos-montemar-nivel-1': 'Salão MonteMar',
    'salon-eventos-terramar-nivel-1': 'Salão TerraMar',
    'alma-spa-nivel-1': 'Alma Spa',
    'ascensor-habitaciones-nivel-1': 'Elevadores dos quartos',
    entrada: 'Entrada',
    recepcion: 'Recepção',
    pasillo: 'Corredor principal',
    'habitacion-101': 'Quarto 101',
    baño: 'Banheiro',
    ascensor: 'Elevador nível 1',
    'escalera-nivel-1':
      'Escada nível 1',
    'ascensor-nivel-3':
      'Elevador nível 3',
    'escalera-nivel-3':
      'Escada nível 3',
    'pasillo-nivel-3':
      'Corredor nível 3',
    'salon-nivel-3':
      'Salão nível 3'
  }
};

export function obtenerNombreNodo(
  nodoId: string,
  idioma: Idioma,
  nombrePredeterminado: string
): string {
  return (
    NOMBRES_NODOS[idioma][nodoId] ??
    NOMBRES_NODOS.es[nodoId] ??
    nombrePredeterminado
  );
}
