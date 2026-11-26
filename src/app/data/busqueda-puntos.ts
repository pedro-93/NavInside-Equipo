import { normalizarTexto } from './iconos-puntos';

const VACIAS = new Set([
  'el', 'la', 'los', 'las', 'al', 'del', 'de', 'a', 'en', 'un', 'una', 'y', 'quiero', 'ir', 'llevame', 'lleva',
  'voy', 'donde', 'esta', 'como', 'llego', 'hacia', 'por', 'favor', 'me', 'mi', 'the', 'to', 'take', 'go', 'want',
  'where', 'is', 'please', 'para', 'nivel', 'piso', 'level', 'floor', 'o', 'do', 'da', 'ao', 'quero'
]);

function palabras(texto: string): string[] {
  return normalizarTexto(texto)
    .replace(/[^a-z0-9ñ ]+/g, ' ')
    .split(/\s+/)
    .filter(p => p.length > 1 && !VACIAS.has(p));
}

function levenshtein(a: string, b: string): number {
  const fila = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; ++i) {
    let previo = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; ++j) {
      const actual = fila[j];
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, previo + (a[i - 1] === b[j - 1] ? 0 : 1));
      previo = actual;
    }
  }
  return fila[b.length];
}

function parecido(a: string, b: string): number {
  if (a === b) return 1;
  if (b.startsWith(a) || a.startsWith(b)) return Math.min(a.length, b.length) >= 3 ? 0.9 : 0.5;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

export function similitudLugar(consulta: string, nombres: readonly string[]): number {
  const buscadas = palabras(consulta);
  if (!buscadas.length) return 0;
  const unida = buscadas.join('');
  let mejor = 0;

  for (const nombre of nombres) {
    const normal = normalizarTexto(nombre);
    if (normal.includes(normalizarTexto(consulta).trim()) && consulta.trim().length >= 2) return 1;
    const propias = palabras(nombre);
    if (!propias.length) continue;

    const porPalabra = buscadas.map(b => Math.max(...propias.map(p => parecido(b, p))));
    let valor = porPalabra.reduce((s, v) => s + v, 0) / porPalabra.length;

    valor = Math.max(valor, parecido(unida, propias.join('')), ...propias.map(p => parecido(unida, p)));
    mejor = Math.max(mejor, valor);
  }

  return mejor;
}

export interface ResultadoBusqueda<T> {
  item: T;
  puntaje: number;
}

export function buscarLugares<T>(
  consulta: string,
  items: readonly T[],
  nombresDe: (item: T) => readonly string[],
  umbral = 0.62
): ResultadoBusqueda<T>[] {
  if (!consulta.trim()) return items.map(item => ({ item, puntaje: 0 }));
  return items
    .map(item => ({ item, puntaje: similitudLugar(consulta, nombresDe(item)) }))
    .filter(r => r.puntaje >= umbral)
    .sort((a, b) => b.puntaje - a.puntaje);
}
