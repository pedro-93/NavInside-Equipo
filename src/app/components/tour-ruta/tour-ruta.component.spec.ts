import { TestBed } from '@angular/core/testing';
import { describe,it,expect } from 'vitest';
import { TourRutaComponent } from './tour-ruta.component';

describe('Galería del recorrido fusionado',()=>{
  it('permite ver fotos complementarias y vuelve a la foto principal al cambiar de parada',()=>{
    const fixture=TestBed.createComponent(TourRutaComponent);
    fixture.componentRef.setInput('nodo',{id:'zona-kid-nivel-1',nombre:'Kids Club',nivel:1,tipo:'servicio',x:0,y:0});
    fixture.detectChanges();
    const element=fixture.nativeElement as HTMLElement;
    const main=()=>element.querySelector<HTMLImageElement>('.tour-ruta__vista>img')!;
    expect(main().src).toContain('assets/tour/');
    const complement=element.querySelectorAll<HTMLButtonElement>('.tour-ruta__galeria button')[1];
    complement.click();fixture.detectChanges();
    expect(main().src).toContain('/hd/mini-club.jpg');
    expect(element.querySelector('small')?.textContent).toContain('Fotografía del recinto');
    fixture.componentRef.setInput('nodo',{id:'lobby-nivel-4',nombre:'Lobby',nivel:4,tipo:'recepcion',x:0,y:0});
    fixture.detectChanges();
    expect(main().src).toContain('JeTutcK7xb-j');
  });
});
