import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const root = fileURLToPath(new URL('../', import.meta.url));
const res = join(root, 'android', 'app', 'src', 'main', 'res');

function leerPng(ruta) {
  const b = readFileSync(ruta);
  let pos = 8;
  let ancho = 0, alto = 0, tipo = 0, profundidad = 0;
  const datos = [];
  while (pos < b.length) {
    const largo = b.readUInt32BE(pos);
    const nombre = b.toString('ascii', pos + 4, pos + 8);
    const cuerpo = b.subarray(pos + 8, pos + 8 + largo);
    if (nombre === 'IHDR') {
      ancho = cuerpo.readUInt32BE(0); alto = cuerpo.readUInt32BE(4);
      profundidad = cuerpo[8]; tipo = cuerpo[9];
      if (profundidad !== 8 || (tipo !== 2 && tipo !== 6) || cuerpo[12] !== 0) throw new Error('Formato PNG no admitido');
    } else if (nombre === 'IDAT') datos.push(cuerpo);
    pos += 12 + largo;
  }
  const bpp = tipo === 6 ? 4 : 3;
  const crudo = zlib.inflateSync(Buffer.concat(datos));
  const fila = ancho * bpp;
  const px = new Uint8Array(ancho * alto * 4);
  let previa = new Uint8Array(fila);
  for (let y = 0; y < alto; ++y) {
    const filtro = crudo[y * (fila + 1)];
    const linea = crudo.subarray(y * (fila + 1) + 1, (y + 1) * (fila + 1));
    const actual = new Uint8Array(fila);
    for (let i = 0; i < fila; ++i) {
      const a = i >= bpp ? actual[i - bpp] : 0, u = previa[i], c = i >= bpp ? previa[i - bpp] : 0;
      let v = linea[i];
      if (filtro === 1) v += a;
      else if (filtro === 2) v += u;
      else if (filtro === 3) v += (a + u) >> 1;
      else if (filtro === 4) { const p = a + u - c, pa = Math.abs(p - a), pb = Math.abs(p - u), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? u : c; }
      actual[i] = v & 255;
    }
    for (let x = 0; x < ancho; ++x) {
      const o = (y * ancho + x) * 4;
      px[o] = actual[x * bpp]; px[o + 1] = actual[x * bpp + 1]; px[o + 2] = actual[x * bpp + 2];
      px[o + 3] = bpp === 4 ? actual[x * bpp + 3] : 255;
    }
    previa = actual;
  }
  return { ancho, alto, px };
}

const TABLA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; ++k) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const v of buf) c = TABLA_CRC[(c ^ v) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function bloque(nombre, datos) {
  const largo = Buffer.alloc(4); largo.writeUInt32BE(datos.length);
  const cuerpo = Buffer.concat([Buffer.from(nombre, 'ascii'), datos]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(cuerpo));
  return Buffer.concat([largo, cuerpo, crc]);
}
function escribirPng(ruta, { ancho, alto, px }) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(ancho, 0); ihdr.writeUInt32BE(alto, 4); ihdr[8] = 8; ihdr[9] = 6;
  const crudo = Buffer.alloc((ancho * 4 + 1) * alto);
  for (let y = 0; y < alto; ++y) Buffer.from(px.buffer, y * ancho * 4, ancho * 4).copy(crudo, y * (ancho * 4 + 1) + 1);
  writeFileSync(ruta, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    bloque('IHDR', ihdr), bloque('IDAT', zlib.deflateSync(crudo, { level: 9 })), bloque('IEND', Buffer.alloc(0))
  ]));
}

function lienzo(ancho, alto, [r, g, b, a]) {
  const px = new Uint8Array(ancho * alto * 4);
  for (let i = 0; i < px.length; i += 4) { px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a; }
  return { ancho, alto, px };
}

function pegar(destino, origen, altoObjetivo, cx, cy, mascara = () => true) {
  const escala = altoObjetivo / origen.alto;
  const w = Math.round(origen.ancho * escala), h = Math.round(altoObjetivo);
  const x0 = Math.round(cx - w / 2), y0 = Math.round(cy - h / 2);
  for (let y = 0; y < h; ++y) {
    for (let x = 0; x < w; ++x) {
      const dx = x0 + x, dy = y0 + y;
      if (dx < 0 || dy < 0 || dx >= destino.ancho || dy >= destino.alto || !mascara(dx, dy)) continue;
      const sx0 = x / escala, sx1 = (x + 1) / escala, sy0 = y / escala, sy1 = (y + 1) / escala;
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = Math.floor(sy0); sy < Math.min(origen.alto, Math.ceil(sy1)); ++sy) {
        for (let sx = Math.floor(sx0); sx < Math.min(origen.ancho, Math.ceil(sx1)); ++sx) {
          const o = (sy * origen.ancho + sx) * 4;
          r += origen.px[o]; g += origen.px[o + 1]; b += origen.px[o + 2]; a += origen.px[o + 3]; ++n;
        }
      }
      if (!n) continue;
      const o = (dy * destino.ancho + dx) * 4, alfa = a / n / 255;
      destino.px[o] = Math.round((r / n) * alfa + destino.px[o] * (1 - alfa));
      destino.px[o + 1] = Math.round((g / n) * alfa + destino.px[o + 1] * (1 - alfa));
      destino.px[o + 2] = Math.round((b / n) * alfa + destino.px[o + 2] * (1 - alfa));
      destino.px[o + 3] = Math.max(destino.px[o + 3], Math.round(alfa * 255));
    }
  }
}

function circulo(img) {
  const r = img.ancho / 2;
  for (let y = 0; y < img.alto; ++y) for (let x = 0; x < img.ancho; ++x) {
    const d = Math.hypot(x + 0.5 - r, y + 0.5 - r);
    const o = (y * img.ancho + x) * 4;
    img.px[o + 3] = Math.round(img.px[o + 3] * Math.max(0, Math.min(1, r - d)));
  }
  return img;
}

function redondear(img, radio) {
  const { ancho: w, alto: h } = img;
  for (let y = 0; y < h; ++y) for (let x = 0; x < w; ++x) {
    const cx = x < radio ? radio : x >= w - radio ? w - radio : x + 0.5;
    const cy = y < radio ? radio : y >= h - radio ? h - radio : y + 0.5;
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    const o = (y * w + x) * 4;
    img.px[o + 3] = Math.round(img.px[o + 3] * Math.max(0, Math.min(1, radio - d + 0.5)));
  }
  return img;
}

const logo = leerPng(join(root, 'src', 'assets', 'hippocampus', 'hippocampus-logo.png'));
const BLANCO = [255, 255, 255, 255];
const densidades = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

for (const [nombre, f] of Object.entries(densidades)) {
  const lado = Math.round(48 * f);
  const cuadrado = lienzo(lado, lado, BLANCO);
  pegar(cuadrado, logo, lado * 0.88, lado / 2, lado / 2);
  escribirPng(join(res, `mipmap-${nombre}`, 'ic_launcher.png'), redondear(cuadrado, lado * 0.18));

  const redondo = lienzo(lado, lado, BLANCO);
  pegar(redondo, logo, lado * 0.8, lado / 2, lado / 2);
  escribirPng(join(res, `mipmap-${nombre}`, 'ic_launcher_round.png'), circulo(redondo));

  const ladoFrente = Math.round(108 * f);
  const frente = lienzo(ladoFrente, ladoFrente, BLANCO);
  pegar(frente, logo, ladoFrente * 0.68, ladoFrente / 2, ladoFrente / 2);
  escribirPng(join(res, `mipmap-${nombre}`, 'ic_launcher_foreground.png'), frente);
}

const splash = [['drawable', 480, 320]];
for (const [nombre] of Object.entries(densidades)) {
  for (const orientacion of ['land', 'port']) {
    const ruta = join(res, `drawable-${orientacion}-${nombre}`, 'splash.png');
    const b = readFileSync(ruta);
    splash.push([`drawable-${orientacion}-${nombre}`, b.readUInt32BE(16), b.readUInt32BE(20)]);
  }
}
for (const [carpeta, ancho, alto] of splash) {
  const img = lienzo(ancho, alto, BLANCO);
  pegar(img, logo, Math.min(ancho, alto) * 0.42, ancho / 2, alto / 2);
  escribirPng(join(res, carpeta, 'splash.png'), img);
}

for (const [archivo, lado] of [['icono-app.png', 512], ['favicon.png', 64]]) {
  const img = lienzo(lado, lado, BLANCO);
  pegar(img, logo, lado * 0.84, lado / 2, lado / 2);
  escribirPng(join(root, 'src', 'assets', 'icon', archivo), redondear(img, lado * 0.2));
}

console.log(`Íconos de Android, ${splash.length} pantallas de inicio e íconos web generados con el logo de Hippocampus.`);
