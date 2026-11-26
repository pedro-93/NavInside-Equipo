export const TOUR_HIPPOCAMPUS = 'https://tours.tourify.cl/group/E7IrjA8q6';
export const MINIATURAS_TOUR = 'https://gc.360-data.com/tours/fZt6r-cm46tu/fZt6r-cm46tu-';
export const IMAGENES_TOUR = 'assets/tour/';
export const COLECCION_ALMA_SPA = 'kM6vq2iluWcM';

interface ReferenciaTour {
  escenaId: string;
  miniatura?: string;
  nombre: string;
  lugarId?: string;
  nombreLugar?: { es: string; en: string; pt: string };
  esAcceso?: boolean;
}

const NOMBRE_PISCINA = { es: 'Piscina', en: 'Swimming pool', pt: 'Piscina' };

export const CATALOGO_TOUR: Readonly<Record<string, ReferenciaTour>> = {
  'entrada-nivel-4': {
    escenaId: 'QmcG15uI7G',
    miniatura: 'g4Qyxt_5uDw0-thumb.jpg',
    nombre: 'Entrada'
  },
  'lobby-nivel-4': {
    escenaId: 'oK_w-wZnOM',
    miniatura: 'JeTutcK7xb-j-thumb.jpeg',
    nombre: 'Lobby'
  },
  'pasillo-habitaciones-nivel-4': {
    escenaId: 'teu3P2hlrr',
    nombre: 'Pasillo de habitaciones'
  },
  'acceso-costamar-nivel-4': {
    escenaId: 'fV1x-5WeFj',
    miniatura: 'zYVz8M8aRKji-thumb.jpg',
    nombre: 'Entrada Salón Costamar',
    esAcceso: true
  },
  'salon-costamar-nivel-5': {
    escenaId: 'wmKo3wzc6K',
    miniatura: 'PlVhXGiCoAZS-thumb.jpg',
    nombre: 'Salón Costamar'
  },
  'hall-nivel-1': {
    escenaId: 'xvcIZG8VCX',
    miniatura: 'qUFAbxFaEp1V-thumb.jpeg',
    nombre: 'Hall Central'
  },
  'zona-kid-nivel-1': {
    escenaId: 'Oxu74OJhp',
    miniatura: 'kVHgQdm12BSk-thumb.jpg',
    nombre: 'Kids Club'
  },
  'zona-juego-adulto-nivel-1': {
    escenaId: 'rHlteASXSB',
    miniatura: 'TXerIe7YkSyF-thumb.jpg',
    nombre: 'Sala de juegos'
  },
  'zona-play-nivel-1': {
    escenaId: 'Od0iDyWKLe',
    miniatura: 'tjL1bJvxj20T-thumb.jpg',
    nombre: 'Zona Play'
  },
  'mini-market-proa-nivel-1': {
    escenaId: 'VK5ss-xH9s',
    miniatura: 'SAMjBINV17p--thumb.jpg',
    nombre: 'Minimarket Proa'
  },
  'gimnasio-nivel-1': {
    escenaId: 'cfuvPOpXuL',
    miniatura: 'RPpq9-S1hSdm-thumb.jpg',
    nombre: 'Gimnasio'
  },
  'acceso-gimnasio-nivel-1': {
    escenaId: '0O0OtkFsXG',
    miniatura: 'fNgqbuLlAMYi-thumb.jpeg',
    nombre: 'Acceso Gimnasio',
    esAcceso: true
  },
  'pasillo-los-faros-nivel-1': {
    escenaId: 'LUBm8LYEeE',
    miniatura: 'g_14BM30AEr8-thumb.jpeg',
    nombre: 'Pasillo Los Faros'
  },
  'salon-eventos-terramar-nivel-1': {
    escenaId: 'wBY2ZtoJjH',
    miniatura: '1bf08Qu5z1iH-thumb.jpg',
    nombre: 'Salón Terramar'
  },
  'salon-eventos-montemar-nivel-1': {
    escenaId: 'DtLW82gdZE',
    miniatura: 'Kvsw8CuodbJr-thumb.jpg',
    nombre: 'Salón Montemar'
  },
  'salon-eventos-altamar-nivel-1': {
    escenaId: 'LeSXndsYQP',
    miniatura: 'CEW-9CbOqDJQ-thumb.jpeg',
    nombre: 'Salón Altamar'
  },
  'piscina-acceso-escalones-nivel-3': {
    escenaId: 'EPQ9GZ6D9V',
    miniatura: 'hqEK12u31qVZ-thumb.jpg',
    nombre: 'Piscina · Acceso por escalones',
    lugarId: 'piscina-principal-nivel-3',
    nombreLugar: NOMBRE_PISCINA
  },
  'piscina-acceso-accesible-nivel-3': {
    escenaId: 'EPQ9GZ6D9V',
    miniatura: 'hqEK12u31qVZ-thumb.jpg',
    nombre: 'Piscina · Acceso accesible',
    lugarId: 'piscina-principal-nivel-3',
    nombreLugar: NOMBRE_PISCINA
  },
  'piscina-temperada-nivel-3': {
    escenaId: 'C2tXDoRgDy',
    miniatura: 'kQ7WIxo4gfiW-thumb.jpg',
    nombre: 'Piscina temperada'
  },
  'restaurant-faro-nivel-3': {
    escenaId: 'thBYUcbf8z',
    miniatura: '7-Ii0_cegOqa-thumb.jpg',
    nombre: 'Restaurant Faro'
  },
  'canchas-tenis-nivel-3': {
    escenaId: 'VD1_qeTicQ',
    miniatura: 'ExZ7VGXJ3wd0-thumb.jpg',
    nombre: 'Canchas de Tenis'
  },
  'acceso-faro-nivel-3': {
    escenaId: 'ecQCD3LVDm',
    miniatura: 'jp4n547lqUE-thumb.png',
    nombre: 'Entrada Restaurant Faro',
    esAcceso: true
  },
  'terraza-faro-nivel-3': {
    escenaId: 'F8vHOA_ca',
    miniatura: 'WU-qTdLMHj3h-thumb.jpg',
    nombre: 'Terraza Restaurant'
  },
  'piscina-tobogan-nivel-3': {
    escenaId: '_hl70VYeg',
    miniatura: '5XE8b9MOLPC-thumb.png',
    nombre: 'Piscina Tobogán'
  },
  'jacuzzi-nivel-3': {
    escenaId: 'YApikypAD',
    miniatura: 'HPLATxyvvtX-thumb.png',
    nombre: 'Jacuzzi'
  },
  'mirador-nivel-3': {
    escenaId: 'k-5EGMTquk',
    miniatura: 'rHKoeN7u3kd-thumb.png',
    nombre: 'Mirador'
  },
  'ascensor-habitaciones-piso-6': {
    escenaId: 'yQR_qVzYB',
    miniatura: 'JZ3bHBsIKVrJ-thumb.jpeg',
    nombre: 'Ascensor Piso 6 / Alma Spa'
  },
  'puerta-acceso-tinajas-piso-6': {
    escenaId: '0FJ0WS5Cn',
    miniatura: 'EOUJ1znJhikY-thumb.jpeg',
    nombre: 'Entrada Alma Spa',
    esAcceso: true
  },
  'tinajas-piso-6': {
    escenaId: 'dd9SEbg9qs',
    miniatura: '_xecyIQnJw-q-thumb.jpeg',
    nombre: 'Hot Tub (Tinajas)'
  },
  'alma-spa-tinaja-piso-6': {
    escenaId: 'oOPakK0mYd',
    miniatura: 'd_plGHIIXHM7-thumb.jpeg',
    nombre: 'Alma Spa Masajes y Sauna'
  }
};
