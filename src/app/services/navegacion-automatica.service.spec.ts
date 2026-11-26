import { TestBed } from '@angular/core/testing';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';
import { BehaviorSubject, Subject } from 'rxjs';
import { Position } from '@capacitor/geolocation';
import { Conexion, Nodo } from '../models/nodo.model';
import {
  CandidatoWifi,
  PosicionamientoApoyoService
} from './posicionamiento-apoyo.service';
import {
  SensoresNavegacionService
} from './sensores-navegacion.service';
import {
  CorreccionAutomatica,
  NavegacionAutomaticaService,
  nodoWifiConfiable
} from './navegacion-automatica.service';
import { HomePage } from '../home/home.page';
import { MapaService } from './mapa.service';
import {
  MapaRutaComponent
} from '../components/mapa-ruta/mapa-ruta.component';
import {
  SeguimientoRutaService
} from './seguimiento-ruta.service';

const gradosMetro =
  180 / (Math.PI * 6371000);

const nodos: Nodo[] = [
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
    x: 300,
    y: 0,
    nivel: 4,
    tipo: 'recepcion'
  },
  {
    id: 'c',
    nombre: 'C',
    x: 0,
    y: 300,
    nivel: 4,
    tipo: 'pasillo'
  }
];

const conexiones: Conexion[] = [
  {
    origen: 'a',
    destino: 'b',
    distancia: 30,
    tipo: 'pasillo'
  },
  {
    origen: 'a',
    destino: 'c',
    distancia: 30,
    tipo: 'pasillo'
  }
];

function candidato(
  id = 'a',
  diferenciaDbm = 1
): CandidatoWifi {
  return {
    coincidencias: 3,
    coincidenciasBssid: 3,
    diferenciaDbm,
    huella: {
      id,
      nombre: id,
      nodoIds: [id],
      hora: '',
      observacion: '',
      lecturas: []
    }
  };
}

describe('Corrección automática conservadora', () => {
  let servicio: NavegacionAutomaticaService;
  let gps: Subject<Position>;
  let wifi: Subject<{
    timestamp: number;
    candidatos: CandidatoWifi[];
  }>;
  let eventos: CorreccionAutomatica[];
  let iniciado: boolean;

  beforeEach(() => {
    vi.useFakeTimers();

    vi.setSystemTime(
      new Date('2026-10-27T22:00:00Z')
    );

    gps = new Subject();
    wifi = new Subject();
    eventos = [];
    iniciado = true;

    const referencias = nodos.map(n => ({
      nodoId: n.id,
      accuracy: 1,
      timestamp: Date.now(),
      latitude: n.y / 10 * gradosMetro,
      longitude: n.x / 10 * gradosMetro
    }));

    TestBed.configureTestingModule({
      providers: [
        NavegacionAutomaticaService,
        {
          provide: PosicionamientoApoyoService,
          useValue: {
            muestrasWifi$: wifi,
            wifiDisponible: true,
            buscarWifi:
              vi.fn().mockResolvedValue(undefined),
            obtenerReferenciasGps:
              () => referencias
          }
        },
        {
          provide: SensoresNavegacionService,
          useValue: {
            posicionGps$: gps,
            estado$: new BehaviorSubject({
              iniciado: true
            }),
            obtenerEstado: () => ({
              iniciado
            })
          }
        }
      ]
    });

    servicio = TestBed.inject(
      NavegacionAutomaticaService
    );

    servicio.configurar(
      nodos.slice(0, 2),
      nodos,
      conexiones,
      4
    );

    servicio.correccion$.subscribe(
      e => eventos.push(e)
    );
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  function posicion(
    x: number,
    y: number,
    accuracy = 1
  ): void {
    vi.advanceTimersByTime(1000);

    gps.next({
      timestamp: Date.now(),
      coords: {
        latitude: y * gradosMetro,
        longitude: x * gradosMetro,
        accuracy,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null
      }
    });
  }

  it(
    'requiere sensores activos y activación explícita',
    () => {
      posicion(5, 1);

      expect(eventos).toEqual([]);

      iniciado = false;

      expect(
        servicio.iniciar()
      ).toBe(false);
    }
  );

  it(
    'rechaza sectores compartidos, BSSID insuficientes y alternativas parecidas',
    () => {
      const compartido = candidato();

      compartido.huella.nodoIds = ['a', 'b'];

      expect(
        nodoWifiConfiable([compartido])
      ).toBeNull();

      expect(
        nodoWifiConfiable([
          {
            ...candidato(),
            coincidenciasBssid: 1
          }
        ])
      ).toBeNull();

      expect(
        nodoWifiConfiable([
          candidato('a'),
          candidato('b', 3)
        ])
      ).toBeNull();
    }
  );

  it(
    'solo corrige Wi-Fi después de dos escaneos independientes',
    () => {
      servicio.iniciar();

      wifi.next({
        timestamp: Date.now(),
        candidatos: [candidato()]
      });

      expect(eventos).toEqual([]);

      vi.advanceTimersByTime(40000);

      wifi.next({
        timestamp: Date.now(),
        candidatos: [candidato()]
      });

      expect(eventos).toEqual([
        {
          tipo: 'nodo',
          nodoId: 'a',
          fuente: 'wifi'
        }
      ]);
    }
  );

  it(
    'no corrige con escaneos repetidos, antiguos o de otro nivel',
    () => {
      servicio.iniciar();

      const timestamp = Date.now();

      wifi.next({
        timestamp,
        candidatos: [candidato()]
      });

      wifi.next({
        timestamp,
        candidatos: [candidato()]
      });

      vi.advanceTimersByTime(40000);

      wifi.next({
        timestamp,
        candidatos: [candidato()]
      });

      wifi.next({
        timestamp: Date.now(),
        candidatos: [
          candidato('desconocido')
        ]
      });

      expect(eventos).toEqual([]);
    }
  );

  it(
    'exige tres lecturas GPS antes de corregir sobre una ruta',
    () => {
      servicio.iniciar();

      posicion(10, 1);
      posicion(10, 1);

      expect(eventos).toEqual([]);

      posicion(10, 1);

      expect(
        eventos[0].tipo
      ).toBe('tramo');

      if (eventos[0].tipo === 'tramo') {
        expect(
          eventos[0].fraccion
        ).toBeCloseTo(1 / 3);
      }
    }
  );

  it(
    'no usa un GPS de 13 metros para mover el cursor',
    () => {
      servicio.iniciar();

      posicion(10, 1, 13);
      posicion(10, 1, 13);
      posicion(10, 1, 13);

      expect(eventos).toEqual([]);
    }
  );

  it(
    'detecta salida de ruta y solo propone recálculo al identificar un nodo',
    () => {
      servicio.iniciar();

      posicion(0, 30);
      posicion(0, 30);
      posicion(0, 30);

      expect(eventos).toEqual([
        {
          tipo: 'desvio'
        },
        {
          tipo: 'nodo',
          nodoId: 'c',
          fuente: 'gps'
        }
      ]);
    }
  );

  it(
    'un desvío sin un nodo cercano detiene el avance sin inventar un origen',
    () => {
      servicio.iniciar();

      posicion(5, 15);
      posicion(5, 15);
      posicion(5, 15);

      expect(eventos).toEqual([
        {
          tipo: 'desvio'
        }
      ]);
    }
  );

  it(
    'detiene las correcciones al desactivar',
    () => {
      servicio.iniciar();
      servicio.detener();

      posicion(10, 1);
      posicion(10, 1);
      posicion(10, 1);

      expect(eventos).toEqual([]);
    }
  );
});

describe('Integración de correcciones con rutas y mapa', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  async function pagina(): Promise<HomePage> {
    vi.spyOn(
      MapaService.prototype,
      'cargarMapaDesdeSupabase'
    ).mockResolvedValue(false);

    const fixture =
      TestBed.createComponent(HomePage);

    const p = fixture.componentInstance;

    p.seleccionarIdioma('es');

    vi.spyOn(
      p['sensoresNavegacion'],
      'iniciar'
    ).mockResolvedValue(undefined);

    vi.spyOn(
      p['sensoresNavegacion'],
      'detener'
    ).mockResolvedValue(undefined);

    vi.spyOn(
      p['navegacionAutomatica'],
      'iniciar'
    ).mockReturnValue(true);

    p.origen = 'entrada-nivel-4';
    p.destino = 'recepcion-turismo-vina-nivel-4';

    p.calcularRuta();

    p.origenConfirmadoSeguimiento = true;

    await p.iniciarSeguimientoFisico();

    p.estadoAutomatico = {
      activa: true,
      posicion: null,
      estado: 'buscando'
    };

    return p;
  }

  it(
    'recalcula desde un POI identificado fuera de ruta conservando el destino',
    async () => {
      const p = await pagina();

      await p['aplicarCorreccionAutomatica']({
        tipo: 'nodo',
        nodoId: 'recepcion-resort-nivel-4',
        fuente: 'wifi'
      });

      expect(p.origen).toBe(
        'recepcion-resort-nivel-4'
      );

      expect(p.destino).toBe(
        'recepcion-turismo-vina-nivel-4'
      );

      expect(
        p.rutaCalculada[0].id
      ).toBe('recepcion-resort-nivel-4');

      expect(
        p.rutaCalculada.at(-1)?.id
      ).toBe(p.destino);

      expect(
        p.seguimientoFisicoSeleccionado
      ).toBe(true);
    }
  );

  it(
    'no acepta una identificación de otro piso ni corrige con automatismo apagado',
    async () => {
      const p = await pagina();

      const original =
        p.rutaCalculada.map(n => n.id);

      await p['aplicarCorreccionAutomatica']({
        tipo: 'nodo',
        nodoId: 'hall-nivel-1',
        fuente: 'wifi'
      });

      expect(
        p.rutaCalculada.map(n => n.id)
      ).toEqual(original);

      p.estadoAutomatico.activa = false;

      await p['aplicarCorreccionAutomatica']({
        tipo: 'nodo',
        nodoId: 'recepcion-resort-nivel-4',
        fuente: 'wifi'
      });

      expect(p.origen).toBe(
        'entrada-nivel-4'
      );
    }
  );

  it(
    'un desvío sin ubicación identificada bloquea la estimación sin modificar la ruta',
    async () => {
      const p = await pagina();

      await p['aplicarCorreccionAutomatica']({
        tipo: 'desvio'
      });

      expect(
        p.seguimientoFisico?.direccion
      ).toBe('desviado');

      expect(p.origen).toBe(
        'entrada-nivel-4'
      );
    }
  );

  it(
    'la corrección GPS admite retroceso sin modificar distancias ni saltar de piso',
    async () => {
      const movimientos = new Subject();

      const estado = new BehaviorSubject({
        iniciado: true
      });

      TestBed.configureTestingModule({
        providers: [
          SeguimientoRutaService,
          {
            provide: SensoresNavegacionService,
            useValue: {
              movimiento$: movimientos,
              rumbo$: new Subject(),
              estado$: estado,
              iniciar:
                async () => undefined,
              detener:
                async () => undefined
            }
          }
        ]
      });

      const servicio = TestBed.inject(
        SeguimientoRutaService
      );

      const ruta = [
        nodos[0],
        nodos[1],
        {
          ...nodos[2],
          nivel: 1
        }
      ];

      const enlaces: Conexion[] = [
        conexiones[0],
        {
          origen: 'b',
          destino: 'c',
          distancia: 0,
          tipo: 'ascensor'
        }
      ];

      await servicio.iniciar(
        ruta,
        enlaces,
        0.2
      );

      expect(
        servicio.corregirTramo(0, 0.6)
      ).toBe(true);

      expect(
        servicio.corregirTramo(0, 0.3)
      ).toBe(true);

      expect(
        servicio.obtenerEstado().direccion
      ).toBe('retrocediendo');

      expect(
        servicio.obtenerEstado().metrosRecorridos
      ).toBeCloseTo(9);

      expect(
        servicio.corregirTramo(1, 0.5)
      ).toBe(false);

      expect(
        enlaces[0].distancia
      ).toBe(30);

      servicio.bloquearPorDesvio();

      expect(
        servicio.obtenerEstado().direccion
      ).toBe('desviado');

      expect(
        servicio.confirmarNodo('a')
      ).toBe(true);

      expect(
        servicio.corregirTramo(0, 0.2)
      ).toBe(true);
    }
  );

  it(
    'el mapa invierte la flecha y utiliza la instrucción de regreso',
    () => {
      const mapa =
        TestBed.createComponent(
          MapaRutaComponent
        ).componentInstance;

      mapa.seguimientoFisico = {
        fase: 'siguiendo',
        indiceNodo: 0,
        origenTramoId: 'a',
        destinoTramoId: 'b',
        fraccionTramo: 0.5,
        metrosRecorridos: 15,
        metrosRestantes: 15,
        pasosEstimados: 10,
        longitudPasoMetros: 0.2,
        direccion: 'avanzando'
      };

      const antes =
        mapa.anguloDireccionActual;

      mapa.seguimientoFisico = {
        ...mapa.seguimientoFisico,
        direccion: 'retrocediendo'
      };

      mapa.textoInstruccionFisica =
        'Regresas hacia Entrada.';

      expect(
        mapa.anguloDireccionActual - antes
      ).toBe(180);

      expect(
        mapa.instruccionNavegacion
      ).toBe('Regresas hacia Entrada.');
    }
  );
});

describe('Registro local de huellas Wi-Fi', () => {
  let servicio: PosicionamientoApoyoService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        PosicionamientoApoyoService,
        {
          provide: MapaService,
          useValue: {
            obtenerNodoPorId:
              (id: string) =>
                nodos.find(n => n.id === id)
          }
        },
        {
          provide: SensoresNavegacionService,
          useValue: {
            posicionGps$: new Subject()
          }
        }
      ]
    });

    servicio = TestBed.inject(
      PosicionamientoApoyoService
    );
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
  });

  function lectura(
    cantidad: number,
    antiguedad = 0
  ): void {
    servicio['instanteWifi'] =
      Date.now() - antiguedad;

    servicio['estadoInterno'].next({
      buscandoWifi: false,
      candidatos: [],
      errorWifi: null,
      lecturas: Array.from(
        {
          length: cantidad
        },
        (_, i) => ({
          ssid: `AP${i}`,
          bssid: `00:11:22:33:44:0${i}`,
          rssi: -50 - i,
          frequency: 2412,
          ageMs: 0
        })
      )
    });
  }

  it(
    'no registra huellas insuficientes, antiguas ni de un nodo desconocido',
    () => {
      lectura(2);

      expect(
        servicio.guardarHuellaWifi('a')
      ).toBe(false);

      lectura(3, 11000);

      expect(
        servicio.guardarHuellaWifi('a')
      ).toBe(false);

      lectura(3);

      expect(
        servicio.guardarHuellaWifi('inventado')
      ).toBe(false);
    }
  );

  it(
    'conserva BSSID y RSSI medidos asociados a un único nodo confirmado',
    () => {
      lectura(3);

      expect(
        servicio.guardarHuellaWifi('a')
      ).toBe(true);

      const datos = JSON.parse(
        localStorage.getItem(
          'navinside.huellas-wifi-poi.v1'
        )!
      );

      expect(
        datos[0].nodoIds
      ).toEqual(['a']);

      expect(
        datos[0].lecturas[0]
      ).toEqual({
        ssid: 'AP0',
        bssid: '00:11:22:33:44:00',
        rssi: -50,
        canal: '1'
      });

      lectura(3);

      expect(
        servicio.guardarHuellaWifi('a')
      ).toBe(true);

      expect(
        JSON.parse(
          localStorage.getItem(
            'navinside.huellas-wifi-poi.v1'
          )!
        ).length
      ).toBe(1);
    }
  );
});