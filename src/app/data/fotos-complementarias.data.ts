import type { FotoDestino } from './fotos-destinos.data';

export const FOTOS_COMPLEMENTARIAS: Record<string, FotoDestino> = {
  'entrada-nivel-4': { src: 'assets/mapa/destinos/entrada-nivel-4.jpg', alt: 'Entrada principal de Hippocampus Resort' },
  'recepcion-turismo-vina-nivel-4': { src: 'assets/mapa/destinos/recepcion-turismo-vina-nivel-4.jpg', alt: 'Recepción Turismo Viña' },
  'recepcion-resort-nivel-4': { src: 'assets/mapa/destinos/recepcion-hippocampus-nivel-4.jpg', alt: 'Recepción Hippocampus Resort' },
  'ascensor-central-nivel-4': { src: 'assets/mapa/destinos/ascensor-nivel-4.jpg', alt: 'Ascensor central en el Nivel 4' },
  'zona-kid-nivel-1': { src: 'assets/mapa/destinos/hd/mini-club.jpg', alt: 'Interior del Mini Club Kids' },
  'zona-play-nivel-1': { src: 'assets/mapa/destinos/hd/zona-play.jpg', alt: 'Zona Play' },
  'mini-market-proa-nivel-1': { src: 'assets/mapa/destinos/hd/minimarket-proa.jpg', alt: 'Minimarket Proa' },
  'zona-juego-adulto-nivel-1': { src: 'assets/mapa/destinos/hd/juegos-adultos.jpg', alt: 'Zona de juegos de adultos', galeria: [{ src: 'assets/mapa/destinos/hd/juegos-adultos-2.jpg', alt: 'Baños junto a la sala de juegos de adultos' }] },
  'hall-nivel-1': { src: 'assets/mapa/destinos/hd/hall.jpg', alt: 'Hall central' },
  'salon-eventos-terramar-nivel-1': { src: 'assets/mapa/destinos/hd/salon-terramar.jpg', alt: 'Salón TerraMar' },
  'gimnasio-nivel-1': { src: 'assets/mapa/destinos/hd/gimnasio.jpg', alt: 'Gimnasio' },
  'alma-spa-nivel-1': { src: 'assets/mapa/destinos/hd/alma-spa.jpg', alt: 'Alma Spa del Nivel 1' },
  'salon-eventos-montemar-nivel-1': { src: 'assets/mapa/destinos/hd/salon-montemar.jpg', alt: 'Salón MonteMar' },
  'salon-eventos-altamar-nivel-1': { src: 'assets/mapa/destinos/hd/salon-altamar.jpg', alt: 'Salón Altamar' },
  'ascensor-central-nivel-3': { src: 'assets/mapa/destinos/edificio-hippocampus-vista-aerea.webp', alt: 'Vista aérea del edificio principal y las piscinas de Hippocampus' },
  'piscina-acceso-escalones-nivel-3': { src: 'assets/mapa/destinos/piscina-exterior.webp', alt: 'Piscina exterior', galeria: [{ src: 'assets/mapa/destinos/hd/piscina-principal-2.jpg', alt: 'Piscina principal' }] },
  'piscina-acceso-accesible-nivel-3': { src: 'assets/mapa/destinos/piscina-exterior.webp', alt: 'Piscina exterior, acceso accesible', galeria: [{ src: 'assets/mapa/destinos/hd/piscina-principal-2.jpg', alt: 'Piscina principal' }] },
  'piscina-temperada-nivel-3': { src: 'assets/mapa/destinos/hd/piscina-temperada.jpg', alt: 'Piscina temperada', galeria: [{ src: 'assets/mapa/destinos/hd/piscina-temperada-2.jpg', alt: 'Piscina temperada' }, { src: 'assets/mapa/destinos/hd/piscina-temperada-3.jpg', alt: 'Piscina temperada' }] },
  'restaurant-faro-nivel-3': { src: 'assets/mapa/destinos/hd/restaurant-faro.jpg', alt: 'Restaurant Faro', galeria: [{ src: 'assets/mapa/destinos/hd/restaurant-faro-2.jpg', alt: 'Terraza del Restaurant Faro' }] },
  'canchas-tenis-nivel-3': { src: 'assets/mapa/destinos/canchas-tenis.webp', alt: 'Canchas de tenis' },
  'puerta-acceso-tinajas-piso-6': {
    src: 'assets/mapa/destinos/puerta-hot-tubs-piso-6.jpg',
    alt: 'Puerta de vidrio de Alma Spa bajo el letrero ESCALERA, al fondo del pasillo del Piso 6',
    galeria: [
      {
        src: 'assets/mapa/destinos/tinajas-piso-6.jfif',
        alt: 'Hot tubs con vista al mar, pasando la puerta de Alma Spa'
      }
    ]
  },
  'alma-spa-tinaja-piso-6': {
    src: 'assets/mapa/destinos/alma-spa-masajes-piso-6.jfif',
    alt: 'Alma Spa Masajes en el Piso 6',
    galeria: [
      {
        src: 'assets/mapa/destinos/sauna-piso-6.jfif',
        alt: 'Sauna de Alma Spa en el Piso 6, junto al sector de masajes'
      }
    ]
  }
};
