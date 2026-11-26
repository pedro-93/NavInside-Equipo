import { describe,expect,it } from 'vitest';
import { MAPA_ACTIVO } from './mapa-simulado.data';
import { FOTOS_DESTINOS } from './fotos-destinos.data';

describe('Fusión de los proyectos de NavInside',()=>{
  it('mantiene las mediciones del levantamiento y no utiliza las distancias dibujadas como medidas',()=>{
    const distancia=(a:string,b:string)=>MAPA_ACTIVO.conexiones.find(c=>c.origen===a&&c.destino===b||c.origen===b&&c.destino===a)?.distancia;
    expect(distancia('ascensor-central-nivel-1','zona-kid-nivel-1')).toBe(4.411);
    expect(distancia('ascensor-central-nivel-1','hall-nivel-1')).toBe(10.336);
    expect(distancia('ascensor-central-nivel-5','salon-costamar-nivel-5')).toBeNull();
  });
  it('reúne los puntos complementarios sin duplicar sus identificadores',()=>{
    const ids=MAPA_ACTIVO.nodos.map(n=>n.id);
    expect(new Set(ids).size).toBe(ids.length);
    for(const id of ['lobby-nivel-4','pasillo-habitaciones-nivel-4','acceso-costamar-nivel-4','ascensor-central-nivel-5','terraza-faro-nivel-3'])expect(ids).toContain(id);
  });
  it('conserva las fotografías del tour y las galerías complementarias con su procedencia',()=>{
    expect(FOTOS_DESTINOS['zona-kid-nivel-1'].src).toContain('assets/tour/');
    expect(FOTOS_DESTINOS['zona-kid-nivel-1'].galeria?.some(f=>f.src.includes('/hd/mini-club.jpg')&&f.fuente==='fotografia-local')).toBe(true);
    expect(FOTOS_DESTINOS['ascensor-central-nivel-3']).toBeUndefined();
    expect(FOTOS_DESTINOS['lobby-nivel-4'].src).toContain('JeTutcK7xb-j');
  });
});
