import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { MapaService } from './mapa.service';
import { RutaService } from './ruta.service';
import { incorporarRutasAccesiblesNivel3 } from '../data/rutas-accesibles-nivel-3.data';
import { crearMetraje } from '../data/metraje';
import { construirGrafoNivel } from './localizacion-wifi';
import { HomePage } from '../home/home.page';
const ORIGEN = 'ascensor-central-nivel-3';
const DESTINOS = ['canchas-tenis-nivel-3', 'piscina-acceso-accesible-nivel-3', 'piscina-temperada-nivel-3'];
describe('Recorridos accesibles con Wi-Fi y fotografías', () => {
  it.each(DESTINOS)('recorre el desvío accesible a %s en ambos sentidos', destino => {
    const servicio = TestBed.inject(RutaService);
    const mapa = TestBed.inject(MapaService).obtenerMapaActivo();
    const ruta = servicio.calcularRuta(ORIGEN, destino, true);
    expect(ruta.length).toBeGreaterThanOrEqual(9);
    expect(ruta.at(-1)?.id).toBe(destino);
    expect(ruta.map(n => n.id)).toContain('tramo-accesible-nivel-3-fa');
    for (let i = 1; i < ruta.length; i++) {
      const a = ruta[i - 1].id, b = ruta[i].id;
      const c = mapa.conexiones.find(c => (c.origen === a && c.destino === b) || (c.origen === b && c.destino === a));
      expect(c?.accesible).toBe(true);
      expect(c?.tipo).not.toBe('escalera');
      expect(c?.habilitada).not.toBe(false);
      expect(c?.restringida).not.toBe(true);
    }
    expect(servicio.calcularRuta(destino, ORIGEN, true).map(n => n.id)).toEqual(ruta.map(n => n.id).reverse());
  });
  it('conserva el atajo normal y distingue estimaciones de medidas en el motor Wi-Fi', () => {
    const mapa = TestBed.inject(MapaService).obtenerMapaActivo();
    const servicio = TestBed.inject(RutaService);
    expect(servicio.calcularDistanciaTotal(servicio.calcularRuta(ORIGEN, DESTINOS[0]))).toBe(36);
    const paso = 'tramo-accesible-nivel-3-asc1';
    expect(crearMetraje(mapa.nodos, mapa.conexiones).tramo(ORIGEN, paso).aproximado).toBe(true);
    const grafo = construirGrafoNivel(3, mapa.nodos, mapa.conexiones, n => ({x:n.x,y:n.y}));
    expect(grafo.aristas.find(a => a.a === ORIGEN && a.b === paso)?.medida).toBe(false);
  });
  it('no reabre destinos restringidos ni duplica tramos', () => {
    const mapa = TestBed.inject(MapaService).obtenerMapaActivo();
    expect(incorporarRutasAccesiblesNivel3(mapa).conexiones).toHaveLength(mapa.conexiones.length);
    const modificado = {...mapa, nodos:mapa.nodos.map(n => n.id === DESTINOS[0] ? {...n,restringido:true} : n)};
    expect(incorporarRutasAccesiblesNivel3(modificado).nodos.find(n => n.id === DESTINOS[0])?.restringido).toBe(true);
  });
  it('mantiene la foto anterior durante el tramo y la foto de destino al llegar', () => {
    const mapa = TestBed.inject(MapaService).obtenerMapaActivo();
    const ruta = TestBed.inject(RutaService).calcularRuta(ORIGEN, DESTINOS[0], true);
    const resolver = Object.getOwnPropertyDescriptor(HomePage.prototype, 'nodoFotoRuta')!.get!;
    const paso = ruta.find(n => n.id === 'tramo-accesible-nivel-3-pp');
    expect(resolver.call({nodoVistaRuta:paso,rutaCalculada:ruta,nodosMapa:mapa.nodos})?.id).toBe('restaurant-faro-nivel-3');
    expect(resolver.call({nodoVistaRuta:ruta.at(-1),rutaCalculada:ruta,nodosMapa:mapa.nodos})?.id).toBe(DESTINOS[0]);
  });
});
