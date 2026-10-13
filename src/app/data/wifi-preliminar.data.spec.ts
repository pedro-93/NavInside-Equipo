import {
  describe,
  expect,
  it
} from 'vitest';

import {
  CONFIGURACION_WIFI_PRELIMINAR,
  PUNTOS_WIFI_PRELIMINARES,
  SECTORES_COBERTURA_LIMITADA,
  SSIDS_HIPPOCAMPUS
} from './wifi-preliminar.data';

describe(
  'Inventario Wi-Fi preliminar',
  () => {
    it(
      'registra las redes informadas',
      () => {
        expect(
          SSIDS_HIPPOCAMPUS
        ).toEqual([
          'Administracion',
          'hippocampus'
        ]);
      }
    );

    it(
      'registra los puntos de cobertura informados',
      () => {
        expect(
          PUNTOS_WIFI_PRELIMINARES
            .length
        ).toBe(16);

        expect(
          PUNTOS_WIFI_PRELIMINARES
            .some(
              punto =>
                punto.id ===
                'wifi-hall-piso-1'
            )
        ).toBe(true);

        expect(
          PUNTOS_WIFI_PRELIMINARES
            .some(
              punto =>
                punto.id ===
                'wifi-salon-altamar'
            )
        ).toBe(true);
      }
    );

    it(
      'mantiene los puntos pendientes de validación',
      () => {
        expect(
          PUNTOS_WIFI_PRELIMINARES
            .every(
              punto =>
                punto.estado ===
                'pendiente_validacion'
            )
        ).toBe(true);

        expect(
          PUNTOS_WIFI_PRELIMINARES
            .every(
              punto =>
                punto.bssid === null
            )
        ).toBe(true);

        expect(
          PUNTOS_WIFI_PRELIMINARES
            .every(
              punto =>
                punto.rssiReferencia ===
                null
            )
        ).toBe(true);
      }
    );

    it(
      'no habilita posicionamiento Wi-Fi',
      () => {
        expect(
          CONFIGURACION_WIFI_PRELIMINAR
            .usoPosicionamientoActivo
        ).toBe(false);

        expect(
          CONFIGURACION_WIFI_PRELIMINAR
            .requiereBssid
        ).toBe(true);

        expect(
          CONFIGURACION_WIFI_PRELIMINAR
            .requiereMedicionesRssi
        ).toBe(true);
      }
    );

    it(
      'registra los sectores con cobertura limitada',
      () => {
        expect(
          SECTORES_COBERTURA_LIMITADA
        ).toContain(
          'Oficinas de administración'
        );

        expect(
          SECTORES_COBERTURA_LIMITADA
        ).toContain(
          'Pasillos del edificio 4'
        );
      }
    );

    it(
      'mantiene identificadores únicos',
      () => {
        const identificadores =
          PUNTOS_WIFI_PRELIMINARES
            .map(
              punto =>
                punto.id
            );

        expect(
          new Set(
            identificadores
          ).size
        ).toBe(
          identificadores.length
        );
      }
    );
  }
);