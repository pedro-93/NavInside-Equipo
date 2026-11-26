import { describe, expect, it } from 'vitest';
import {
  GeorreferenciaService
} from './georreferencia.service';
import { Nodo } from '../models/nodo.model';
import {
  ReferenciaGpsPoi
} from './posicionamiento-apoyo.service';

const servicio = new GeorreferenciaService();

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

const referencias: ReferenciaGpsPoi[] =
  nodos.map(n => ({
    nodoId: n.id,
    latitude: n.y / 10 * gradosMetro,
    longitude: n.x / 10 * gradosMetro,
    accuracy: 1,
    timestamp: Date.now()
  }));

describe('GPS sobre el plano calibrado', () => {
  it(
    'no inventa calibración con menos de tres puntos',
    () => {
      expect(
        servicio.crearModelo(
          4,
          referencias.slice(0, 2),
          nodos
        )
      ).toBeNull();
    }
  );

  it(
    'rechaza anclas de otro nivel, imprecisas, duplicadas o alineadas',
    () => {
      expect(
        servicio.crearModelo(
          1,
          referencias,
          nodos
        )
      ).toBeNull();

      expect(
        servicio.crearModelo(
          4,
          referencias.map(r => ({
            ...r,
            accuracy: 13
          })),
          nodos
        )
      ).toBeNull();

      expect(
        servicio.crearModelo(
          4,
          [
            referencias[0],
            referencias[0],
            referencias[1]
          ],
          nodos
        )
      ).toBeNull();

      expect(
        servicio.crearModelo(
          4,
          referencias.map(r => ({
            ...r,
            latitude: 0
          })),
          nodos
        )
      ).toBeNull();
    }
  );

  it(
    'proyecta una posición interior y conserva los datos originales',
    () => {
      const original =
        JSON.stringify(nodos);

      const modelo =
        servicio.crearModelo(
          4,
          referencias,
          nodos
        )!;

      const p = servicio.proyectar(
        modelo,
        {
          latitude: 5 * gradosMetro,
          longitude: 10 * gradosMetro
        },
        1,
        Date.now()
      )!;

      expect(p.x).toBeCloseTo(100);
      expect(p.y).toBeCloseTo(50);

      expect(
        p.incertidumbreMetros
      ).toBe(2);

      expect(
        JSON.stringify(nodos)
      ).toBe(original);
    }
  );

  it(
    'rechaza GPS antiguo, impreciso y fuera del área calibrada',
    () => {
      const modelo =
        servicio.crearModelo(
          4,
          referencias,
          nodos
        )!;

      const geo = {
        latitude: 5 * gradosMetro,
        longitude: 5 * gradosMetro
      };

      expect(
        servicio.proyectar(
          modelo,
          geo,
          13,
          Date.now()
        )
      ).toBeNull();

      expect(
        servicio.proyectar(
          modelo,
          geo,
          1,
          Date.now() - 11000
        )
      ).toBeNull();

      expect(
        servicio.proyectar(
          modelo,
          {
            latitude: -gradosMetro,
            longitude: 0
          },
          1,
          Date.now()
        )
      ).toBeNull();
    }
  );

  it(
    'proyecta sobre un tramo usando metros geográficos y no confunde píxeles con metros',
    () => {
      const modelo =
        servicio.crearModelo(
          4,
          referencias,
          nodos
        )!;

      const p = servicio.proyectar(
        modelo,
        {
          latitude: gradosMetro,
          longitude: 10 * gradosMetro
        },
        1,
        Date.now()
      )!;

      const proyeccion =
        servicio.proyectarRuta(
          modelo,
          p,
          nodos.slice(0, 2),
          [
            {
              origen: 'a',
              destino: 'b',
              distancia: 30,
              tipo: 'pasillo'
            }
          ]
        )!;

      expect(
        proyeccion.fraccion
      ).toBeCloseTo(1 / 3);

      expect(
        proyeccion.separacionMetros
      ).toBeCloseTo(1);
    }
  );

  it(
    'rechaza una cuarta referencia incompatible con las otras',
    () => {
      const otros = [
        ...nodos,
        {
          ...nodos[0],
          id: 'd',
          x: 100,
          y: 100
        }
      ];

      expect(
        servicio.crearModelo(
          4,
          [
            ...referencias,
            {
              ...referencias[0],
              nodoId: 'd',
              latitude: 0,
              longitude: 0
            }
          ],
          otros
        )
      ).toBeNull();
    }
  );
});