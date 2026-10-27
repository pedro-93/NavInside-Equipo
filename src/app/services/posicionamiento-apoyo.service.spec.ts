import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { Position } from '@capacitor/geolocation';

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import {
  compararHuellasWifi,
  distanciaGpsMetros,
  LecturaWifiActual,
  PosicionamientoApoyoService
} from './posicionamiento-apoyo.service';

import { MapaService } from './mapa.service';

import {
  SensoresNavegacionService
} from './sensores-navegacion.service';

function red(
  ssid: string,
  bssid: string,
  rssi: number,
  frequency = 2412,
  ageMs = 0
): LecturaWifiActual {
  return {
    ssid,
    bssid,
    rssi,
    frequency,
    ageMs
  };
}

describe(
  'Comparación conservadora de huellas Wi-Fi',
  () => {
    it(
      'rechaza una única señal como prueba de ubicación',
      () => {
        expect(
          compararHuellasWifi([
            red(
              'Getnet_Faro',
              '40:3f:8c:cb:33:08',
              -28,
              2437
            )
          ])
        ).toEqual([]);
      }
    );

    it(
      'no usa el nombre de red para sustituir un BSSID conocido diferente',
      () => {
        expect(
          compararHuellasWifi([
            red(
              'movistar2,4GHZ_E23C58',
              '00:00:00:00:00:01',
              -36
            ),
            red(
              'RRHH',
              '00:00:00:00:00:02',
              -85,
              2417
            )
          ])
        ).toEqual([]);
      }
    );

    it(
      'reconoce coincidencias del Hall por BSSID completo',
      () => {
        const candidatos = compararHuellasWifi([
          red(
            'movistar2,4GHZ_E23C58',
            'e4:ab:89:e2:3c:58',
            -36
          ),
          red(
            'RRHH',
            'c0:25:e9:32:33:26',
            -85,
            2417
          )
        ]);

        expect(candidatos[0].huella.id)
          .toBe('hall');

        expect(candidatos[0].coincidenciasBssid)
          .toBe(2);
      }
    );

    it(
      'rechaza resultados viejos y otras bandas',
      () => {
        expect(
          compararHuellasWifi([
            red(
              'movistar2,4GHZ_E23C58',
              'e4:ab:89:e2:3c:58',
              -36,
              2412,
              40000
            ),
            red(
              'RRHH',
              'c0:25:e9:32:33:26',
              -85,
              5200
            )
          ])
        ).toEqual([]);
      }
    );

    it(
      'no distingue Entrada de Turismo en una captura conjunta',
      () => {
        const candidatos = compararHuellasWifi([
          red(
            'Admin_hippo',
            'fa:92:bf:cd:a3:2c',
            -69,
            2437
          ),
          red(
            'Hippocampus',
            'f4:92:bf:cd:a3:2c',
            -70,
            2437
          )
        ]);

        expect(candidatos[0].huella.nodoIds)
          .toEqual([
            'entrada-nivel-4',
            'recepcion-turismo-vina-nivel-4'
          ]);
      }
    );

    it(
      'calcula metros geográficos sin usar los píxeles del plano',
      () => {
        expect(
          distanciaGpsMetros(
            {
              latitude: 0,
              longitude: 0
            },
            {
              latitude: 0,
              longitude: 0
            }
          )
        ).toBe(0);

        expect(
          distanciaGpsMetros(
            {
              latitude: 0,
              longitude: 0
            },
            {
              latitude: 0,
              longitude: 0.001
            }
          )
        ).toBeCloseTo(111.19, 1);
      }
    );
  }
);

describe('Referencias GPS de POI confirmados', () => {
  let servicio: PosicionamientoApoyoService;
  let posiciones: Subject<Position>;

  beforeEach(() => {
    localStorage.clear();

    posiciones = new Subject<Position>();

    TestBed.configureTestingModule({
      providers: [
        PosicionamientoApoyoService,
        {
          provide: SensoresNavegacionService,
          useValue: {
            posicionGps$: posiciones
          }
        },
        {
          provide: MapaService,
          useValue: {
            obtenerNodoPorId: (id: string) =>
              ['hall', 'otro'].includes(id)
                ? {
                    id,
                    nivel: 1
                  }
                : undefined
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
    vi.restoreAllMocks();
  });

  function posicion(
    accuracy = 3,
    timestamp = Date.now()
  ): void {
    posiciones.next({
      timestamp,
      coords: {
        latitude: -32.9,
        longitude: -71.5,
        accuracy,
        altitude: null,
        altitudeAccuracy: null,
        speed: null,
        heading: null
      }
    });
  }

  it(
    'no crea referencias sin una lectura GPS',
    () => {
      expect(
        servicio.guardarReferenciaGps('hall')
      ).toBe(false);
    }
  );

  it(
    'rechaza GPS de 28 metros de precisión y nodos inexistentes',
    () => {
      posicion(28);

      expect(
        servicio.guardarReferenciaGps('hall')
      ).toBe(false);

      posicion(3);

      expect(
        servicio.guardarReferenciaGps('inventado')
      ).toBe(false);
    }
  );

  it(
    'guarda una referencia precisa y solo sugiere el nivel indicado',
    () => {
      posicion();

      expect(
        servicio.guardarReferenciaGps('hall')
      ).toBe(true);

      expect(
        servicio.sugerirPoiGps(1)
      ).toBe('hall');

      expect(
        servicio.sugerirPoiGps(4)
      ).toBeNull();
    }
  );

  it(
    'rechaza lecturas antiguas y coordenadas ambiguas',
    () => {
      posicion(
        3,
        Date.now() - 11000
      );

      expect(
        servicio.guardarReferenciaGps('hall')
      ).toBe(false);

      posicion();

      servicio.guardarReferenciaGps('hall');
      servicio.guardarReferenciaGps('otro');

      expect(
        servicio.sugerirPoiGps(1)
      ).toBeNull();
    }
  );
});