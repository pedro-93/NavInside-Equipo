import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = fileURLToPath(new URL('../', import.meta.url));
const leer = f => readFileSync(root + f, 'utf8');
const config = leer('src/assets/mapas/navinside-map-config.js');
const bridge = leer('src/assets/mapas/navinside-map-bridge.js');
const guidance = leer('src/assets/mapas/navinside-route-guidance.js');
const theme = leer('src/assets/mapas/nav-theme.js');
const resultado = {};

for (const level of [1, 3, 4, 5, 6]) {
  const messages = [];
  const host = new JSDOM('<!doctype html>', { url: 'https://navinside.test/' });
  host.window.postMessage = data => messages.push(data);
  const page = new JSDOM(leer(`src/assets/mapas/nivel-${level}-navegacion.html`), {
    runScripts: 'dangerously',
    url: `https://navinside.test/assets/mapas/nivel-${level}-navegacion.html`,
    beforeParse(w) {
      Object.defineProperty(w, 'parent', { value: host.window });
      w.matchMedia = () => ({ matches: false });
      w.requestAnimationFrame = () => 0;
      w.cancelAnimationFrame = () => {};
      w.HTMLElement.prototype.getBoundingClientRect = () => ({ width: 900, height: 700, x: 0, y: 0, left: 0, top: 0, right: 900, bottom: 700 });
      w.SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 120, height: 30 });
    }
  });
  const w = page.window;
  w.eval(theme); w.eval(config); w.eval(guidance); w.eval(bridge);
  const geo = messages.find(m => m?.type === 'navinside-map-geometry');
  if (!geo) throw new Error(`El nivel ${level} no entregó geometría`);
  resultado[level] = {
    escalaM: geo.scaleM,
    largos: Object.fromEntries(Object.entries(geo.lengths).sort(([a], [b]) => a.localeCompare(b)))
  };
  page.window.close();
  host.window.close();
}

const contenido = `/**
 * Metraje de los planos interactivos: largo en metros del recorrido dibujado entre cada par
 * de puntos, según la escala de cada plano. Generado por scripts/generar-metraje-planos.mjs.
 *
 * Son APROXIMACIONES del dibujo. Las medidas de terreno (conexiones con distancia) siempre
 * tienen prioridad y, además, corrigen la escala de cada nivel (ver metraje.ts).
 */
export interface MetrajePlano {
  escalaM: number;
  largos: Readonly<Record<string, number>>;
}

export const METRAJE_PLANOS: Readonly<Record<number, MetrajePlano>> = ${JSON.stringify(resultado, null, 2)};
`;

writeFileSync(root + 'src/app/data/metraje-planos.data.ts', contenido);
console.log(Object.entries(resultado).map(([n, r]) => `Nivel ${n}: ${Object.keys(r.largos).length} recorridos`).join('\n'));
