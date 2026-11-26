import { Injectable, OnDestroy } from '@angular/core';
import {
  Capacitor,
  PluginListenerHandle,
  registerPlugin
} from '@capacitor/core';
import { Geolocation, Position } from '@capacitor/geolocation';
import { AccelListenerEvent, Motion } from '@capacitor/motion';
import { BehaviorSubject, Subject } from 'rxjs';

interface RumboNativo {
  start(options: { session: string }): Promise<void>;
  stop(options: { session: string }): Promise<void>;
  addListener(
    event: 'heading',
    callback: (reading: {
      degrees: number;
      session: string;
    }) => void
  ): Promise<PluginListenerHandle>;
}

const rumboNativo =
  registerPlugin<RumboNativo>('NavInsideHeading');

export type EstadoSensorNavegacion =
  'inactivo' |
  'esperando' |
  'activo' |
  'sin-permiso' |
  'error';

export interface EstadoSensoresNavegacion {
  iniciado: boolean;
  gps: EstadoSensorNavegacion;
  movimiento: EstadoSensorNavegacion;
  orientacion: EstadoSensorNavegacion;
  errorGps: string | null;
  errorMovimiento: string | null;
}

export interface MuestraMovimientoNavegacion {
  instanteMs: number;
  magnitudConGravedad: number | null;
  magnitudSinGravedad: number | null;
}

@Injectable({ providedIn: 'root' })
export class SensoresNavegacionService implements OnDestroy {
  private readonly estadoInterno =
    new BehaviorSubject<EstadoSensoresNavegacion>(
      this.crearEstadoInicial()
    );

  private readonly posiciones = new Subject<Position>();

  private readonly movimientos =
    new Subject<MuestraMovimientoNavegacion>();

  private readonly rumbos = new Subject<number>();

  private sesion = 0;
  private gpsId: string | null = null;
  private escuchaMovimiento: PluginListenerHandle | null = null;
  private ultimoTiempoGps = -1;
  private escuchaRumboNativo: PluginListenerHandle | null = null;
  private sesionRumboNativo: string | null = null;
  private destruido = false;

  readonly estado$ = this.estadoInterno.asObservable();
  readonly posicionGps$ = this.posiciones.asObservable();
  readonly movimiento$ = this.movimientos.asObservable();
  readonly rumbo$ = this.rumbos.asObservable();

  private readonly alOcultar = (): void => {
    if (document.hidden) {
      void this.detener();
    }
  };

  private readonly alOrientar =
    (evento: DeviceOrientationEvent): void => {
      if (!this.estadoInterno.value.iniciado) {
        return;
      }

      const extendido = evento as DeviceOrientationEvent & {
        webkitCompassHeading?: number;
        webkitCompassAccuracy?: number;
      };

      let rumbo: number;

      if (
        Number.isFinite(extendido.webkitCompassHeading) &&
        (
          extendido.webkitCompassAccuracy === undefined ||
          extendido.webkitCompassAccuracy >= 0
        )
      ) {
        rumbo = extendido.webkitCompassHeading!;
      } else if (
        (
          evento.absolute ||
          evento.type === 'deviceorientationabsolute'
        ) &&
        typeof evento.alpha === 'number' &&
        Number.isFinite(evento.alpha)
      ) {
        rumbo = 360 - evento.alpha;
      } else {
        return;
      }

      const giroPantalla =
        window.screen?.orientation?.angle ?? 0;

      this.actualizar({ orientacion: 'activo' });

      this.rumbos.next(
        ((rumbo + giroPantalla) % 360 + 360) % 360
      );
    };

  obtenerEstado(): EstadoSensoresNavegacion {
    return { ...this.estadoInterno.value };
  }

  async iniciar(): Promise<void> {
    if (
      this.destruido ||
      this.estadoInterno.value.iniciado
    ) {
      return;
    }

    if (
      typeof window === 'undefined' ||
      !window.isSecureContext
    ) {
      this.actualizar({
        gps: 'error',
        movimiento: 'error',
        orientacion: 'error',
        errorGps:
          'La ubicación requiere HTTPS, localhost o la aplicación Android.',
        errorMovimiento:
          'Los sensores requieren un contexto seguro.'
      });

      return;
    }

    const sesion = ++this.sesion;

    this.ultimoTiempoGps = -1;

    this.estadoInterno.next({
      ...this.crearEstadoInicial(),
      iniciado: true,
      gps: 'esperando',
      movimiento: 'esperando',
      orientacion: 'esperando'
    });

    document.addEventListener(
      'visibilitychange',
      this.alOcultar
    );

    await Promise.all([
      this.iniciarMovimiento(sesion),
      this.iniciarGps(sesion)
    ]);
  }

  async detener(): Promise<void> {
    ++this.sesion;

    const gpsId = this.gpsId;
    const escucha = this.escuchaMovimiento;
    const rumbo = this.escuchaRumboNativo;
    const sesionRumbo = this.sesionRumboNativo;

    this.escuchaRumboNativo = null;
    this.sesionRumboNativo = null;
    this.gpsId = null;
    this.escuchaMovimiento = null;

    if (typeof window !== 'undefined') {
      window.removeEventListener(
        'deviceorientationabsolute',
        this.alOrientar,
        true
      );

      window.removeEventListener(
        'deviceorientation',
        this.alOrientar,
        true
      );

      document.removeEventListener(
        'visibilitychange',
        this.alOcultar
      );
    }

    this.estadoInterno.next(
      this.crearEstadoInicial()
    );

    await Promise.allSettled([
      ...(
        gpsId !== null
          ? [Geolocation.clearWatch({ id: gpsId })]
          : []
      ),
      ...(escucha ? [escucha.remove()] : []),
      ...(rumbo ? [rumbo.remove()] : []),
      ...(
        sesionRumbo !== null
          ? [
              rumboNativo.stop({
                session: sesionRumbo
              })
            ]
          : []
      )
    ]);
  }

  ngOnDestroy(): void {
    this.destruido = true;

    void this.detener();

    this.estadoInterno.complete();
    this.posiciones.complete();
    this.movimientos.complete();
    this.rumbos.complete();
  }

  private async iniciarGps(
    sesion: number
  ): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        let permisos =
          await Geolocation.checkPermissions();

        if (!this.vigente(sesion)) {
          return;
        }

        if (permisos.location !== 'granted') {
          permisos =
            await Geolocation.requestPermissions({
              permissions: ['location']
            });
        }

        if (!this.vigente(sesion)) {
          return;
        }

        if (
          permisos.location !== 'granted' &&
          permisos.coarseLocation !== 'granted'
        ) {
          this.actualizar({
            gps: 'sin-permiso',
            errorGps: 'Ubicación sin permiso.'
          });

          return;
        }
      }

      const id = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 1000,
          minimumUpdateInterval: 1000
        },
        (posicion, error) => {
          if (!this.vigente(sesion)) {
            return;
          }

          if (error) {
            this.registrarErrorGps(error);
            return;
          }

          if (
            !posicion ||
            !this.posicionValida(posicion) ||
            posicion.timestamp <= this.ultimoTiempoGps ||
            Date.now() - posicion.timestamp > 15000 ||
            posicion.timestamp > Date.now() + 5000
          ) {
            return;
          }

          this.ultimoTiempoGps = posicion.timestamp;

          this.actualizar({
            gps: 'activo',
            errorGps: null
          });

          this.posiciones.next(posicion);
        }
      );

      if (this.vigente(sesion)) {
        this.gpsId = id;
      } else {
        await Geolocation.clearWatch({ id });
      }
    } catch (error) {
      if (this.vigente(sesion)) {
        this.registrarErrorGps(error);
      }
    }
  }

  private async iniciarMovimiento(
    sesion: number
  ): Promise<void> {
    try {
      type ConstructorConPermiso = {
        requestPermission?: () => Promise<string>;
      };

      const constructores: ConstructorConPermiso[] = [
        window.DeviceMotionEvent as ConstructorConPermiso,
        window.DeviceOrientationEvent as ConstructorConPermiso
      ];

      const permisos = await Promise.all(
        constructores.map(constructor =>
          constructor?.requestPermission
            ? constructor.requestPermission()
            : 'granted'
        )
      );

      if (!this.vigente(sesion)) {
        return;
      }

      if (
        Capacitor.getPlatform() === 'android' &&
        Capacitor.isPluginAvailable('NavInsideHeading')
      ) {
        await this.iniciarRumboNativo(sesion);
      } else if (permisos[1] === 'granted') {
        window.addEventListener(
          'deviceorientationabsolute',
          this.alOrientar,
          true
        );

        window.addEventListener(
          'deviceorientation',
          this.alOrientar,
          true
        );
      } else {
        this.actualizar({
          orientacion: 'sin-permiso'
        });
      }

      if (!this.vigente(sesion)) {
        return;
      }

      if (permisos[0] !== 'granted') {
        this.actualizar({
          movimiento: 'sin-permiso'
        });

        return;
      }

      const escucha = await Motion.addListener(
        'accel',
        evento => {
          if (!this.vigente(sesion)) {
            return;
          }

          const conGravedad = this.magnitud(
            evento.accelerationIncludingGravity
          );

          const sinGravedad = this.magnitud(
            evento.acceleration
          );

          if (
            conGravedad === null &&
            sinGravedad === null
          ) {
            return;
          }

          this.actualizar({
            movimiento: 'activo',
            errorMovimiento: null
          });

          this.movimientos.next({
            instanteMs: performance.now(),
            magnitudConGravedad: conGravedad,
            magnitudSinGravedad: sinGravedad
          });
        }
      );

      if (this.vigente(sesion)) {
        this.escuchaMovimiento = escucha;
      } else {
        await escucha.remove();
      }
    } catch {
      if (this.vigente(sesion)) {
        this.actualizar({
          movimiento: 'error',
          errorMovimiento:
            'No se pudo iniciar el acceso a los sensores.'
        });
      }
    }
  }

  private async iniciarRumboNativo(
    sesion: number
  ): Promise<void> {
    const id = String(sesion);

    let escucha: PluginListenerHandle | null = null;

    try {
      escucha = await rumboNativo.addListener(
        'heading',
        lectura => {
          if (
            !this.vigente(sesion) ||
            lectura.session !== id ||
            !Number.isFinite(lectura.degrees)
          ) {
            return;
          }

          this.actualizar({
            orientacion: 'activo'
          });

          this.rumbos.next(
            ((lectura.degrees % 360) + 360) % 360
          );
        }
      );

      if (!this.vigente(sesion)) {
        await escucha.remove();
        return;
      }

      this.escuchaRumboNativo = escucha;
      this.sesionRumboNativo = id;

      await rumboNativo.start({
        session: id
      });

      if (!this.vigente(sesion)) {
        await rumboNativo.stop({
          session: id
        });
      }
    } catch {
      if (escucha) {
        await escucha.remove().catch(
          () => undefined
        );
      }

      if (this.vigente(sesion)) {
        this.escuchaRumboNativo = null;
        this.sesionRumboNativo = null;

        this.actualizar({
          orientacion: 'error'
        });
      }
    }
  }

  private magnitud(
    vector: AccelListenerEvent['acceleration'] | null
  ): number | null {
    if (
      !vector ||
      ![vector.x, vector.y, vector.z].every(
        valor =>
          typeof valor === 'number' &&
          Number.isFinite(valor)
      )
    ) {
      return null;
    }

    return Math.hypot(
      vector.x,
      vector.y,
      vector.z
    );
  }

  private posicionValida(
    posicion: Position
  ): boolean {
    const {
      latitude,
      longitude,
      accuracy
    } = posicion.coords;

    return (
      Number.isFinite(latitude) &&
      Math.abs(latitude) <= 90 &&
      Number.isFinite(longitude) &&
      Math.abs(longitude) <= 180 &&
      Number.isFinite(accuracy) &&
      accuracy >= 0 &&
      Number.isFinite(posicion.timestamp)
    );
  }

  private registrarErrorGps(
    error: unknown
  ): void {
    const codigo =
      typeof error === 'object' &&
      error !== null &&
      'code' in error
        ? String(error.code)
        : '';

    this.actualizar({
      gps:
        codigo === '1' ||
        codigo === 'OS-PLUG-GLOC-0003'
          ? 'sin-permiso'
          : 'error',
      errorGps:
        'No hay una lectura de ubicación disponible. Revisa el permiso y la ubicación del teléfono.'
    });
  }

  private vigente(
    sesion: number
  ): boolean {
    return (
      !this.destruido &&
      this.sesion === sesion &&
      this.estadoInterno.value.iniciado
    );
  }

  private actualizar(
    cambios: Partial<EstadoSensoresNavegacion>
  ): void {
    const estado = this.estadoInterno.value;

    if (
      Object.entries(cambios).some(
        ([clave, valor]) =>
          estado[
            clave as keyof EstadoSensoresNavegacion
          ] !== valor
      )
    ) {
      this.estadoInterno.next({
        ...estado,
        ...cambios
      });
    }
  }

  private crearEstadoInicial():
    EstadoSensoresNavegacion {
    return {
      iniciado: false,
      gps: 'inactivo',
      movimiento: 'inactivo',
      orientacion: 'inactivo',
      errorGps: null,
      errorMovimiento: null
    };
  }
}