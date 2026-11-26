import {
  describe,
  expect,
  it
} from 'vitest';

import {
  TestBed
} from '@angular/core/testing';

import {
  QrService
} from './qr.service';

describe('QrService', () => {
  const service =
    TestBed.inject(QrService);

  it(
    'reconoce un QR JSON válido de Hippocampus',
    () => {
      const resultado =
        service.procesarCodigo(
          JSON.stringify({
            sistema:
              'navinside',
            version: 1,
            nodoId:
              'entrada-nivel-4'
          })
        );

      expect(resultado?.id)
        .toBe(
          'entrada-nivel-4'
        );

      expect(resultado?.nombre)
        .toBe('Entrada');
    }
  );

  it(
    'reconoce el formato simple guardado en Supabase',
    () => {
      const resultado =
        service.procesarCodigo(
          'NAVINSIDE:entrada-nivel-4'
        );

      expect(resultado?.id)
        .toBe(
          'entrada-nivel-4'
        );
    }
  );

  it(
    'acepta espacios exteriores en el contenido',
    () => {
      const resultado =
        service.procesarCodigo(
          '  NAVINSIDE:entrada-nivel-4  '
        );

      expect(resultado?.id)
        .toBe(
          'entrada-nivel-4'
        );
    }
  );

  it(
    'acepta espacios alrededor del identificador',
    () => {
      const resultado =
        service.procesarCodigo(
          JSON.stringify({
            sistema:
              'navinside',
            version: 1,
            nodoId:
              '  entrada-nivel-4  '
          })
        );

      expect(resultado?.id)
        .toBe(
          'entrada-nivel-4'
        );
    }
  );

  it(
    'rechaza un nodo inexistente',
    () => {
      const resultado =
        service.procesarCodigo(
          JSON.stringify({
            sistema:
              'navinside',
            version: 1,
            nodoId:
              'nodo-inexistente'
          })
        );

      expect(resultado)
        .toBeNull();
    }
  );

  it(
    'rechaza un sistema desconocido',
    () => {
      const resultado =
        service.procesarCodigo(
          JSON.stringify({
            sistema:
              'otro-sistema',
            version: 1,
            nodoId:
              'entrada-nivel-4'
          })
        );

      expect(resultado)
        .toBeNull();
    }
  );

  it(
    'rechaza una versión QR incompatible',
    () => {
      const resultado =
        service.procesarCodigo(
          JSON.stringify({
            sistema:
              'navinside',
            version: 2,
            nodoId:
              'entrada-nivel-4'
          })
        );

      expect(resultado)
        .toBeNull();
    }
  );

  it(
    'rechaza un identificador vacío',
    () => {
      const resultado =
        service.procesarCodigo(
          JSON.stringify({
            sistema:
              'navinside',
            version: 1,
            nodoId: '   '
          })
        );

      expect(resultado)
        .toBeNull();
    }
  );

  it(
    'rechaza el formato simple sin identificador',
    () => {
      expect(
        service.procesarCodigo(
          'NAVINSIDE:   '
        )
      ).toBeNull();
    }
  );

  it(
    'rechaza objetos incompletos',
    () => {
      expect(
        service.procesarCodigo(
          JSON.stringify({
            sistema:
              'navinside',
            version: 1
          })
        )
      ).toBeNull();
    }
  );

  it(
    'rechaza arreglos JSON',
    () => {
      expect(
        service.procesarCodigo(
          JSON.stringify([
            'entrada-nivel-4'
          ])
        )
      ).toBeNull();
    }
  );

  it(
    'rechaza valores JSON primitivos',
    () => {
      expect(
        service.procesarCodigo(
          JSON.stringify(
            'entrada-nivel-4'
          )
        )
      ).toBeNull();

      expect(
        service.procesarCodigo(
          'null'
        )
      ).toBeNull();
    }
  );

  it(
    'rechaza contenido vacío o inválido',
    () => {
      expect(
        service.procesarCodigo('')
      ).toBeNull();

      expect(
        service.procesarCodigo(
          '   '
        )
      ).toBeNull();

      expect(
        service.procesarCodigo(
          'contenido-inválido'
        )
      ).toBeNull();
    }
  );
});