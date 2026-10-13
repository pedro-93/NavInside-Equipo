import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NODOS_HIPPOCAMPUS } from '../data/mapa-simulado.data';
import { HomePage } from './home.page';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('interpreta una solicitud hablada para completar origen y destino', () => {
    component.lugares = NODOS_HIPPOCAMPUS;
    component.seleccionarIdioma('es');
    component.procesarComandoVozRuta(
      'Desde ascensor principal hasta gimnasio'
    );

    expect(component.origen).toBe('ascensor-central-nivel-1');
    expect(component.destino).toBe('gimnasio-nivel-1');
    expect(component.estadoComandoVoz).toContain('Ascensor principal');
    expect(component.estadoComandoVoz).toContain('Gimnasio');
  });

  it('da indicaciones habladas sin numeración y con distancia aproximada', () => {
    component.lugares = NODOS_HIPPOCAMPUS;
    component.seleccionarIdioma('es');
    component.procesarComandoVozRuta(
      'Desde ascensor principal hasta gimnasio'
    );

    component.avanzarPaso();
    const indicacion = component.instruccionVozActual;

    expect(indicacion).not.toMatch(/paso\s+\d+\s+de\s+\d+/i);
    expect(indicacion).toMatch(/(Continúa|Luego|Ahora)/);
    expect(indicacion).toMatch(/\d+ metros/);
  });

  it('muestra fotos en las tarjetas de puntos de interés elegibles', () => {
    component.lugares = NODOS_HIPPOCAMPUS;
    component.nivelVisualizado = 1;
    fixture.detectChanges();

    const tarjetas = fixture.nativeElement.querySelectorAll('.tarjeta-punto');

    expect(tarjetas.length).toBeGreaterThan(0);
    expect(tarjetas[0].querySelector('img.tarjeta-punto__imagen')).toBeTruthy();
  });
});
