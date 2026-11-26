import { describe,it,expect } from 'vitest';
import { TRAMOS_LEVANTADOS } from './levantamiento-recorridos.data';
import { MAPA_ACTIVO } from './mapa-simulado.data';
import { CAPTURAS_WIFI_POR_ASOCIAR, HUELLAS_WIFI, REFERENCIAS_WIFI_COMPARTIDAS } from './referencias-wifi.data';

describe('Registros recuperados del levantamiento',()=>{
  const distancia=(a:string,b:string)=>MAPA_ACTIVO.conexiones.find(c=>c.origen===a&&c.destino===b||c.origen===b&&c.destino===a)?.distancia;
  it('conserva los 24 registros y distingue medidas, cálculos y longitudes contradictorias',()=>{
    expect(TRAMOS_LEVANTADOS).toHaveLength(24);
    expect(TRAMOS_LEVANTADOS.filter(t=>t.estado==='medido')).toHaveLength(15);
    expect(TRAMOS_LEVANTADOS.filter(t=>t.estado==='calculado')).toHaveLength(7);
    expect(TRAMOS_LEVANTADOS.filter(t=>t.estado==='por-verificar').map(t=>t.distancia)).toEqual([2.577,2.577]);
    expect(distancia('puerta-exterior-derecha-nivel-4','acceso-escalera-derecha-nivel-3')).toBeNull();
  });
  it('asigna los 48,293 m al destino Tinajas de la tabla, sin inventar el subtramo a su puerta',()=>{
    expect(distancia('ascensor-habitaciones-piso-6','tinajas-piso-6')).toBe(48.293);
    expect(distancia('ascensor-habitaciones-piso-6','puerta-acceso-tinajas-piso-6')).toBeNull();
    expect(distancia('puerta-acceso-tinajas-piso-6','alma-spa-tinaja-piso-6')).toBe(4.8);
    expect(distancia('hall-nivel-1','salon-eventos-altamar-nivel-1')).toBeNull();
  });
  it('recupera las capturas originales y mantiene las referencias compartidas sin duplicar mediciones',()=>{
    expect(HUELLAS_WIFI).toHaveLength(9);
    expect(HUELLAS_WIFI.flatMap(h => h.lecturas).some(l => /^Galaxy A31/i.test(l.ssid))).toBe(false);
    expect(HUELLAS_WIFI.reduce((total,h)=>total+h.lecturas.length,0)).toBe(53);
    expect(HUELLAS_WIFI.find(h=>h.id==='toallas')?.nodoIds).toEqual(['toallas-nivel-1']);
    expect(HUELLAS_WIFI.find(h=>h.id==='alma-montemar')?.nodoIds).toHaveLength(2);
    expect(HUELLAS_WIFI.find(h=>h.id==='hall')?.lecturas.find(l=>l.ssid==='Hippocampus')?.bssid).toBe('dc:9f:db:1c:ed:e3');
    expect(CAPTURAS_WIFI_POR_ASOCIAR[0].nodoIds).toEqual([]);
    expect(CAPTURAS_WIFI_POR_ASOCIAR[0].lecturas).toHaveLength(6);
    for (const id of REFERENCIAS_WIFI_COMPARTIDAS[0].nodoIds) {
      expect(HUELLAS_WIFI.some(h=>h.nodoIds.includes(id))).toBe(false);
    }
    for (const huella of HUELLAS_WIFI) {
      for (const id of huella.nodoIds) expect(MAPA_ACTIVO.nodos.some(n=>n.id===id)).toBe(true);
      for (const lectura of huella.lecturas) {
        if (!lectura.aproximada) expect(lectura.bssid).toMatch(/^(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$/i);
        else expect(lectura.usarParaComparar).toBe(false);
      }
    }
  });
});
