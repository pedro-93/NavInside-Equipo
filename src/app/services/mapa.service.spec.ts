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

const respuestaSupabase = vi.hoisted(
  () => ({
    mapa: {
      data: {
        id: 'hippocampus-resort'
      },
      error: null
    },
    nodos: {
      data: [] as object[],
      error: null
    },
    conexiones: {
      data: [] as object[],
      error: null
    }
  })
);

vi.mock(
  '@supabase/supabase-js',
  () => ({
    createClient: vi.fn(
      () => {
        const escenario = {
          mapa: {
            data: {
              ...respuestaSupabase.mapa.data
            },
            error:
              respuestaSupabase.mapa.error
          },
          nodos: {
            data: [
              ...respuestaSupabase.nodos.data
            ],
            error:
              respuestaSupabase.nodos.error
          },
          conexiones: {
            data: [
              ...respuestaSupabase
                .conexiones.data
            ],
            error:
              respuestaSupabase
                .conexiones.error
          }
        };

        return {
          from: vi.fn(
            (tabla: string) => {
              if (tabla === 'mapas') {
                return {
                  select: vi.fn(
                    () => ({
                      eq: vi.fn(
                        () => ({
                          maybeSingle:
                            vi.fn()
                              .mockResolvedValue(
                                escenario.mapa
                              )
                        })
                      )
                    })
                  )
                };
              }

              if (tabla === 'nodos') {
                return {
                  select: vi.fn(
                    () => ({
                      eq: vi.fn(
                        () => ({
                          eq: vi.fn(
                            () => ({
                              order:
                                vi.fn()
                                  .mockResolvedValue(
                                    escenario.nodos
                                  )
                            })
                          )
                        })
                      )
                    })
                  )
                };
              }

              return {
                select: vi.fn(
                  () => ({
                    eq: vi.fn(
                      () => ({
                        order:
                          vi.fn()
                            .mockResolvedValue(
                              escenario
                                .conexiones
                            )
                      })
                    )
                  })
                )
              };
            }
          )
        };
      }
    )
  })
);

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

      servicio =
        new MapaService();
    });

    (() => {
      vi.restoreAllMocks();
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
            restringido: false
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
            restringido: false
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

        servicio =
          new MapaService();

        const resultado =
          await servicio
            .cargarMapaDesdeSupabase();

        expect(resultado)
          .toBe(true);

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
