import {
  inject,
  Injectable
} from '@angular/core';

import {
  DatosQrUbicacion
} from '../models/qr-ubicacion.model';

import {
  Nodo
} from '../models/nodo.model';

import {
  MapaService
} from './mapa.service';

@Injectable({
  providedIn: 'root'
})
export class QrService {
  private readonly mapaService =
    inject(MapaService);

  procesarCodigo(
    contenido: string
  ): Nodo | null {
    const contenidoNormalizado =
      contenido.trim();

    if (!contenidoNormalizado) {
      return null;
    }

    const nodoIdSimple =
      this.extraerNodoIdSimple(
        contenidoNormalizado
      );

    if (nodoIdSimple) {
      return this.obtenerNodoValido(
        nodoIdSimple
      );
    }

    try {
      const datos: unknown =
        JSON.parse(
          contenidoNormalizado
        );

      if (
        !this.esDatosQrUbicacion(
          datos
        )
      ) {
        return null;
      }

      return this.obtenerNodoValido(
        datos.nodoId
      );
    } catch {
      return null;
    }
  }

  private extraerNodoIdSimple(
    contenido: string
  ): string | null {
    const prefijo =
      'NAVINSIDE:';

    if (
      !contenido.startsWith(
        prefijo
      )
    ) {
      return null;
    }

    const nodoId =
      contenido
        .slice(
          prefijo.length
        )
        .trim();

    return nodoId || null;
  }

  private esDatosQrUbicacion(
    datos: unknown
  ): datos is DatosQrUbicacion {
    if (
      typeof datos !== 'object' ||
      datos === null ||
      Array.isArray(datos)
    ) {
      return false;
    }

    const candidato =
      datos as Partial<
        DatosQrUbicacion
      >;

    return (
      candidato.sistema ===
        'navinside' &&
      candidato.version === 1 &&
      typeof candidato.nodoId ===
        'string' &&
      candidato.nodoId.trim()
        .length > 0
    );
  }

  private obtenerNodoValido(
    nodoId: string
  ): Nodo | null {
    const idNormalizado =
      nodoId.trim();

    if (!idNormalizado) {
      return null;
    }

    const nodo =
      this.mapaService
        .obtenerNodoPorId(
          idNormalizado
        );

    if (
      !nodo ||
      nodo.restringido === true
    ) {
      return null;
    }

    return nodo;
  }
}