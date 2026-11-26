import { CATALOGO_TOUR } from './catalogo-tour.data';
import {
  Idioma
} from '../services/idioma.service';

const NOMBRES_NODOS: Record<
  Idioma,
  Record<string, string>
> = {
  es: {
    entrada: 'Entrada',
    recepcion: 'Recepción',
    pasillo: 'Pasillo principal',
    'habitacion-101':
      'Habitación 101',
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
      'Salón nivel 3',

    'recepcion-turismo-vina-nivel-4':
      'Recepción Turismo Viña',
    'recepcion-resort-nivel-4':
      'Recepción Hippocampus',
    'ascensor-central-nivel-4':
      'Ascensores centrales · Nivel 4',
    'puerta-exterior-derecha-nivel-4':
      'Puerta Exterior Derecha',
    'puerta-exterior-izquierda-nivel-4':
      'Puerta Exterior Izquierda',

    'acceso-escalera-derecha-nivel-3':
      'Acceso Nivel 3 - Escalera Derecha',
    'acceso-escalera-izquierda-nivel-3':
      'Acceso Nivel 3 - Escalera Izquierda',
    'ascensor-central-nivel-3':
      'Salida Ascensor Central - Nivel 3',

    'ascensor-central-nivel-1':
      'Ascensor principal',
    'alma-spa-nivel-1':
      'Alma Spa',
    'ascensor-habitaciones-nivel-1':
      'Ascensores de habitaciones',

    'sauna-piso-6': 'Sauna de Alma Spa'
  },

  en: {
    entrada: 'Entrance',
    recepcion: 'Reception',
    pasillo: 'Main corridor',
    'habitacion-101':
      'Room 101',
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
      'Hall level 3',

    'entrada-nivel-4':
      'Entrance',
    'lobby-nivel-4': 'Lobby',
    'pasillo-habitaciones-nivel-4': 'Guest room corridor',
    'acceso-costamar-nivel-4': 'Costamar Hall entrance',
    'salon-costamar-nivel-5': 'Costamar Event Hall',
    'recepcion-turismo-vina-nivel-4':
      'Turismo Viña Reception',
    'recepcion-resort-nivel-4':
      'Hippocampus Reception',
    'ascensor-central-nivel-4':
      'Central elevators · Level 4',
    'puerta-exterior-derecha-nivel-4':
      'Right Exterior Door',
    'puerta-exterior-izquierda-nivel-4':
      'Left Exterior Door',

    'acceso-escalera-derecha-nivel-3':
      'Level 3 Access - Right Stairs',
    'acceso-escalera-izquierda-nivel-3':
      'Level 3 Access - Left Stairs',
    'ascensor-central-nivel-3':
      'Central Elevator Exit - Level 3',
    'piscina-acceso-escalones-nivel-3':
      'Swimming Pool - Stair Access',
    'piscina-acceso-accesible-nivel-3':
      'Swimming Pool - Accessible Entrance',
    'piscina-temperada-nivel-3':
      'Heated Swimming Pool',
    'restaurant-faro-nivel-3':
      'Faro Restaurant',
    'canchas-tenis-nivel-3':
      'Tennis Courts',

    'ascensor-central-nivel-1':
      'Main Elevator',
    'zona-kid-nivel-1':
      'Kids Club',
    'zona-juego-adulto-nivel-1':
      'Adult Games Area',
    'zona-play-nivel-1':
      'Play Area',
    'hall-nivel-1':
      'Hall',
    'mini-market-proa-nivel-1':
      'Proa Minimarket',
    'gimnasio-nivel-1':
      'Gym',
    'salon-eventos-montemar-nivel-1':
      'Montemar Event Hall',
    'salon-eventos-terramar-nivel-1':
      'Terramar Event Hall',
    'salon-eventos-altamar-nivel-1':
      'Altamar Event Hall',
    'alma-spa-nivel-1':
      'Alma Spa',
    'ascensor-habitaciones-nivel-1':
      'Guest Room Elevators',

    'ascensor-habitaciones-piso-6':
      'Guest Room Elevator Exit - Floor 6',
    'puerta-acceso-tinajas-piso-6':
      'Hot tubs and Alma Spa entrance',
    'alma-spa-tinaja-piso-6':
      'Alma Spa Massage and Sauna',
    'tinajas-piso-6': 'Alma Spa hot tubs',
    'sauna-piso-6': 'Alma Spa sauna',
    'toallas-nivel-1': 'Towel desk',
    'acceso-gimnasio-nivel-1': 'Gym entrance · Towel desk',
    'banos-damas-nivel-1': 'Women’s restrooms · Towel desk',
    'banos-varones-nivel-1': 'Men’s restrooms · Towel desk',
    'banos-juegos-adultos-nivel-1': 'Restrooms · Adult games area',
    'pasillo-los-faros-nivel-1': 'Los Faros corridor',
    'acceso-faro-nivel-3': 'Faro Restaurant entrance',
    'terraza-faro-nivel-3': 'Faro Terrace',
    'piscina-tobogan-nivel-3': 'Water slide pool',
    'jacuzzi-nivel-3': 'Jacuzzi · Water slide area',
    'banos-camarines-nivel-3': 'Restrooms and changing rooms',
    'mirador-nivel-3': 'Viewpoint',
    'ascensor-habitaciones-nivel-3': 'Guest room elevators · Viewpoint'
  },

  pt: {
    entrada: 'Entrada',
    recepcion: 'Recepção',
    pasillo: 'Corredor principal',
    'habitacion-101':
      'Quarto 101',
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
      'Salão nível 3',

    'entrada-nivel-4':
      'Entrada',
    'lobby-nivel-4': 'Lobby',
    'pasillo-habitaciones-nivel-4': 'Corredor dos quartos',
    'acceso-costamar-nivel-4': 'Acesso ao Salão Costamar',
    'salon-costamar-nivel-5': 'Salão de Eventos Costamar',
    'recepcion-turismo-vina-nivel-4':
      'Recepção Turismo Viña',
    'recepcion-resort-nivel-4':
      'Recepção Hippocampus',
    'ascensor-central-nivel-4':
      'Elevadores centrais · Nível 4',
    'puerta-exterior-derecha-nivel-4':
      'Porta Exterior Direita',
    'puerta-exterior-izquierda-nivel-4':
      'Porta Exterior Esquerda',

    'acceso-escalera-derecha-nivel-3':
      'Acesso ao Nível 3 - Escada Direita',
    'acceso-escalera-izquierda-nivel-3':
      'Acesso ao Nível 3 - Escada Esquerda',
    'ascensor-central-nivel-3':
      'Saída do Elevador Central - Nível 3',
    'piscina-acceso-escalones-nivel-3':
      'Piscina - Acesso por Escadas',
    'piscina-acceso-accesible-nivel-3':
      'Piscina - Acesso Acessível',
    'piscina-temperada-nivel-3':
      'Piscina Aquecida',
    'restaurant-faro-nivel-3':
      'Restaurante Faro',
    'canchas-tenis-nivel-3':
      'Quadras de Tênis',

    'ascensor-central-nivel-1':
      'Elevador Principal',
    'zona-kid-nivel-1':
      'Mini Club Infantil',
    'zona-juego-adulto-nivel-1':
      'Área de Jogos para Adultos',
    'zona-play-nivel-1':
      'Área de Recreação',
    'hall-nivel-1':
      'Hall',
    'mini-market-proa-nivel-1':
      'Minimercado Proa',
    'gimnasio-nivel-1':
      'Academia',
    'salon-eventos-montemar-nivel-1':
      'Salão de Eventos MonteMar',
    'salon-eventos-terramar-nivel-1':
      'Salão de Eventos TerraMar',
    'salon-eventos-altamar-nivel-1':
      'Salão de Eventos Altamar',
    'alma-spa-nivel-1':
      'Alma Spa',
    'ascensor-habitaciones-nivel-1':
      'Elevadores dos Quartos',

    'ascensor-habitaciones-piso-6':
      'Saída do Elevador dos Quartos - Andar 6',
    'puerta-acceso-tinajas-piso-6':
      'Entrada das banheiras e do Alma Spa',
    'alma-spa-tinaja-piso-6':
      'Alma Spa Massagens e Sauna',
    'tinajas-piso-6': 'Banheiras do Alma Spa',
    'sauna-piso-6': 'Sauna do Alma Spa',
    'toallas-nivel-1': 'Entrega de toalhas',
    'acceso-gimnasio-nivel-1': 'Acesso à academia · Toalhas',
    'banos-damas-nivel-1': 'Banheiros femininos · Toalhas',
    'banos-varones-nivel-1': 'Banheiros masculinos · Toalhas',
    'banos-juegos-adultos-nivel-1': 'Banheiros · Área de jogos para adultos',
    'pasillo-los-faros-nivel-1': 'Corredor Los Faros',
    'acceso-faro-nivel-3': 'Acesso ao Restaurante Faro',
    'terraza-faro-nivel-3': 'Terraço Faro',
    'piscina-tobogan-nivel-3': 'Piscina com toboágua',
    'jacuzzi-nivel-3': 'Jacuzzi · Setor do toboágua',
    'banos-camarines-nivel-3': 'Banheiros e vestiários',
    'mirador-nivel-3': 'Mirante',
    'ascensor-habitaciones-nivel-3': 'Elevadores dos quartos · Mirante'
  }
};

export function obtenerNombreNodo(
  nodoId: string,
  idioma: Idioma,
  nombrePredeterminado: string
): string {
  const nombreOficial = CATALOGO_TOUR[nodoId]?.nombre;
  return (
    (idioma === 'es' ? nombreOficial : undefined) ??
    NOMBRES_NODOS[idioma][nodoId] ??
    nombreOficial ??
    NOMBRES_NODOS.es[nodoId] ??
    nombrePredeterminado
  );
}
