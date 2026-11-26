import {
  
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import {
  MapaService
} from './mapa.service';

const respuestaSupabase = {
  mapa: { data: { id: 'hippocampus-resort' }, error: null },
  nodos: { data: [] as object[], error: null },
  conexiones: { data: [] as object[], error: null }
};

function crearServicioDePrueba(): MapaService {
  const servicio = new MapaService();
  const cliente = servicio['supabase'];
  vi.spyOn(cliente, 'from').mockImplementation(tabla => {
    const consulta = tabla === 'mapas'
      ? { maybeSingle: vi.fn().mockResolvedValue(respuestaSupabase.mapa) }
      : { order: vi.fn().mockResolvedValue(
          tabla === 'nodos' ? respuestaSupabase.nodos : respuestaSupabase.conexiones
        ) };
    return {
      select: () => ({ eq: () => consulta })
    } as unknown as ReturnType<typeof cliente.from>;
  });
  return servicio;
}

describe.sequential(
  'MapaService',
  () => {
    let servicio: MapaService;

    beforeEach(() => {
      respuestaSupabase.mapa = {
        data: {
          id: 'hippocampus-resort'
        },
        error: null
      };

      respuestaSupabase.nodos = {
        data: [],
        error: null
      };

      respuestaSupabase.conexiones = {
        data: [],
        error: null
      };

      servicio = crearServicioDePrueba();
    });

    it(
      'inicia usando el respaldo local',
      () => {
        expect(
          servicio.obtenerEstadoCarga()
        ).toEqual({
          origenActivo: 'local',
          ultimaComprobacion: null,
          ultimaCargaExitosa: null,
          ultimoIntentoExitoso: null
        });
      }
    );

    it(
      'entrega los nodos reales del mapa activo',
      () => {
        const nodos =
          servicio
            .obtenerNodosNavegables();

        expect(
          nodos.some(
            nodo =>
              nodo.id ===
              'entrada-nivel-4'
          )
        ).toBe(true);

        expect(
          nodos.some(
            nodo =>
              nodo.id ===
              'alma-spa-tinaja-piso-6'
          )
        ).toBe(true);
      }
    );

    it(
      'encuentra un lugar de Hippocampus',
      () => {
        const lugar =
          servicio
            .obtenerLugarPreliminarPorId(
              'piscina-temperada-nivel-3'
            );

        expect(lugar?.nombre)
          .toBe(
            'Piscina Temperada'
          );

        expect(lugar?.nivel)
          .toBe(3);
      }
    );

    it(
      'entrega los niveles y el piso levantados',
      () => {
        expect(
          servicio.obtenerNiveles()
        ).toEqual([
          1,
          3,
          4,
          5,
          6
        ]);
      }
    );

    it(
      'cierra y habilita una conexión',
      () => {
        const origen =
          'entrada-nivel-4';

        const destino =
          'recepcion-resort-nivel-4';

        servicio.cerrarConexion(
          origen,
          destino
        );

        expect(
          servicio
            .estaConexionCerrada(
              origen,
              destino
            )
        ).toBe(true);

        servicio.habilitarConexion(
          origen,
          destino
        );

        expect(
          servicio
            .estaConexionCerrada(
              origen,
              destino
            )
        ).toBe(false);
      }
    );

    it(
      'excluye datos sin validar en modo accesible',
      () => {
        const conexiones =
          servicio
            .obtenerConexionesHabilitadas(
              true
            );

        expect(
          conexiones.some(
            conexion =>
              conexion.destino ===
              'restaurant-faro-nivel-3'
          )
        ).toBe(false);
      }
    );

    it(
      'conserva el respaldo local si Supabase entrega datos incompletos',
      async () => {
        const nodosLocales =
          servicio
            .obtenerNodosNavegables();

        vi.spyOn(
          console,
          'warn'
        ).mockImplementation(
          () => undefined
        );

        const resultado =
          await servicio
            .cargarMapaDesdeSupabase();

        expect(resultado)
          .toBe(false);

        expect(
          servicio
            .obtenerNodosNavegables()
        ).toEqual(
          nodosLocales
        );

        const estado =
          servicio
            .obtenerEstadoCarga();

        expect(
          estado.origenActivo
        ).toBe('local');

        expect(
          estado.ultimoIntentoExitoso
        ).toBe(false);

        expect(
          estado.ultimaComprobacion
        ).not.toBeNull();

        expect(
          estado.ultimaCargaExitosa
        ).toBeNull();
      }
    );

    it(
      'identifica Supabase solo después de cargar nodos y conexiones',
      async () => {
        respuestaSupabase.nodos.data = [
          {
            id:
              'entrada-nivel-4',
            nombre:
              'Entrada',
            x: 0,
            y: 0,
            tipo:
              'entrada',
            nivel: 4,
            sector:
              'Acceso principal',
            accesible: true,
            restringido: false,
            activo: true
          },
          {
            id:
              'recepcion-resort-nivel-4',
            nombre:
              'Recepción Resort',
            x: 2,
            y: 2,
            tipo:
              'recepcion',
            nivel: 4,
            sector:
              'Recepciones',
            accesible: true,
            restringido: false,
            activo: true
          }
        ];

        respuestaSupabase
          .conexiones.data = [
            {
              origen_id:
                'entrada-nivel-4',
              destino_id:
                'recepcion-resort-nivel-4',
              distancia: 6.751,
              tipo:
                'pasillo',
              accesible: true,
              restringida: false,
              habilitada: true
            }
          ];

        const resultado =
          await servicio
            .cargarMapaDesdeSupabase();

        expect(resultado)
          .toBe(true);
        expect(servicio.obtenerNodosNavegables().map(nodo => nodo.id))
          .toContain('salon-costamar-nivel-5');
        expect(servicio.obtenerConexionesPorNodo('lobby-nivel-4'))
          .toContainEqual(expect.objectContaining({
            origen: 'lobby-nivel-4',
            destino: 'acceso-costamar-nivel-4',
            distancia: null
          }));

        const estado =
          servicio
            .obtenerEstadoCarga();

        expect(
          estado.origenActivo
        ).toBe('supabase');

        expect(
          estado.ultimoIntentoExitoso
        ).toBe(true);

        expect(
          estado.ultimaComprobacion
        ).not.toBeNull();

        expect(
          estado.ultimaCargaExitosa
        ).toBe(
          estado.ultimaComprobacion
        );
      }
    );
  }
);
