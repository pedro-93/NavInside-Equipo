export interface FotoDestino {
  src: string;
  alt: string;
}

/** Fotografías utilizadas en los mapas de referencia y en la tarjeta del destino. */
export const FOTOS_DESTINOS: Record<string, FotoDestino> = {
  'zona-kid-nivel-1': { src: 'assets/mapa/destinos/mini-club.webp', alt: 'Interior del Mini Club Kids' },
  'zona-play-nivel-1': { src: 'assets/mapa/destinos/zona-play.webp', alt: 'Zona Play' },
  'mini-market-proa-nivel-1': { src: 'assets/mapa/destinos/minimarket-proa.webp', alt: 'Minimarket Proa' },
  'zona-juego-adulto-nivel-1': { src: 'assets/mapa/destinos/juegos-adultos.webp', alt: 'Zona de juegos de adultos' },
  'hall-nivel-1': { src: 'assets/mapa/destinos/hall.webp', alt: 'Hall central' },
  'salon-eventos-terramar-nivel-1': { src: 'assets/mapa/destinos/salon-terramar.webp', alt: 'Salón TerraMar' },
  'gimnasio-nivel-1': { src: 'assets/mapa/destinos/gimnasio.webp', alt: 'Gimnasio' },
  'alma-spa-nivel-1': { src: 'assets/mapa/destinos/alma-spa.webp', alt: 'Alma Spa del Nivel 1' },
  'salon-eventos-montemar-nivel-1': { src: 'assets/mapa/destinos/salon-montemar.webp', alt: 'Salón MonteMar' },
  'salon-eventos-altamar-nivel-1': { src: 'assets/mapa/destinos/salon-altamar.webp', alt: 'Salón Altamar' },
  'ascensor-central-nivel-3': { src: 'assets/mapa/destinos/edificio-principal.webp', alt: 'Edificio principal frente a las piscinas' },
  'piscina-acceso-escalones-nivel-3': { src: 'assets/mapa/destinos/piscina-exterior.webp', alt: 'Piscina exterior' },
  'piscina-acceso-accesible-nivel-3': { src: 'assets/mapa/destinos/piscina-exterior.webp', alt: 'Piscina exterior, acceso accesible' },
  'piscina-temperada-nivel-3': { src: 'assets/mapa/destinos/piscina-temperada.webp', alt: 'Piscina temperada' },
  'restaurant-faro-nivel-3': { src: 'assets/mapa/destinos/restaurant-faro.webp', alt: 'Restaurant Faro' },
  'canchas-tenis-nivel-3': { src: 'assets/mapa/destinos/canchas-tenis.webp', alt: 'Canchas de tenis' }
};
