import {
  inject,
  Injectable,
  OnDestroy
} from '@angular/core';
import {
  Capacitor,
  registerPlugin
} from '@capacitor/core';
import { Position } from '@capacitor/geolocation';
import {
  BehaviorSubject,
  Subject,
  Subscription
} from 'rxjs';
import {
  HUELLAS_WIFI,
  HuellaWifi
} from '../data/referencias-wifi.data';
import { MapaService } from './mapa.service';
import {
  SensoresNavegacionService
} from './sensores-navegacion.service';

export interface LecturaWifiActual {
  ssid: string;
  bssid: string;
  rssi: number;
  frequency: number;
  ageMs: number;
}

interface ResultadoWifi {
  networks: LecturaWifiActual[];
  timestamp: number;
}

interface WifiNativo {
  scan(): Promise<ResultadoWifi>;
}

const wifiNativo =
  registerPlugin<WifiNativo>('NavInsideWifi');

export interface CandidatoWifi {
  huella: HuellaWifi;
  coincidencias: number;
  coincidenciasBssid: number;
  diferenciaDbm: number;
}

export interface ReferenciaGpsPoi {
  nodoId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface EstadoPosicionamientoApoyo {
  buscandoWifi: boolean;
  lecturas: LecturaWifiActual[];
  candidatos: CandidatoWifi[];
  errorWifi: string | null;
}

export function compararHuellasWifi(
  lecturas: readonly LecturaWifiActual[],
  huellas: readonly HuellaWifi[] = HUELLAS_WIFI
): CandidatoWifi[] {
  const validas = lecturas.filter(
    item =>
      Number.isFinite(item.rssi) &&
      item.rssi >= -120 &&
      item.rssi <= 0 &&
      Number.isFinite(item.ageMs) &&
      item.ageMs >= 0 &&
      item.ageMs <= 30000 &&
      item.frequency >= 2400 &&
      item.frequency < 2500
  );

  const bssidValido =
    (id: string | null): boolean =>
      id !== null &&
      /^(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(id);

  return huellas
    .map(huella => {
      const usados = new Set<string>();
      const diferencias: number[] = [];
      let coincidenciasBssid = 0;

      for (const referencia of huella.lecturas) {
        if (
          referencia.usarParaComparar === false ||
          referencia.ssid === 'HiddenSSID'
        ) {
          continue;
        }

        const identidadExacta =
          bssidValido(referencia.bssid);

        const canal =
          /^\d+$/.test(referencia.canal)
            ? Number(referencia.canal)
            : null;

        const coincidencias = validas.filter(
          item => {
            const id =
              item.bssid.toLowerCase();

            if (usados.has(id)) {
              return false;
            }

            if (identidadExacta) {
              return id ===
                referencia.bssid!.toLowerCase();
            }

            const canalActual =
              item.frequency === 2484
                ? 14
                : (item.frequency - 2407) / 5;

            return (
              item.ssid.toLowerCase() ===
                referencia.ssid.toLowerCase() &&
              (
                canal === null ||
                canalActual === canal
              )
            );
          }
        );

        // Si varias antenas comparten SSID, no escoger
        // la intensidad más conveniente.
        if (coincidencias.length !== 1) {
          continue;
        }

        const lectura = coincidencias[0];

        usados.add(
          lectura.bssid.toLowerCase()
        );

        diferencias.push(
          Math.abs(
            lectura.rssi - referencia.rssi
          )
        );

        if (identidadExacta) {
          ++coincidenciasBssid;
        }
      }

      return {
        huella,
        coincidencias: diferencias.length,
        coincidenciasBssid,
        diferenciaDbm: diferencias.length
          ? diferencias.reduce(
              (a, b) => a + b,
              0
            ) / diferencias.length
          : Infinity
      };
    })
    .filter(
      item =>
        item.coincidencias >= 2 &&
        item.diferenciaDbm <= 15
    )
    .sort(
      (a, b) =>
        a.diferenciaDbm - b.diferenciaDbm ||
        b.coincidenciasBssid -
          a.coincidenciasBssid ||
        b.coincidencias - a.coincidencias
    )
    .slice(0, huellas.length);
}

export function distanciaGpsMetros(
  a: Pick<
    ReferenciaGpsPoi,
    'latitude' | 'longitude'
  >,
  b: Pick<
    ReferenciaGpsPoi,
    'latitude' | 'longitude'
  >
): number {
  const rad = Math.PI / 180;

  const dLat =
    (b.latitude - a.latitude) * rad;

  const dLon =
    (b.longitude - a.longitude) * rad;

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) *
      Math.cos(b.latitude * rad) *
      Math.sin(dLon / 2) ** 2;

  return 6371000 * 2 * Math.atan2(
    Math.sqrt(Math.min(1, h)),
    Math.sqrt(Math.max(0, 1 - h))
  );
}

@Injectable({ providedIn: 'root' })
export class PosicionamientoApoyoService
  implements OnDestroy {
  private readonly mapa =
    inject(MapaService);

  private readonly sensores =
    inject(SensoresNavegacionService);

  private readonly suscripcion: Subscription;

  private ultimaPosicion: Position | null = null;
  private referencias: ReferenciaGpsPoi[] = [];
  private destruido = false;
  private instanteWifi = 0;

  private readonly muestrasWifi = new Subject<{
    timestamp: number;
    candidatos: CandidatoWifi[];
  }>();

  readonly muestrasWifi$ =
    this.muestrasWifi.asObservable();

  private huellasLocales: HuellaWifi[] = [];

  private readonly claveWifi =
    'navinside.huellas-wifi-poi.v1';

  private readonly clave =
    'navinside.referencias-gps-poi.v1';

  private readonly estadoInterno =
    new BehaviorSubject<EstadoPosicionamientoApoyo>({
      buscandoWifi: false,
      lecturas: [],
      candidatos: [],
      errorWifi: null
    });

  readonly estado$ =
    this.estadoInterno.asObservable();

  constructor() {
    this.suscripcion =
      this.sensores.posicionGps$.subscribe(
        posicion => {
          this.ultimaPosicion = posicion;
        }
      );

    try {
      const datos: unknown = JSON.parse(
        localStorage.getItem(this.clave) ?? '[]'
      );

      if (Array.isArray(datos)) {
        this.referencias = datos
          .filter(
            item => this.referenciaValida(item)
          )
          .slice(0, 200);
      }
    } catch {
      this.referencias = [];
    }

    try {
      const datos: unknown = JSON.parse(
        localStorage.getItem(this.claveWifi) ?? '[]'
      );

      if (Array.isArray(datos)) {
        this.huellasLocales = datos
          .filter(
            (h): h is HuellaWifi =>
              this.huellaValida(h)
          )
          .slice(-100);
      }
    } catch {
      this.huellasLocales = [];
    }
  }

  get wifiDisponible(): boolean {
    return (
      Capacitor.getPlatform() === 'android' &&
      Capacitor.isPluginAvailable('NavInsideWifi')
    );
  }

  async buscarWifi(): Promise<void> {
    if (
      this.destruido ||
      this.estadoInterno.value.buscandoWifi
    ) {
      return;
    }

    if (!this.wifiDisponible) {
      this.estadoInterno.next({
        buscandoWifi: false,
        lecturas: [],
        candidatos: [],
        errorWifi: 'unavailable'
      });

      return;
    }

    this.estadoInterno.next({
      buscandoWifi: true,
      lecturas: [],
      candidatos: [],
      errorWifi: null
    });

    try {
      const resultado =
        await wifiNativo.scan();

      if (this.destruido) {
        return;
      }

      if (
        !Number.isFinite(resultado.timestamp) ||
        Date.now() - resultado.timestamp > 30000 ||
        resultado.timestamp > Date.now() + 5000 ||
        !Array.isArray(resultado.networks)
      ) {
        throw new Error('stale');
      }

      this.instanteWifi =
        resultado.timestamp;

      const lecturas = resultado.networks
        .filter(
          item =>
            typeof item.ssid === 'string' &&
            typeof item.bssid === 'string' &&
            /^(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$/i
              .test(item.bssid) &&
            Number.isFinite(item.rssi) &&
            item.rssi >= -120 &&
            item.rssi <= 0 &&
            Number.isFinite(item.frequency) &&
            Number.isFinite(item.ageMs) &&
            item.ageMs >= 0 &&
            item.ageMs <= 30000
        )
        .sort(
          (a, b) => b.rssi - a.rssi
        );

      const candidatos =
        compararHuellasWifi(
          lecturas,
          [
            ...HUELLAS_WIFI,
            ...this.huellasLocales
          ]
        );

      this.estadoInterno.next({
        buscandoWifi: false,
        lecturas,
        candidatos: candidatos.slice(0, 3),
        errorWifi: null
      });

      this.muestrasWifi.next({
        timestamp: resultado.timestamp,
        candidatos
      });
    } catch (error) {
      if (!this.destruido) {
        const codigo =
          typeof error === 'object' &&
          error !== null &&
          'code' in error
            ? String(error.code)
            : 'scan-failed';

        this.estadoInterno.next({
          buscandoWifi: false,
          lecturas: [],
          candidatos: [],
          errorWifi: codigo
        });
      }
    }
  }

  candidatoWifiVigente(
    nodoId: string
  ): boolean {
    return (
      !this.estadoInterno.value.buscandoWifi &&
      Date.now() - this.instanteWifi <= 30000 &&
      this.instanteWifi <= Date.now() + 1000 &&
      this.estadoInterno.value.candidatos.some(
        item =>
          item.huella.nodoIds.includes(nodoId)
      )
    );
  }

  // Solo desde una confirmación explícita en un POI conocido;
  // nunca desde el cursor estimado.
  guardarReferenciaGps(
    nodoId: string
  ): boolean {
    const posicion =
      this.posicionReciente();

    if (
      !posicion ||
      !this.mapa.obtenerNodoPorId(nodoId) ||
      posicion.coords.accuracy > 5
    ) {
      return false;
    }

    const referencia: ReferenciaGpsPoi = {
      nodoId,
      latitude: posicion.coords.latitude,
      longitude: posicion.coords.longitude,
      accuracy: posicion.coords.accuracy,
      timestamp: posicion.timestamp
    };

    const siguientes = [
      ...this.referencias.filter(
        item => item.nodoId !== nodoId
      ),
      referencia
    ];

    try {
      localStorage.setItem(
        this.clave,
        JSON.stringify(siguientes)
      );

      this.referencias = siguientes;

      return true;
    } catch {
      return false;
    }
  }

  sugerirPoiGps(
    nivel: number
  ): string | null {
    const posicion =
      this.posicionReciente();

    if (
      !posicion ||
      posicion.coords.accuracy > 5
    ) {
      return null;
    }

    const candidatos = this.referencias
      .filter(
        item =>
          this.mapa
            .obtenerNodoPorId(item.nodoId)
            ?.nivel === nivel
      )
      .map(
        item => ({
          item,
          distancia: distanciaGpsMetros(
            item,
            posicion.coords
          )
        })
      )
      .sort(
        (a, b) =>
          a.distancia - b.distancia
      );

    const mejor = candidatos[0];

    if (
      !mejor ||
      mejor.distancia >
        Math.max(
          3,
          posicion.coords.accuracy
        ) ||
      (
        candidatos[1] &&
        candidatos[1].distancia -
          mejor.distancia <
          posicion.coords.accuracy +
            mejor.item.accuracy
      )
    ) {
      return null;
    }

    return mejor.item.nodoId;
  }

  obtenerReferenciasGps():
    ReferenciaGpsPoi[] {
    return this.referencias.map(
      r => ({ ...r })
    );
  }

  // El usuario debe estar físicamente
  // en el POI seleccionado al guardar.
  guardarHuellaWifi(
    nodoId: string
  ): boolean {
    const nodo =
      this.mapa.obtenerNodoPorId(nodoId);

    const redes =
      this.estadoInterno.value.lecturas.filter(
        r =>
          r.frequency >= 2400 &&
          r.frequency < 2500 &&
          r.rssi >= -85
      );

    if (
      !nodo ||
      nodo.restringido ||
      this.estadoInterno.value.buscandoWifi ||
      this.estadoInterno.value.errorWifi ||
      Date.now() - this.instanteWifi > 10000 ||
      new Set(
        redes.map(
          r => r.bssid.toLowerCase()
        )
      ).size < 3
    ) {
      return false;
    }

    const huella: HuellaWifi = {
      id: `local:${nodoId}`,
      nombre: nodo.nombre,
      nodoIds: [nodoId],
      hora:
        new Date(this.instanteWifi)
          .toISOString(),
      observacion:
        'Referencia local capturada en un punto confirmado por el usuario; requiere validación en terreno.',
      lecturas: redes.map(
        r => ({
          ssid: r.ssid,
          bssid: r.bssid.toLowerCase(),
          rssi: r.rssi,
          canal: String(
            r.frequency === 2484
              ? 14
              : (r.frequency - 2407) / 5
          )
        })
      )
    };

    const siguientes = [
      ...this.huellasLocales.filter(
        h => h.id !== huella.id
      ),
      huella
    ].slice(-100);

    try {
      localStorage.setItem(
        this.claveWifi,
        JSON.stringify(siguientes)
      );

      this.huellasLocales = siguientes;

      return true;
    } catch {
      return false;
    }
  }

  private huellaValida(
    valor: unknown
  ): valor is HuellaWifi {
    if (
      !valor ||
      typeof valor !== 'object'
    ) {
      return false;
    }

    const h =
      valor as Partial<HuellaWifi>;

    return (
      typeof h.id === 'string' &&
      typeof h.nombre === 'string' &&
      typeof h.hora === 'string' &&
      typeof h.observacion === 'string' &&
      Array.isArray(h.nodoIds) &&
      h.nodoIds.length === 1 &&
      typeof h.nodoIds[0] === 'string' &&
      Array.isArray(h.lecturas) &&
      h.lecturas.length >= 3 &&
      h.lecturas.every(
        r =>
          r &&
          typeof r.ssid === 'string' &&
          typeof r.canal === 'string' &&
          typeof r.bssid === 'string' &&
          /^(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$/i
            .test(r.bssid) &&
          Number.isFinite(r.rssi) &&
          r.rssi >= -120 &&
          r.rssi <= 0
      )
    );
  }

  ngOnDestroy(): void {
    this.destruido = true;

    this.suscripcion.unsubscribe();
    this.estadoInterno.complete();
    this.muestrasWifi.complete();
  }

  private posicionReciente():
    Position | null {
    const p = this.ultimaPosicion;

    return (
      p &&
      Number.isFinite(p.timestamp) &&
      Date.now() - p.timestamp <= 10000 &&
      p.timestamp <= Date.now() + 1000 &&
      Number.isFinite(p.coords.latitude) &&
      Math.abs(p.coords.latitude) <= 90 &&
      Number.isFinite(p.coords.longitude) &&
      Math.abs(p.coords.longitude) <= 180 &&
      Number.isFinite(p.coords.accuracy) &&
      p.coords.accuracy >= 0
    )
      ? p
      : null;
  }

  private referenciaValida(
    item: unknown
  ): item is ReferenciaGpsPoi {
    if (
      typeof item !== 'object' ||
      item === null
    ) {
      return false;
    }

    const r =
      item as Partial<ReferenciaGpsPoi>;

    return (
      typeof r.nodoId === 'string' &&
      typeof r.latitude === 'number' &&
      Number.isFinite(r.latitude) &&
      Math.abs(r.latitude) <= 90 &&
      typeof r.longitude === 'number' &&
      Number.isFinite(r.longitude) &&
      Math.abs(r.longitude) <= 180 &&
      typeof r.accuracy === 'number' &&
      Number.isFinite(r.accuracy) &&
      r.accuracy >= 0 &&
      r.accuracy <= 5 &&
      typeof r.timestamp === 'number' &&
      Number.isFinite(r.timestamp) &&
      r.timestamp > 0
    );
  }
}