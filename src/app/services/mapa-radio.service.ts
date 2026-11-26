import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HUELLAS_WIFI } from '../data/referencias-wifi.data';
import { MapaService } from './mapa.service';
import {
  MapaRadio,
  mapaRadioValido,
  MuestraRadio,
  muestrasDesdeHuellas,
  muestraValida
} from './localizacion-wifi';

@Injectable({ providedIn: 'root' })
export class MapaRadioService {
  private readonly mapa = inject(MapaService);
  private readonly clave = 'navinside.mapa-radio.v1';
  private readonly maximoLocal = 30000;

  private incluidas: MuestraRadio[] = [];
  private locales: MuestraRadio[] = [];
  private huellas: MuestraRadio[] | null = null;
  private cargaIncluidas: Promise<void> | null = null;

  readonly version$ = new BehaviorSubject(0);

  constructor() {
    try {
      const datos: unknown = JSON.parse(localStorage.getItem(this.clave) ?? 'null');
      if (mapaRadioValido(datos)) this.locales = datos.muestras;
    } catch {
      this.locales = [];
    }
  }

  cargarIncluidas(): Promise<void> {
    this.cargaIncluidas ??= (async () => {
      try {
        const respuesta = await fetch('assets/mapa-radio/mapa-radio.json', { cache: 'no-cache' });
        const datos: unknown = respuesta.ok ? await respuesta.json() : null;
        if (mapaRadioValido(datos)) {
          this.incluidas = datos.muestras;
          this.version$.next(this.version$.value + 1);
        }
      } catch {
        this.incluidas = [];
      }
    })();
    return this.cargaIncluidas;
  }

  muestras(nivel: number): MuestraRadio[] {
    this.huellas ??= muestrasDesdeHuellas(
      HUELLAS_WIFI,
      id => this.mapa.obtenerNodoPorId(id)?.nivel ?? null
    );
    return [...this.incluidas, ...this.locales, ...this.huellas].filter(m => m.nivel === nivel);
  }

  resumen(nivel: number): { incluidas: number; locales: number; huellas: number; tramos: number } {
    const enNivel = (lista: MuestraRadio[]) => lista.filter(m => m.nivel === nivel);
    const tramos = new Set(
      [...enNivel(this.incluidas), ...enNivel(this.locales)]
        .map(m => [m.origenId, m.destinoId].sort().join('→'))
    );
    this.huellas ??= muestrasDesdeHuellas(HUELLAS_WIFI, id => this.mapa.obtenerNodoPorId(id)?.nivel ?? null);
    return {
      incluidas: enNivel(this.incluidas).length,
      locales: enNivel(this.locales).length,
      huellas: enNivel(this.huellas).length,
      tramos: tramos.size
    };
  }

  agregar(muestras: readonly MuestraRadio[]): boolean {
    const validas = muestras.filter(muestraValida);
    if (!validas.length) return false;
    const siguientes = [...this.locales, ...validas].slice(-this.maximoLocal);
    return this.guardar(siguientes);
  }

  borrarTramo(nivel: number, a: string, b: string): number {
    const antes = this.locales.length;
    const siguientes = this.locales.filter(m =>
      !(m.nivel === nivel && ((m.origenId === a && m.destinoId === b) || (m.origenId === b && m.destinoId === a)))
    );
    this.guardar(siguientes);
    return antes - siguientes.length;
  }

  borrarLocales(): void {
    this.guardar([]);
  }

  exportar(): string {
    const mapa: MapaRadio = {
      version: 1,
      actualizado: new Date().toISOString(),
      muestras: [...this.incluidas, ...this.locales]
    };
    return JSON.stringify(mapa);
  }

  importar(texto: string): number {
    let datos: unknown;
    try {
      datos = JSON.parse(texto);
    } catch {
      return 0;
    }
    if (!mapaRadioValido(datos)) return 0;
    return this.agregar(datos.muestras) ? datos.muestras.length : 0;
  }

  private guardar(muestras: MuestraRadio[]): boolean {
    try {
      const mapa: MapaRadio = { version: 1, actualizado: new Date().toISOString(), muestras };
      localStorage.setItem(this.clave, JSON.stringify(mapa));
      this.locales = muestras;
      this.version$.next(this.version$.value + 1);
      return true;
    } catch {
      return false;
    }
  }
}
