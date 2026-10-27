import {
  inject,
  Injectable,
  OnDestroy
} from '@angular/core';
import { Position } from '@capacitor/geolocation';
import {
  BehaviorSubject,
  Subject,
  Subscription
} from 'rxjs';
import {
  Conexion,
  Nodo
} from '../models/nodo.model';
import {
  CandidatoWifi,
  PosicionamientoApoyoService
} from './posicionamiento-apoyo.service';
import {
  GeorreferenciaService,
  PosicionEnPlano,
  posicionPlano
} from './georreferencia.service';
import {
  SensoresNavegacionService
} from './sensores-navegacion.service';

export interface EstadoNavegacionAutomatica {
  activa: boolean;
  posicion: PosicionEnPlano | null;
  estado:
    'inactiva' |
    'buscando' |
    'sin-calibracion-gps' |
    'gps-impreciso' |
    'gps' |
    'wifi' |
    'desvio';
}

export type CorreccionAutomatica =
  {
    tipo: 'nodo';
    nodoId: string;
    fuente: 'wifi' | 'gps';
  } |
  {
    tipo: 'tramo';
    indice: number;
    fraccion: number;
  } |
  {
    tipo: 'desvio';
  };

// No autorizar una corrección con un SSID,
// una captura ambigua o un sector compartido.
export function nodoWifiConfiable(
  candidatos: readonly CandidatoWifi[]
): string | null {
  const ordenados = [...candidatos].sort(
    (a, b) =>
      a.diferenciaDbm - b.diferenciaDbm
  );

  const mejor = ordenados[0];

  if (
    !mejor ||
    mejor.huella.nodoIds.length !== 1 ||
    mejor.coincidencias < 3 ||
    mejor.coincidenciasBssid < 2 ||
    mejor.diferenciaDbm > 6
  ) {
    return null;
  }

  const id =
    mejor.huella.nodoIds[0];

  const rival = ordenados.find(
    c =>
      c.huella.nodoIds.length !== 1 ||
      c.huella.nodoIds[0] !== id
  );

  return (
    rival &&
    rival.diferenciaDbm -
      mejor.diferenciaDbm < 5
  )
    ? null
    : id;
}

@Injectable({ providedIn: 'root' })
export class NavegacionAutomaticaService
  implements OnDestroy {
  private readonly apoyo =
    inject(PosicionamientoApoyoService);

  private readonly sensores =
    inject(SensoresNavegacionService);

  private readonly geografia =
    inject(GeorreferenciaService);

  private readonly suscripciones =
    new Subscription();

  private readonly cambios =
    new Subject<CorreccionAutomatica>();

  private readonly estadoInterno =
    new BehaviorSubject<EstadoNavegacionAutomatica>({
      activa: false,
      posicion: null,
      estado: 'inactiva'
    });

  readonly estado$ =
    this.estadoInterno.asObservable();

  readonly correccion$ =
    this.cambios.asObservable();

  private ruta: Nodo[] = [];
  private nodos: Nodo[] = [];
  private conexiones: Conexion[] = [];
  private nivel = 0;

  private temporizador:
    ReturnType<typeof setInterval> | null = null;

  private ultimoEscaneo = 0;
  private ultimoWifi = 0;
  private nodoWifi: string | null = null;
  private repeticionesWifi = 0;
  private claveGps = '';
  private repeticionesGps = 0;
  private ultimoGps = 0;
  private ultimaCorreccionNodo = '';
  private instanteCorreccionNodo = 0;

  private readonly alOcultar = (): void => {
    if (document.hidden) {
      this.detener();
    }
  };

  constructor() {
    this.suscripciones.add(
      this.apoyo.muestrasWifi$.subscribe(
        muestra => {
          if (
            !this.estadoInterno.value.activa
          ) {
            return;
          }

          const id =
            nodoWifiConfiable(
              muestra.candidatos
            );

          const nodo = this.nodos.find(
            n =>
              n.id === id &&
              !n.restringido &&
              n.nivel === this.nivel
          );

          if (
            !nodo ||
            muestra.timestamp <=
              this.ultimoWifi ||
            Date.now() -
              muestra.timestamp > 10000 ||
            muestra.timestamp >
              Date.now() + 1000
          ) {
            this.nodoWifi = null;
            this.repeticionesWifi = 0;
            return;
          }

          // Dos escaneos independientes, separados
          // por el límite del módulo Android.
          this.repeticionesWifi =
            id === this.nodoWifi &&
            muestra.timestamp -
              this.ultimoWifi >= 30000 &&
            muestra.timestamp -
              this.ultimoWifi <= 90000
              ? this.repeticionesWifi + 1
              : 1;

          this.nodoWifi = id;
          this.ultimoWifi =
            muestra.timestamp;

          if (
            this.repeticionesWifi >= 2
          ) {
            this.actualizar({
              estado: 'wifi'
            });

            this.emitirNodo(
              nodo.id,
              'wifi'
            );
          }
        }
      )
    );

    this.suscripciones.add(
      this.sensores.posicionGps$.subscribe(
        p => this.procesarGps(p)
      )
    );

    this.suscripciones.add(
      this.sensores.estado$.subscribe(
        e => {
          if (
            !e.iniciado &&
            this.estadoInterno.value.activa
          ) {
            this.detener();
          }
        }
      )
    );
  }

  configurar(
    ruta: readonly Nodo[],
    nodos: readonly Nodo[],
    conexiones: readonly Conexion[],
    nivel: number
  ): void {
    this.ruta = ruta.map(
      n => ({ ...n })
    );

    this.nodos = nodos.map(
      n => ({ ...n })
    );

    this.conexiones = conexiones.map(
      c => ({ ...c })
    );

    if (this.nivel !== nivel) {
      this.nivel = nivel;
      this.repeticionesGps = 0;
      this.repeticionesWifi = 0;
      this.nodoWifi = null;

      this.actualizar({
        posicion: null
      });
    }
  }

  iniciar(): boolean {
    if (
      !this.sensores
        .obtenerEstado().iniciado ||
      this.ruta.length < 2
    ) {
      return false;
    }

    if (
      this.estadoInterno.value.activa
    ) {
      return true;
    }

    this.repeticionesGps = 0;
    this.repeticionesWifi = 0;
    this.ultimoGps = 0;
    this.ultimoWifi = 0;
    this.ultimaCorreccionNodo = '';

    this.actualizar({
      activa: true,
      posicion: null,
      estado: 'buscando'
    });

    document.addEventListener(
      'visibilitychange',
      this.alOcultar
    );

    this.escanear();

    this.temporizador = setInterval(
      () => {
        const p =
          this.estadoInterno.value.posicion;

        if (
          p &&
          Date.now() -
            p.timestamp > 10000
        ) {
          this.actualizar({
            posicion: null,
            estado: 'buscando'
          });
        }

        this.escanear();
      },
      1000
    );

    return true;
  }

  detener(): void {
    if (
      this.temporizador !== null
    ) {
      clearInterval(
        this.temporizador
      );
    }

    this.temporizador = null;

    document.removeEventListener(
      'visibilitychange',
      this.alOcultar
    );

    this.actualizar({
      activa: false,
      posicion: null,
      estado: 'inactiva'
    });

    this.repeticionesGps = 0;
    this.repeticionesWifi = 0;
  }

  ngOnDestroy(): void {
    this.detener();

    this.suscripciones.unsubscribe();
    this.cambios.complete();
    this.estadoInterno.complete();
  }

  private escanear(): void {
    if (
      this.apoyo.wifiDisponible &&
      Date.now() -
        this.ultimoEscaneo >= 40000
    ) {
      this.ultimoEscaneo =
        Date.now();

      void this.apoyo.buscarWifi();
    }
  }

  private procesarGps(
    p: Position
  ): void {
    if (
      !this.estadoInterno.value.activa
    ) {
      return;
    }

    const modelo =
      this.geografia.crearModelo(
        this.nivel,
        this.apoyo.obtenerReferenciasGps(),
        this.nodos
      );

    if (!modelo) {
      this.repeticionesGps = 0;

      this.actualizar({
        posicion: null,
        estado: 'sin-calibracion-gps'
      });

      return;
    }

    const punto =
      this.geografia.proyectar(
        modelo,
        p.coords,
        p.coords.accuracy,
        p.timestamp
      );

    if (
      !punto ||
      punto.incertidumbreMetros > 5 ||
      p.timestamp <= this.ultimoGps
    ) {
      this.repeticionesGps = 0;

      this.actualizar({
        posicion: null,
        estado: 'gps-impreciso'
      });

      return;
    }

    const separacionTemporal =
      p.timestamp - this.ultimoGps;

    if (
      separacionTemporal < 750
    ) {
      return;
    }

    this.ultimoGps = p.timestamp;

    this.actualizar({
      posicion: punto,
      estado: 'gps'
    });

    const proyeccion =
      this.geografia.proyectarRuta(
        modelo,
        punto,
        this.ruta,
        this.conexiones
      );

    if (
      !proyeccion ||
      proyeccion.ambigua
    ) {
      this.repeticionesGps = 0;
      return;
    }

    if (
      proyeccion.separacionMetros <= 2 &&
      punto.incertidumbreMetros <= 3
    ) {
      const clave =
        `tramo:${proyeccion.indice}`;

      this.confirmarGps(
        clave,
        separacionTemporal
      );

      if (
        this.repeticionesGps >= 3
      ) {
        this.cambios.next({
          tipo: 'tramo',
          indice: proyeccion.indice,
          fraccion: proyeccion.fraccion
        });
      }

      return;
    }

    if (
      proyeccion.separacionMetros <=
        Math.max(
          4,
          punto.incertidumbreMetros * 2
        )
    ) {
      this.repeticionesGps = 0;
      return;
    }

    this.confirmarGps(
      'desvio',
      separacionTemporal
    );

    if (
      this.repeticionesGps < 3
    ) {
      return;
    }

    this.actualizar({
      estado: 'desvio'
    });

    this.cambios.next({
      tipo: 'desvio'
    });

    const fisica =
      this.geografia.puntoEnMetros(
        modelo,
        punto
      )!;

    const cercanos = this.nodos
      .flatMap(n => {
        const visual =
          n.nivel === this.nivel &&
          !n.restringido
            ? posicionPlano(n)
            : null;

        const m = visual
          ? this.geografia.puntoEnMetros(
              modelo,
              visual
            )
          : null;

        return m
          ? [
              {
                id: n.id,
                distancia: Math.hypot(
                  m.x - fisica.x,
                  m.y - fisica.y
                )
              }
            ]
          : [];
      })
      .sort(
        (a, b) =>
          a.distancia - b.distancia
      );

    if (
      cercanos[0] &&
      cercanos[0].distancia +
        punto.incertidumbreMetros <= 4 &&
      (
        !cercanos[1] ||
        cercanos[1].distancia -
          cercanos[0].distancia >
          punto.incertidumbreMetros * 2
      )
    ) {
      this.emitirNodo(
        cercanos[0].id,
        'gps'
      );
    }
  }

  private confirmarGps(
    clave: string,
    separacionTemporal: number
  ): void {
    this.repeticionesGps =
      clave === this.claveGps &&
      separacionTemporal <= 5000
        ? this.repeticionesGps + 1
        : 1;

    this.claveGps = clave;
  }

  private emitirNodo(
    nodoId: string,
    fuente: 'wifi' | 'gps'
  ): void {
    if (
      this.ultimaCorreccionNodo ===
        nodoId &&
      Date.now() -
        this.instanteCorreccionNodo < 90000
    ) {
      return;
    }

    this.ultimaCorreccionNodo =
      nodoId;

    this.instanteCorreccionNodo =
      Date.now();

    this.cambios.next({
      tipo: 'nodo',
      nodoId,
      fuente
    });
  }

  private actualizar(
    cambios:
      Partial<EstadoNavegacionAutomatica>
  ): void {
    this.estadoInterno.next({
      ...this.estadoInterno.value,
      ...cambios
    });
  }
}