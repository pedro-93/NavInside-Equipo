import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';

import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import {
  NODOS_HIPPOCAMPUS
} from '../data/mapa-simulado.data';

import {
  HomePage
} from './home.page';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(() => {
    fixture =
      TestBed.createComponent(HomePage);

    component =
      fixture.componentInstance;

    component.seleccionarIdioma('es');
    component.lugares = NODOS_HIPPOCAMPUS;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it(
    'interpreta una solicitud hablada para completar origen y destino',
    () => {
      component.procesarComandoVozRuta(
        'Desde ascensor principal hasta gimnasio'
      );

      expect(component.origen)
        .toBe(
          'ascensor-central-nivel-1'
        );

      expect(component.destino)
        .toBe(
          'gimnasio-nivel-1'
        );

      expect(
        component.estadoComandoVoz
      ).toContain(
        'Ascensor principal'
      );

      expect(
        component.estadoComandoVoz
      ).toContain('Gimnasio');
    }
  );

  it(
    'reconoce recepción turismo mediante alias de voz',
    () => {
      component.procesarSeleccionVoz(
        'origen',
        'recepción de turismo'
      );

      expect(component.origen)
        .toBe(
          'recepcion-turismo-vina-nivel-4'
        );
    }
  );

  it(
    'reconoce salón Altamar mediante distintas expresiones',
    () => {
      const expresiones = [
        'salón Altamar',
        'Altamar',
        'salón alta mar'
      ];

      for (
        const expresion of expresiones
      ) {
        component.destino = '';

        component.procesarSeleccionVoz(
          'destino',
          expresion
        );

        expect(component.destino)
          .toBe(
            'salon-eventos-altamar-nivel-1'
          );
      }
    }
  );

  it(
    'reconoce Hall aunque el navegador lo transcriba de otra forma',
    () => {
      const expresiones = [
        'hall',
        'all',
        'al',
        'jal',
        'lobby'
      ];

      for (
        const expresion of expresiones
      ) {
        component.origen = '';

        component.procesarSeleccionVoz(
          'origen',
          expresion
        );

        expect(component.origen)
          .toBe('hall-nivel-1');
      }
    }
  );

  it(
    'impide usar el mismo lugar como origen y destino',
    () => {
      component.origen =
        'hall-nivel-1';

      component.destino = '';

      component.procesarSeleccionVoz(
        'destino',
        'hall'
      );

      expect(component.destino)
        .toBe('');
    }
  );

  it(
    'da indicaciones habladas sin numeración y con distancia aproximada',
    () => {
      const origen =
        NODOS_HIPPOCAMPUS.find(
          nodo =>
            nodo.id ===
            'hall-nivel-1'
        )!;

      const destino =
        NODOS_HIPPOCAMPUS.find(
          nodo =>
            nodo.id ===
            'gimnasio-nivel-1'
        )!;

      component.rutaCalculada = [
        origen,
        destino
      ];

      component.pasosRuta = [
        {
          orden: 1,
          tipo: 'inicio',
          nodo: origen
        },
        {
          orden: 2,
          tipo: 'avance',
          desde: origen,
          nodo: destino,
          medio: 'pasillo'
        },
        {
          orden: 3,
          tipo: 'llegada',
          nodo: destino
        }
      ];

      component.pasoActualIndice = 0;

      vi.spyOn(
        component['rutaService'],
        'calcularDistanciaTotal'
      ).mockReturnValue(15.272);

      component.avanzarPaso();

      const indicacion =
        component.instruccionVozActual;

      expect(indicacion)
        .not
        .toMatch(
          /paso\s+\d+\s+de\s+\d+/i
        );

      expect(indicacion)
        .toMatch(
          /(Continúa|Luego|Ahora)/
        );

      expect(indicacion)
        .toMatch(/\d+ metros/);
    }
  );

  it(
    'muestra fotos en las tarjetas de puntos de interés elegibles',
    () => {
      component.nivelVisualizado = 1;

      fixture.detectChanges();

      const tarjetas =
        fixture.nativeElement
          .querySelectorAll(
            '.tarjeta-punto'
          );

      expect(tarjetas.length)
        .toBeGreaterThan(0);

      expect(
        tarjetas[0].querySelector(
          'img.tarjeta-punto__imagen'
        )
      ).toBeTruthy();
    }
  );
});
