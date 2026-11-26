import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { beforeEach,afterEach,describe,it,expect } from 'vitest';
import { PosicionamientoApoyoService,compararHuellasWifi } from './posicionamiento-apoyo.service';
import { MapaService } from './mapa.service';
import { SensoresNavegacionService } from './sensores-navegacion.service';

describe('Inventario Wi-Fi de puntos confirmados',()=>{
  let servicio:PosicionamientoApoyoService;
  beforeEach(()=>{
    localStorage.clear();
    TestBed.configureTestingModule({providers:[
      {provide:SensoresNavegacionService,useValue:{posicionGps$:new Subject()}},
      {provide:MapaService,useValue:{obtenerNodoPorId:(id:string)=>id==='hall'?{id,nombre:'Hall',nivel:1}:undefined}}
    ]});
    servicio=TestBed.inject(PosicionamientoApoyoService);
    servicio['instanteWifi']=Date.now();
    servicio['estadoInterno'].next({buscandoWifi:false,errorWifi:null,candidatos:[],lecturas:[
      {ssid:'Red débil',bssid:'00:11:22:33:44:55',rssi:-94,frequency:2412,ageMs:0},
      {ssid:'Red 5 GHz',bssid:'00:11:22:33:44:66',rssi:-42,frequency:5180,ageMs:0}
    ]});
  });
  afterEach(()=>{TestBed.resetTestingModule();localStorage.clear();});
  it('guarda todas las señales disponibles sin convertir dos redes en una posición calibrada',()=>{
    expect(servicio.registrarLevantamientoWifi('hall')).toBe(true);
    const registro=servicio.huellasRegistradas.find(h=>h.tipo==='registro-local')!;
    expect(registro.lecturas).toHaveLength(2);
    expect(registro.lecturas.map(r=>r.rssi)).toEqual([-94,-42]);
    expect(registro.lecturas.map(r=>r.canal)).toEqual(['1','36']);
    expect(servicio.guardarHuellaWifi('hall')).toBe(false);
    expect(compararHuellasWifi(servicio['estadoInterno'].value.lecturas,[registro])).toEqual([]);
    const recargado=TestBed.runInInjectionContext(()=>new PosicionamientoApoyoService());
    expect(recargado.huellasRegistradas.find(h=>h.id===registro.id)?.lecturas).toHaveLength(2);
    recargado.ngOnDestroy();
  });
  it('rechaza capturas antiguas y puntos que no existen',()=>{
    expect(servicio.registrarLevantamientoWifi('inexistente')).toBe(false);
    servicio['instanteWifi']=Date.now()-10001;
    expect(servicio.registrarLevantamientoWifi('hall')).toBe(false);
    expect(servicio.huellasRegistradas.some(h=>h.tipo==='registro-local')).toBe(false);
  });
});
