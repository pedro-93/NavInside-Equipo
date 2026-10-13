import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Conexion, Nodo } from '../../models/nodo.model';
import { MapaRutaComponent } from './mapa-ruta.component';

describe('MapaRutaComponent', () => {
  let component: MapaRutaComponent;
  let fixture: ComponentFixture<MapaRutaComponent>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MapaRutaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra las orientaciones físicas solo sobre el plano real del nivel 1', () => {
    fixture.componentRef.setInput('nodos', [
      {
        id: 'hall-nivel-1',
        nombre: 'Hall',
        x: 0,
        y: 0,
        tipo: 'salon',
        nivel: 1
      }
    ]);
    fixture.componentRef.setInput('nivel', 1);
    fixture.componentRef.setInput('usarPlanoReal', true);
    fixture.componentRef.setInput('mostrarGuiaFisicaNivelUno', true);

    fixture.detectChanges();

    expect(component.esPlanoRealNivelUno).toBe(true);
    expect(component.hayDatosNivel).toBe(true);
    expect(component.mostrarGuiaFisicaNivelUno).toBe(true);

    const guia = fixture.nativeElement.querySelector(
      '.guia-orientacion'
    ) as HTMLElement | null;

    expect(guia).not.toBeNull();
    expect(guia?.textContent).toContain('Mini Club Kids');
    expect(guia?.textContent).toContain('Zona de juegos de adultos + baños; acceso por escaleras');
    expect(guia?.textContent).toContain('escaleras de acceso al Gimnasio');
    expect(guia?.textContent).toContain('Escaleras de emergencia');
    expect(guia?.textContent).toContain('corroboradas en terreno');

    fixture.componentRef.setInput('nivel', 2);
    fixture.componentRef.setInput('usarPlanoReal', false);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.guia-orientacion')
    ).toBeNull();
  });

  it('muestra el cursor Hippocampus en el nodo actual de la ruta', () => {
    const origen: Nodo = {
      id: 'ascensor-central-nivel-1',
      nombre: 'Ascensor principal',
      x: 0,
      y: 0,
      tipo: 'ascensor',
      nivel: 1
    };
    const destino: Nodo = {
      id: 'zona-kid-nivel-1',
      nombre: 'Mini Club Kids',
      x: 10,
      y: 0,
      tipo: 'servicio',
      nivel: 1
    };

    fixture.componentRef.setInput('nodos', [origen, destino]);
    fixture.componentRef.setInput('ruta', [origen, destino]);
    fixture.componentRef.setInput('nodoActualId', origen.id);
    fixture.componentRef.setInput('nivel', 1);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector(
        '.marcador-navegacion__hippocampus'
      )
    ).not.toBeNull();
  });

  it('alinea el plano original aunque Supabase use coordenadas pequeñas y conserva el cursor al llegar', () => {
    const nodos: Nodo[] = [
      { id: 'hall-nivel-1', nombre: 'Hall', x: 2, y: 3, nivel: 1, tipo: 'pasillo' },
      { id: 'gimnasio-nivel-1', nombre: 'Gimnasio', x: 4, y: 5, nivel: 1, tipo: 'gimnasio' }
    ];
    fixture.componentRef.setInput('nodos', nodos);
    fixture.componentRef.setInput('ruta', nodos);
    fixture.componentRef.setInput('conexiones', [{ origen: nodos[0].id, destino: nodos[1].id, distancia: 15.272 }]);
    fixture.componentRef.setInput('usarPlanoReal', true);
    fixture.componentRef.setInput('nodoActualId', nodos[0].id);
    fixture.detectChanges();
    const svg = fixture.nativeElement.querySelector('svg');
    expect(svg.getAttribute('viewBox')).toBe('0 0 1600 900');
    expect(svg.querySelector('image')?.getAttribute('href')).toContain('mapa-nivel-1-waze.webp');
    expect(component.nodoActualVisual?.xVisual).toBe(800);
    expect(component.nodoActualVisual?.yVisual).toBe(455);
    expect(svg.querySelectorAll('.nodo-nombre').length).toBe(0);
    expect(component.conexionesVisuales[0].trazado).toContain('900 585');
    fixture.componentRef.setInput('nodoActualId', nodos[1].id);
    fixture.detectChanges();
    expect(svg.querySelector('.marcador-navegacion')?.getAttribute('transform')).toBe('translate(1070 826)');
    expect(svg.querySelector('.marcador-navegacion__hippocampus')).not.toBeNull();
  });

  it('usa el mapa visual del nivel 3 y permite seleccionar sus destinos', () => {
    fixture.componentRef.setInput('nodos', [
      { id: 'ascensor-central-nivel-3', nombre: 'Ascensor principal', x: 4, y: 0, tipo: 'ascensor', nivel: 3 },
      { id: 'canchas-tenis-nivel-3', nombre: 'Canchas de tenis', x: 7, y: 5, tipo: 'cancha', nivel: 3 }
    ]);
    fixture.componentRef.setInput('nivel', 3);
    fixture.componentRef.setInput('usarPlanoReal', true);
    fixture.detectChanges();

    const svg = fixture.nativeElement.querySelector('svg') as SVGSVGElement;
    expect(svg.getAttribute('viewBox')).toBe('72 335 1203 470');
    expect(svg.querySelector('image')?.getAttribute('href')).toContain('mapa-nivel-3-waze.webp');
    expect(component.nodosVisuales.find(nodo => nodo.nodo.id === 'canchas-tenis-nivel-3')?.xVisual).toBe(240);
    expect(svg.querySelectorAll('.mapa-zona-clicable').length).toBe(2);
  });

  it('preserva la proporción de las coordenadas y ajusta las etiquetas de borde', () => {
    component.nivel = 1;
    component.nodos = [
      {
        id: 'origen',
        nombre: 'Origen',
        x: 0,
        y: 0,
        tipo: 'entrada',
        nivel: 1
      },
      {
        id: 'destino',
        nombre: 'Destino',
        x: 10,
        y: 0,
        tipo: 'pasillo',
        nivel: 1
      },
      {
        id: 'inferior',
        nombre: 'Inferior',
        x: 0,
        y: 5,
        tipo: 'pasillo',
        nivel: 1
      }
    ];

    const nodosVisuales = component.nodosVisuales;
    const origen = nodosVisuales.find(
      nodoVisual => nodoVisual.nodo.id === 'origen'
    )!;
    const destino = nodosVisuales.find(
      nodoVisual => nodoVisual.nodo.id === 'destino'
    )!;
    const inferior = nodosVisuales.find(
      nodoVisual => nodoVisual.nodo.id === 'inferior'
    )!;

    expect(
      (destino.xVisual - origen.xVisual) /
      (inferior.yVisual - origen.yVisual)
    ).toBe(2);
    expect(origen.etiquetaAncla).toBe('start');
    expect(origen.etiquetaY).toBeGreaterThan(0);
  });

  it('distingue los tramos recorridos, el tramo actual y los puntos ajenos a la ruta', () => {
    const nodos: Nodo[] = [
      {
        id: 'origen',
        nombre: 'Origen',
        x: 0,
        y: 0,
        tipo: 'entrada',
        nivel: 1
      },
      {
        id: 'actual',
        nombre: 'Actual',
        x: 2,
        y: 0,
        tipo: 'pasillo',
        nivel: 1
      },
      {
        id: 'destino',
        nombre: 'Destino',
        x: 4,
        y: 0,
        tipo: 'salon',
        nivel: 1
      },
      {
        id: 'externo',
        nombre: 'Externo',
        x: 2,
        y: 2,
        tipo: 'servicio',
        nivel: 1
      }
    ];

    const conexiones: Conexion[] = [
      {
        origen: 'origen',
        destino: 'actual',
        distancia: 2
      },
      {
        origen: 'actual',
        destino: 'destino',
        distancia: 2
      },
      {
        origen: 'actual',
        destino: 'externo',
        distancia: 2
      }
    ];

    component.nivel = 1;
    component.nodos = nodos;
    component.conexiones = conexiones;
    component.ruta = [
      nodos[0],
      nodos[1],
      nodos[2]
    ];
    component.nodoActualId = 'actual';
    component.origenId = 'origen';
    component.destinoId = 'destino';

    const nodosVisuales = component.nodosVisuales;
    const conexionesVisuales = component.conexionesVisuales;
    const origen = nodosVisuales.find(
      nodoVisual => nodoVisual.nodo.id === 'origen'
    )!;
    const actual = nodosVisuales.find(
      nodoVisual => nodoVisual.nodo.id === 'actual'
    )!;
    const destino = nodosVisuales.find(
      nodoVisual => nodoVisual.nodo.id === 'destino'
    )!;
    const externo = nodosVisuales.find(
      nodoVisual => nodoVisual.nodo.id === 'externo'
    )!;
    const tramoRecorrido = conexionesVisuales[0];
    const tramoActual = conexionesVisuales[1];
    const conexionExterna = conexionesVisuales[2];

    expect(origen.recorridoCompletado).toBe(true);
    expect(actual.esActual).toBe(true);
    expect(destino.recorridoPendiente).toBe(true);
    expect(externo.perteneceRuta).toBe(false);
    expect(tramoRecorrido.recorridoCompletado).toBe(true);
    expect(tramoActual.esTramoActual).toBe(true);
    expect(conexionExterna.perteneceRuta).toBe(false);

    component.nodoActualId = 'origen';

    const conexionesAlRetroceder =
      component.conexionesVisuales;

    expect(
      conexionesAlRetroceder[0].esTramoActual
    ).toBe(true);
    expect(
      conexionesAlRetroceder[1].recorridoPendiente
    ).toBe(true);

    component.nodoActualId = 'destino';

    const nodosAlFinalizar =
      component.nodosVisuales;
    const conexionesAlFinalizar =
      component.conexionesVisuales;
    const destinoFinal = nodosAlFinalizar.find(
      nodoVisual => nodoVisual.nodo.id === 'destino'
    )!;

    expect(destinoFinal.esActual).toBe(true);
    expect(
      conexionesAlFinalizar.every(
        conexion => conexion.recorridoCompletado
      )
    ).toBe(false);
    expect(
      conexionesAlFinalizar
        .slice(0, 2)
        .every(
          conexion => conexion.recorridoCompletado
        )
    ).toBe(true);
  });

  it('resume la navegación activa y orienta el marcador al siguiente punto', () => {
    const nodos: Nodo[] = [
      {
        id: 'origen',
        nombre: 'Recepción',
        x: 0,
        y: 0,
        tipo: 'recepcion',
        nivel: 1
      },
      {
        id: 'siguiente',
        nombre: 'Spa',
        x: 3,
        y: 0,
        tipo: 'spa',
        nivel: 1
      }
    ];

    component.nivel = 1;
    component.nodos = nodos;
    component.ruta = nodos;
    component.nodoActualId = 'origen';

    expect(component.navegacionActiva).toBe(true);
    expect(component.pasoActualRuta).toBe(1);
    expect(component.totalNodosRuta).toBe(2);
    expect(component.progresoNavegacion).toBe(0);
    expect(component.instruccionNavegacion).toBe('Sigue hacia Spa');
    expect(component.nodoActualVisual?.nodo.id).toBe('origen');
    expect(component.mostrarMarcadorDireccion).toBe(true);
    expect(component.anguloDireccionActual).toBe(90);

    component.nodoActualId = 'siguiente';

    expect(component.progresoNavegacion).toBe(100);
    expect(component.instruccionNavegacion).toBe('Llegaste a Spa');
    expect(component.mostrarMarcadorDireccion).toBe(true);
  });
});
