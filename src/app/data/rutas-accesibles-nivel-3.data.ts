import { Conexion, MapaNavegacion, Nodo } from '../models/nodo.model';

// Coordenadas y tramos del plano de Cristian: assets/mapas/nivel-3-navegacion.html.
const ESCALA = 0.14;
const COORDENADAS = {
  asc: [892, 848],
  asc1: [836, 830],
  j1: [800, 808],
  ban: [722, 796],
  j2: [660, 762],
  vf: [548, 792],
  fa: [612, 862],
  pp: [680, 985],
  eap: [722, 1048],
  eat: [714, 953],
  tem: [690, 898],
  pri: [812, 1012],
  pc: [935, 1040],
  ec: [1060, 975],
  hall: [1140, 955],
  k0: [1205, 1045],
  k1: [1330, 1045],
  k2: [1587, 1045],
  ten1: [1587, 970],
} as const;
type PuntoPlano = keyof typeof COORDENADAS;

const PUNTOS_EXISTENTES: Partial<Record<PuntoPlano, string>> = {
  asc: 'ascensor-central-nivel-3',
  ten1: 'canchas-tenis-nivel-3',
  eap: 'piscina-acceso-accesible-nivel-3',
  tem: 'piscina-temperada-nivel-3',
};

const NOMBRES_PASO: Partial<Record<PuntoPlano, string>> = {
  asc1: 'Acceso Ascensor 1',
  j1: 'Salida derecha',
  ban: 'Paso por baños',
  j2: 'Cruce del Faro',
  vf: 'Pasillo exterior del Faro',
  fa: 'Frente al Restaurante Faro',
  pp: 'Camino a las piscinas',
  eat: 'Entrada accesible a la Piscina Temperada',
  pri: 'Piscina Principal',
  pc: 'Costado de la Piscina Principal',
  ec: 'Acceso a las canchas',
  hall: 'Hall de canchas',
  k0: 'Pasillo de canchas',
  k1: 'Pasillo de canchas',
  k2: 'Acceso a Cancha 1',
};

const CAMINOS: readonly (readonly PuntoPlano[])[] = [
  ['asc', 'asc1', 'j1', 'ban', 'j2', 'vf', 'fa', 'pp', 'eap'],
  ['asc', 'asc1', 'j1', 'ban', 'j2', 'vf', 'fa', 'pp', 'eap', 'pri', 'pc', 'ec', 'hall', 'k0', 'k1', 'k2', 'ten1'],
  ['asc', 'asc1', 'j1', 'ban', 'j2', 'vf', 'fa', 'pp', 'eat', 'tem'],
];

export const PREFIJO_PASO_NIVEL_3 = 'tramo-accesible-nivel-3-';
const idPlano = (punto: PuntoPlano): string => PUNTOS_EXISTENTES[punto] ?? PREFIJO_PASO_NIVEL_3 + punto;
export const esPasoAccesibleNivel3 = (id: string): boolean => id.startsWith(PREFIJO_PASO_NIVEL_3);

export const POSICIONES_RUTAS_ACCESIBLES_NIVEL_3: Record<string, readonly [number, number]> =
  Object.fromEntries(Object.entries(COORDENADAS).map(([punto, coordenada]) => [idPlano(punto as PuntoPlano), coordenada]));

const CLAVE = (a: string, b: string): string => [a, b].sort().join('|');

export function incorporarRutasAccesiblesNivel3(mapa: MapaNavegacion): MapaNavegacion {
  const ascensor = idPlano('asc');
  const accesos = new Set([idPlano('eap'), idPlano('tem'), idPlano('ten1')]);
  const nodos = new Map(mapa.nodos.map(nodo => [nodo.id, nodo]));
  if (nodos.get(ascensor)?.nivel !== 3 || nodos.get(ascensor)?.restringido) return mapa;

  const atajosCerrados = new Set(mapa.conexiones.flatMap(cx => {
    const destino = cx.origen === ascensor ? cx.destino : cx.destino === ascensor ? cx.origen : '';
    return accesos.has(destino) && (cx.restringida === true || cx.habilitada === false) ? [destino] : [];
  }));
  const trazos = new Map<string, Conexion>();
  const accesosIntegrados = new Set<string>();

  for (const camino of CAMINOS) {
    // Si el mapa remoto no contiene un acceso o lo registra cerrado, no se crea un desvío que lo reabra.
    const compatibles = camino.every(punto => {
      if (!PUNTOS_EXISTENTES[punto]) return true;
      const id = idPlano(punto);
      const nodo = nodos.get(id);
      return nodo?.nivel === 3 && !nodo.restringido && (punto === 'ten1' || nodo.accesible !== false) && !atajosCerrados.has(id);
    });
    if (!compatibles) continue;

    for (const [i, punto] of camino.entries()) {
      const id = idPlano(punto);
      const [x, y] = COORDENADAS[punto];
      if (!nodos.has(id)) {
        const paso: Nodo = { id, nombre: NOMBRES_PASO[punto] ?? punto, x, y, tipo: 'pasillo', nivel: 3, accesible: true };
        nodos.set(id, paso);
      }
      if (accesos.has(id)) accesosIntegrados.add(id);
      if (!i) continue;
      const anterior = camino[i - 1];
      const [ax, ay] = COORDENADAS[anterior];
      const origen = idPlano(anterior);
      trazos.set(CLAVE(origen, id), {
        origen, destino: id, distancia: Math.round(Math.hypot(x - ax, y - ay) * ESCALA * 1000) / 1000,
        tipo: 'pasillo', accesible: true, habilitada: true, estimada: true
      });
    }
  }

  // La Cancha 1 es alcanzable por el trazado accesible; su atajo original sigue excluido de ese modo.
  const tenis = nodos.get(idPlano('ten1'));
  if (tenis && accesosIntegrados.has(tenis.id)) nodos.set(tenis.id, { ...tenis, accesible: true });

  const conexiones = mapa.conexiones.map(cx => {
    trazos.delete(CLAVE(cx.origen, cx.destino));
    const destino = cx.origen === ascensor ? cx.destino : cx.destino === ascensor ? cx.origen : '';
    return accesosIntegrados.has(destino) ? { ...cx, accesible: false } : cx;
  });
  return { ...mapa, nodos: [...nodos.values()], conexiones: [...conexiones, ...trazos.values()] };
}
