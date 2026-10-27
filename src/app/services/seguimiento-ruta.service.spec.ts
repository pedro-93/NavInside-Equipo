import { TestBed } from '@angular/core/testing';
import {
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';
import { BehaviorSubject, Subject } from 'rxjs';
import { Conexion, Nodo } from '../models/nodo.model';
import {
  SeguimientoRutaService
} from './seguimiento-ruta.service';
import {
  MuestraMovimientoNavegacion,
  SensoresNavegacionService
} from './sensores-navegacion.service';

describe('Seguimiento por pasos y orientación', () => {
  let servicio: SeguimientoRutaService;
  let movimientos: Subject<MuestraMovimientoNavegacion>;
  let rumbos: Subject<number>;
  let tiempo: number;
  let rumbo: number | null;

  const ruta: Nodo[] = [
    {
      id: 'a',
      nombre: 'A',
      x: 0,
      y: 0,
      nivel: 4,
      tipo: 'entrada'
    },
    {
      id: 'b',
      nombre: 'B',
      x: 100,
      y: 0,
      nivel: 4,
      tipo: 'pasillo'
    },
    {
      id: 'c',
      nombre: 'C',
      x: 200,
      y: 0,
      nivel: 4,
      tipo: 'servicio'
    }
  ];

  const conexiones: Conexion[] = [
    {
      origen: 'a',
      destino: 'b',
      distancia: 10,
      tipo: 'pasillo'
    },
    {
      origen: 'b',
      destino: 'c',
      distancia: 10,
      tipo: 'pasillo'
    }
  ];

  beforeEach(async () => {
    tiempo = 0;
    rumbo = null;

    vi.spyOn(performance, 'now')
      .mockImplementation(() => tiempo);

    movimientos = new Subject();
    rumbos = new Subject();

    const estado = new BehaviorSubject({
      iniciado: false
    });

    TestBed.configureTestingModule({
      providers: [
        SeguimientoRutaService,
        {
          provide: SensoresNavegacionService,
          useValue: {
            movimiento$: movimientos,
            rumbo$: rumbos,
            estado$: estado,
            iniciar: async () => {
              estado.next({
                iniciado: true
              });
            },
            detener: async () => {
              estado.next({
                iniciado: false
              });
            }
          }
        }
      ]
    });

    servicio = TestBed.inject(
      SeguimientoRutaService
    );

    await servicio.iniciar(
      ruta,
      conexiones,
      0.2
    );

    muestra(9.8);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  function muestra(valor: number): void {
    tiempo += 50;

    if (rumbo !== null) {
      rumbos.next(rumbo);
    }

    movimientos.next({
      instanteMs: tiempo,
      magnitudConGravedad: valor,
      magnitudSinGravedad: null
    });
  }

  function caminar(cantidad: number): void {
    for (
      let paso = 0;
      paso < cantidad;
      paso++
    ) {
      for (
        const valor of [
          12.8,
          12.8,
          12.8,
          8.3,
          8.3,
          9.8,
          9.8,
          9.8,
          9.8,
          9.8,
          9.8,
          9.8
        ]
      ) {
        muestra(valor);
      }
    }
  }

  function calibrar(): void {
    rumbo = 90;

    rumbos.next(rumbo);

    expect(
      servicio.calibrarOrientacion()
    ).toBe(true);

    muestra(9.8);
  }

  it('no suma pasos estando quieto', () => {
    for (let i = 0; i < 400; i++) {
      muestra(9.8);
    }

    expect(
      servicio.obtenerEstado().pasosEstimados
    ).toBe(0);
  });

  it('descarta tres oscilaciones aisladas', () => {
    caminar(3);

    expect(
      servicio.obtenerEstado().pasosEstimados
    ).toBe(0);
  });

  it(
    'convierte pasos detectados usando 0,200 m y conserva las distancias de ruta',
    () => {
      caminar(10);

      const estado =
        servicio.obtenerEstado();

      expect(
        estado.pasosEstimados
      ).toBe(10);

      expect(
        estado.metrosRecorridos
      ).toBeCloseTo(2);

      expect(
        estado.metrosRestantes
      ).toBeCloseTo(18);

      expect(
        conexiones[0].distancia
      ).toBe(10);
    }
  );

  it('requiere rumbo reciente para calibrar', () => {
    expect(
      servicio.calibrarOrientacion()
    ).toBe(false);

    rumbos.next(90);

    tiempo += 2100;

    expect(
      servicio.calibrarOrientacion()
    ).toBe(false);
  });

  it(
    'avanza y retrocede sobre el tramo al invertir el rumbo calibrado',
    () => {
      calibrar();
      caminar(10);

      rumbo = 270;
      caminar(4);

      expect(
        servicio.obtenerEstado().metrosRecorridos
      ).toBeCloseTo(1.2);

      expect(
        servicio.obtenerEstado().direccion
      ).toBe('retrocediendo');
    }
  );

  it('no retrocede antes del origen', () => {
    calibrar();

    rumbo = 270;
    caminar(10);

    expect(
      servicio.obtenerEstado().metrosRecorridos
    ).toBe(0);
  });

  it(
    'detiene el avance ante una dirección transversal',
    () => {
      calibrar();

      rumbo = 180;
      caminar(10);

      expect(
        servicio.obtenerEstado().metrosRecorridos
      ).toBe(0);

      expect(
        servicio.obtenerEstado().direccion
      ).toBe('desviado');
    }
  );

  it(
    'detiene el avance si el rumbo calibrado deja de actualizarse',
    () => {
      calibrar();

      rumbo = null;
      tiempo += 3000;

      muestra(9.8);
      caminar(6);

      expect(
        servicio.obtenerEstado().metrosRecorridos
      ).toBe(0);

      expect(
        servicio.obtenerEstado().direccion
      ).toBe('sin-rumbo');
    }
  );

  it(
    'un QR corrige hacia atrás sin alterar el conteo de pasos',
    () => {
      caminar(60);

      expect(
        servicio.obtenerEstado().indiceNodo
      ).toBe(1);

      expect(
        servicio.confirmarNodo('a')
      ).toBe(true);

      expect(
        servicio.obtenerEstado().metrosRecorridos
      ).toBe(0);

      expect(
        servicio.obtenerEstado().pasosEstimados
      ).toBe(60);
    }
  );

  it(
    'permite regresar desde una llegada estimada antes de confirmarla',
    () => {
      calibrar();
      caminar(100);

      expect(
        servicio.obtenerEstado().fase
      ).toBe('llegada-estimada');

      rumbo = 270;
      caminar(4);

      expect(
        servicio.obtenerEstado().fase
      ).toBe('siguiendo');

      expect(
        servicio.obtenerEstado().metrosRecorridos
      ).toBeLessThan(20);
    }
  );

  it(
    'no mezcla pasos con la sesión pausada',
    async () => {
      calibrar();
      caminar(10);

      await servicio.pausar();

      caminar(10);

      expect(
        servicio.obtenerEstado().metrosRecorridos
      ).toBeCloseTo(2);
    }
  );

  it(
    'requiere confirmar el nivel y rechaza calibrar nodos sin posición en el plano',
    async () => {
      const otraRuta: Nodo[] = [
        ruta[0],
        {
          ...ruta[1],
          nivel: 1
        },
        {
          ...ruta[2],
          nivel: 1
        }
      ];

      await servicio.iniciar(
        otraRuta,
        [
          {
            origen: 'a',
            destino: 'b',
            distancia: 0,
            tipo: 'ascensor'
          },
          conexiones[1]
        ],
        0.2
      );

      expect(
        servicio.obtenerEstado().fase
      ).toBe('confirmar-nivel');

      expect(
        servicio.confirmarNodo('b')
      ).toBe(true);

      // Este nivel usa posiciones ilustradas:
      // nodos sin posición no se calibran por inferencia.
      rumbos.next(90);

      expect(
        servicio.calibrarOrientacion()
      ).toBe(false);

      expect(
        servicio.obtenerEstado().origenTramoId
      ).toBe('b');
    }
  );
});