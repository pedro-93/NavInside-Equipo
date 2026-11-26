import { Conexion, Nodo } from '../models/nodo.model';
import { METRAJE_PLANOS } from './metraje-planos.data';

export interface MetrajeTramo {
  metros: number | null;
  aproximado: boolean;
}

export interface Metraje {
  tramo(a: string, b: string): MetrajeTramo;
  factor(nivel: number): number;
  dibujado(nivel: number, a: string, b: string): number | null;
}

function largoDibujado(nivel: number, a: string, b: string): number | null {
  const largos = METRAJE_PLANOS[nivel]?.largos;
  const valor = largos?.[`${a}|${b}`] ?? largos?.[`${b}|${a}`];
  return typeof valor === 'number' && Number.isFinite(valor) && valor > 0 ? valor : null;
}

export function crearMetraje(nodos: readonly Nodo[], conexiones: readonly Conexion[]): Metraje {
  const nivelDe = new Map(nodos.map(n => [n.id, n.nivel]));
  const medidas = new Map<string, MetrajeTramo>();
  const razones = new Map<number, number[]>();

  for (const c of conexiones) {
    if (typeof c.distancia !== 'number' || !Number.isFinite(c.distancia) || c.distancia <= 0) continue;
    medidas.set(`${c.origen}|${c.destino}`, { metros: c.distancia, aproximado: c.estimada === true });
    medidas.set(`${c.destino}|${c.origen}`, { metros: c.distancia, aproximado: c.estimada === true });
    if (c.estimada) continue;

    const nivel = nivelDe.get(c.origen);
    if (typeof nivel !== 'number' || nivel !== nivelDe.get(c.destino) || c.tipo === 'ascensor') continue;
    const dibujo = largoDibujado(nivel, c.origen, c.destino);
    if (dibujo) razones.set(nivel, [...(razones.get(nivel) ?? []), c.distancia / dibujo]);
  }

  const factores = new Map<number, number>();
  for (const [nivel, lista] of razones) {
    const orden = [...lista].sort((x, y) => x - y);
    const mitad = Math.floor(orden.length / 2);
    const mediana = orden.length % 2 ? orden[mitad] : (orden[mitad - 1] + orden[mitad]) / 2;
    factores.set(nivel, Math.max(0.5, Math.min(1.6, mediana)));
  }

  const factor = (nivel: number) => factores.get(nivel) ?? 1;

  return {
    factor,
    dibujado: largoDibujado,
    tramo(a: string, b: string): MetrajeTramo {
      const medida = medidas.get(`${a}|${b}`);
      if (medida !== undefined) return medida;

      const nivel = nivelDe.get(a);
      if (typeof nivel !== 'number' || nivel !== nivelDe.get(b)) return { metros: null, aproximado: false };

      const dibujo = largoDibujado(nivel, a, b);
      return dibujo
        ? { metros: Math.round(dibujo * factor(nivel) * 10) / 10, aproximado: true }
        : { metros: null, aproximado: false };
    }
  };
}
