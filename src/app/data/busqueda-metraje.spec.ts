import { describe, expect, it } from 'vitest';
import { buscarLugares, similitudLugar } from './busqueda-puntos';
import { crearMetraje } from './metraje';
import { iconoPunto } from './iconos-puntos';
import { Conexion, Nodo } from '../models/nodo.model';

describe('búsqueda de puntos de interés', () => {
  const lugares = ['Gimnasio', 'Salón Terramar', 'Hall Central', 'Recepción Hippocampus', 'Piscina temperada'];

  it('encuentra lugares aunque la voz o la escritura no sean exactas', () => {
    const primero = (q: string) => buscarLugares(q, lugares, n => [n])[0]?.item;
    expect(primero('jim nacio')).toBe('Gimnasio');
    expect(primero('terra mar')).toBe('Salón Terramar');
    expect(primero('resepcion')).toBe('Recepción Hippocampus');
    expect(primero('llévame a la piscina')).toBe('Piscina temperada');
  });

  it('sin texto muestra todos los lugares', () => {
    expect(buscarLugares('', lugares, n => [n])).toHaveLength(lugares.length);
  });

  it('no inventa coincidencias', () => {
    expect(similitudLugar('estacionamiento', ['Gimnasio'])).toBeLessThan(0.62);
  });
});

describe('metraje de los niveles', () => {
  const nodos: Nodo[] = [
    { id: 'ascensor-habitaciones-piso-6', nombre: 'Ascensor', x: 0, y: 0, tipo: 'ascensor', nivel: 6 },
    { id: 'puerta-acceso-tinajas-piso-6', nombre: 'Puerta', x: 0, y: 0, tipo: 'entrada', nivel: 6 },
    { id: 'tinajas-piso-6', nombre: 'Tinajas', x: 0, y: 0, tipo: 'spa', nivel: 6 }
  ];

  it('usa la medida de terreno y corrige la escala del dibujo del nivel', () => {
    const conexiones: Conexion[] = [
      { origen: 'ascensor-habitaciones-piso-6', destino: 'tinajas-piso-6', distancia: 48.293 },
      { origen: 'ascensor-habitaciones-piso-6', destino: 'puerta-acceso-tinajas-piso-6', distancia: null }
    ];
    const metraje = crearMetraje(nodos, conexiones);
    expect(metraje.tramo('tinajas-piso-6', 'ascensor-habitaciones-piso-6')).toEqual({ metros: 48.293, aproximado: false });
    expect(metraje.factor(6)).toBeCloseTo(48.293 / 68.96, 2);
    const aprox = metraje.tramo('ascensor-habitaciones-piso-6', 'puerta-acceso-tinajas-piso-6');
    expect(aprox.aproximado).toBe(true);
    expect(aprox.metros).toBeCloseTo(61.43 * (48.293 / 68.96), 0);
  });

  it('no aproxima entre pisos distintos', () => {
    const metraje = crearMetraje([...nodos, { id: 'hall-nivel-1', nombre: 'Hall', x: 0, y: 0, tipo: 'recepcion', nivel: 1 }], []);
    expect(metraje.tramo('hall-nivel-1', 'tinajas-piso-6')).toEqual({ metros: null, aproximado: false });
  });
});

describe('íconos de puntos sin foto', () => {
  it('asigna íconos según el lugar', () => {
    expect(iconoPunto({ id: 'toallas-nivel-1', nombre: 'Entrega de Toallas', tipo: 'servicio' })).toBe('🧺');
    expect(iconoPunto({ id: 'ascensor-central-nivel-1', nombre: 'Ascensor central', tipo: 'ascensor' })).toBe('🛗');
    expect(iconoPunto({ id: 'x', nombre: 'Lugar', tipo: 'gimnasio' })).toBe('🏋️');
  });
});
