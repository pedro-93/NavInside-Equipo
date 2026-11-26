import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const carpetaIonicons = join(root, 'node_modules', 'ionicons', 'dist', 'svg');
const salida = join(root, 'src', 'assets', 'iconos-puntos');
mkdirSync(salida, { recursive: true });

const PROPIOS = {
  ascensor: '<rect x="112" y="56" width="288" height="400" rx="40" fill="none" stroke="#fff" stroke-width="40"/><path d="M256 120l-76 92h152zM256 392l76-92H180z"/>',
  escalera: '<path d="M80 432h104v-96h96v-96h96v-96h56" fill="none" stroke="#fff" stroke-width="48" stroke-linejoin="round" stroke-linecap="round"/>',
  toallas: '<rect x="88" y="112" width="336" height="92" rx="26"/><rect x="88" y="228" width="336" height="92" rx="26"/><rect x="88" y="344" width="336" height="64" rx="22"/><rect x="120" y="140" width="64" height="36" rx="10" fill-opacity=".35"/>'
};

const ICONOS = {
  ascensor: ['propio:ascensor', '#2f6fd6'],
  escalera: ['propio:escalera', '#5d6d83'],
  toallas: ['propio:toallas', '#1f9e8f'],
  banos: ['male-female', '#3a7bd5'],
  jacuzzi: ['water', '#f07b3f'],
  sauna: ['flame', '#e4572e'],
  spa: ['flower', '#a659c2'],
  gimnasio: ['barbell', '#d9534f'],
  tobogan: ['water', '#159fd6'],
  piscina: ['water', '#1b8fd6'],
  restaurante: ['restaurant', '#d7802a'],
  terraza: ['sunny', '#efa81c'],
  mirador: ['eye', '#24968a'],
  cancha: ['tennisball', '#6aa516'],
  salon: ['people', '#8456c2'],
  recepcion: ['information-circle', '#17345c'],
  lobby: ['business', '#3d5a80'],
  hall: ['business', '#33507a'],
  minimarket: ['cart', '#e2654a'],
  kids: ['happy', '#f19a3e'],
  juegos: ['game-controller', '#6a4c93'],
  habitacion: ['bed', '#457b9d'],
  pasillo: ['walk', '#5f7d8c'],
  puerta: ['enter', '#4f6874'],
  estacionamiento: ['car', '#455a64'],
  rampa: ['accessibility', '#1c74d1'],
  parque: ['leaf', '#3f9a44'],
  punto: ['location', '#17345c']
};

function dibujo(nombre) {
  if (nombre.startsWith('propio:')) return PROPIOS[nombre.slice(7)];
  const svg = readFileSync(join(carpetaIonicons, `${nombre}.svg`), 'utf8');
  return svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/class="[^"]*"/g, '');
}

for (const [clave, [nombre, color]] of Object.entries(ICONOS)) {
  const contenido = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img">
<rect width="96" height="96" rx="22" fill="${color}"/>
<g transform="translate(22 22) scale(0.1015625)" fill="#fff">${dibujo(nombre)}</g>
</svg>
`;
  writeFileSync(join(salida, `${clave}.svg`), contenido);
}

console.log(`${Object.keys(ICONOS).length} íconos en src/assets/iconos-puntos`);
