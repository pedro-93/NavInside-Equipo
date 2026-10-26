import { Injectable } from '@angular/core';
import {
  Capacitor,
  PluginListenerHandle,
  registerPlugin
} from '@capacitor/core';

import { Idioma } from './idioma.service';

const ETIQUETAS_VOZ: Record<Idioma, string> = {
  es: 'es-CL',
  en: 'en-US',
  pt: 'pt-BR'
};

interface AlternativaReconocimiento {
  transcript: string;
}

interface ResultadoReconocimiento {
  isFinal: boolean;
  0?: AlternativaReconocimiento;
}

interface EventoReconocimiento extends Event {
  results: ArrayLike<ResultadoReconocimiento>;
}

interface ErrorReconocimiento extends Event {
  error: string;
}

interface ReconocimientoNavegador {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: EventoReconocimiento) => void) | null;
  onerror: ((event: ErrorReconocimiento) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type ConstructorReconocimiento =
  new () => ReconocimientoNavegador;

type NavegadorConReconocimiento =
  typeof globalThis & {
    SpeechRecognition?: ConstructorReconocimiento;
    webkitSpeechRecognition?: ConstructorReconocimiento;
  };

interface ResultadoVozNativo {
  transcript?: string;
  code?: string;
  message?: string;
}

interface ReconocimientoVozNativo {
  start(options: {
    language: string;
  }): Promise<void>;

  stop(): Promise<void>;

  addListener(
    eventName: string,
    listener: (event: ResultadoVozNativo) => void
  ): Promise<PluginListenerHandle>;
}

const RECONOCIMIENTO_NATIVO =
  registerPlugin<ReconocimientoVozNativo>(
    'NavInsideSpeechRecognition'
  );

interface LecturaVozNativa {
  speak(options: {
    text: string;
    language: string;
    rate: number;
  }): Promise<void>;

  stop(): Promise<void>;
}

const LECTURA_NATIVA = registerPlugin<LecturaVozNativa>(
  'NavInsideTextToSpeech'
);

@Injectable({
  providedIn: 'root'
})
export class AsistenteVozService {
  private secuencia = 0;
  private hablandoNativo = false;
  private lecturaNativaPendiente: Promise<void> =
    Promise.resolve();

  private reconocimiento: ReconocimientoNavegador | null =
    null;

  private reconocimientoNativoActivo = false;

  private listenersNativos: PluginListenerHandle[] = [];

  get disponible(): boolean {
    if (this.usarLecturaNativa()) {
      return true;
    }

    return (
      this.obtenerSintetizador() !== null &&
      typeof SpeechSynthesisUtterance !== 'undefined'
    );
  }

  get reconocimientoDisponible(): boolean {
    if (Capacitor.isNativePlatform()) {
      return true;
    }

    if (typeof window === 'undefined') {
      return false;
    }

    const hostLocal = [
      'localhost',
      '127.0.0.1',
      '[::1]'
    ].includes(window.location.hostname);

    const contextoSeguro =
      window.isSecureContext || hostLocal;

    return (
      contextoSeguro &&
      this.obtenerConstructorReconocimiento() !== null
    );
  }

  get hablando(): boolean {
    if (this.usarLecturaNativa()) {
      return this.hablandoNativo;
    }

    const sintetizador = this.obtenerSintetizador();

    return (
      sintetizador?.speaking === true ||
      sintetizador?.pending === true
    );
  }

  hablar(
    texto: string,
    idioma: Idioma,
    alFinalizar?: () => void,
    interrumpir = true,
    duracionObjetivoMs?: number
  ): boolean {
    if (this.usarLecturaNativa()) {
      return this.hablarNativo(
        texto,
        idioma,
        alFinalizar,
        interrumpir,
        duracionObjetivoMs
      );
    }

    const sintetizador = this.obtenerSintetizador();

    if (
      !sintetizador ||
      typeof SpeechSynthesisUtterance === 'undefined'
    ) {
      return false;
    }

    const secuenciaActual = ++this.secuencia;

    if (interrumpir) {
      sintetizador.cancel();
    }

    const indicacion = new SpeechSynthesisUtterance(texto);
    const etiquetaIdioma = ETIQUETAS_VOZ[idioma];

    indicacion.lang = etiquetaIdioma;
    indicacion.rate = this.calcularVelocidadVoz(
      texto,
      duracionObjetivoMs
    );
    indicacion.pitch = 1;
    indicacion.volume = 1;

    const voz = sintetizador.getVoices().find(disponible =>
      disponible.lang.toLocaleLowerCase().startsWith(
        etiquetaIdioma.slice(0, 2).toLocaleLowerCase()
      )
    );

    if (voz) {
      indicacion.voice = voz;
    }

    indicacion.onend = () => {
      if (secuenciaActual === this.secuencia) {
        alFinalizar?.();
      }
    };

    sintetizador.speak(indicacion);

    return true;
  }

  duracionCursorRecomendada(texto: string): number {
    const palabras = this.contarPalabras(texto);

    if (palabras === 0) {
      return 0;
    }

    const palabrasPorSegundo = 2.4;
    const velocidadBase = 0.92;

    const duracionEstimada =
      (palabras / (palabrasPorSegundo * velocidadBase)) * 1000;

    return Math.min(
      7200,
      Math.max(2600, duracionEstimada + 480)
    );
  }

  detener(): void {
    this.secuencia++;
    this.hablandoNativo = false;
    this.lecturaNativaPendiente = Promise.resolve();

    if (this.usarLecturaNativa()) {
      void LECTURA_NATIVA.stop().catch(() => undefined);
    }

    this.obtenerSintetizador()?.cancel();
    this.detenerReconocimiento();
  }

  escucharComando(
    idioma: Idioma,
    alReconocer: (frase: string) => void,
    alError: (codigo: string) => void,
    alFinalizar?: () => void
  ): boolean {
    if (Capacitor.isNativePlatform()) {
      void this.escucharComandoNativo(
        idioma,
        alReconocer,
        alError,
        alFinalizar
      );

      return true;
    }

    const Constructor =
      this.obtenerConstructorReconocimiento();

    if (!Constructor) {
      return false;
    }

    this.detenerReconocimiento();

    try {
      const reconocimiento = new Constructor();

      reconocimiento.lang = ETIQUETAS_VOZ[idioma];
      reconocimiento.interimResults = false;
      reconocimiento.maxAlternatives = 1;

      reconocimiento.onresult = evento => {
        const frase =
          evento.results[0]?.[0]?.transcript?.trim();

        if (evento.results[0]?.isFinal && frase) {
          alReconocer(frase);
        }
      };

      reconocimiento.onerror = evento =>
        alError(evento.error);

      reconocimiento.onend = () => {
        if (this.reconocimiento === reconocimiento) {
          this.reconocimiento = null;
        }

        alFinalizar?.();
      };

      this.reconocimiento = reconocimiento;
      reconocimiento.start();

      return true;
    } catch {
      this.reconocimiento = null;
      return false;
    }
  }

  detenerReconocimiento(): void {
    const reconocimiento = this.reconocimiento;
    this.reconocimiento = null;

    try {
      reconocimiento?.stop();
    } catch {
      // El reconocimiento ya había finalizado.
    }

    if (this.reconocimientoNativoActivo) {
      this.reconocimientoNativoActivo = false;

      void RECONOCIMIENTO_NATIVO.stop()
        .catch(() => undefined);
    }

    this.quitarListenersNativos();
  }

  private usarLecturaNativa(): boolean {
    return (
      Capacitor.getPlatform() === 'android' &&
      Capacitor.isPluginAvailable('NavInsideTextToSpeech')
    );
  }

  private hablarNativo(
    texto: string,
    idioma: Idioma,
    alFinalizar?: () => void,
    interrumpir = true,
    duracionObjetivoMs?: number
  ): boolean {
    if (!texto.trim()) {
      return false;
    }

    const secuenciaActual = ++this.secuencia;
    this.hablandoNativo = true;

    const comenzar = async (): Promise<void> => {
      if (secuenciaActual !== this.secuencia) {
        return;
      }

      await LECTURA_NATIVA.speak({
        text: texto,
        language: ETIQUETAS_VOZ[idioma],
        rate: this.calcularVelocidadVoz(
          texto,
          duracionObjetivoMs
        )
      });
    };

    const lectura = interrumpir
      ? comenzar()
      : this.lecturaNativaPendiente.then(comenzar);

    this.lecturaNativaPendiente = lectura.then(
      () => {
        if (secuenciaActual === this.secuencia) {
          this.hablandoNativo = false;
          alFinalizar?.();
        }
      },
      (error: unknown) => {
        if (secuenciaActual !== this.secuencia) {
          return;
        }

        this.hablandoNativo = false;

        const codigo =
          error &&
          typeof error === 'object' &&
          'code' in error
            ? error.code
            : 'tts-speak-error';

        if (codigo !== 'tts-cancelled') {
          console.error(
            'No se pudo reproducir la voz de Android:',
            error
          );
          alFinalizar?.();
        }
      }
    );

    return true;
  }

  private calcularVelocidadVoz(
    texto: string,
    duracionObjetivoMs?: number
  ): number {
    const velocidadBase = 0.92;

    if (!duracionObjetivoMs || duracionObjetivoMs <= 0) {
      return velocidadBase;
    }

    const palabras = this.contarPalabras(texto);

    if (palabras === 0) {
      return velocidadBase;
    }

    const duracionEstimada = (palabras / 2.4) * 1000;
    const ventanaVoz = Math.max(
      1200,
      duracionObjetivoMs * 0.84
    );

    const velocidadNecesaria =
      duracionEstimada / ventanaVoz;

    return Math.min(
      1.25,
      Math.max(velocidadBase, velocidadNecesaria)
    );
  }

  private contarPalabras(texto: string): number {
    const textoLimpio = texto.trim();

    if (!textoLimpio) {
      return 0;
    }

    return textoLimpio.split(/\s+/).filter(Boolean).length;
  }

  private obtenerSintetizador(): SpeechSynthesis | null {
    if (
      typeof window === 'undefined' ||
      !('speechSynthesis' in window)
    ) {
      return null;
    }

    return window.speechSynthesis;
  }

  private obtenerConstructorReconocimiento():
    ConstructorReconocimiento | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const navegador =
      window as NavegadorConReconocimiento;

    return (
      navegador.SpeechRecognition ??
      navegador.webkitSpeechRecognition ??
      null
    );
  }

  private async escucharComandoNativo(
    idioma: Idioma,
    alReconocer: (frase: string) => void,
    alError: (codigo: string) => void,
    alFinalizar?: () => void
  ): Promise<void> {
    this.detenerReconocimiento();
    this.reconocimientoNativoActivo = true;

    try {
      this.listenersNativos = await Promise.all([
        RECONOCIMIENTO_NATIVO.addListener(
          'result',
          evento => {
            const frase = evento.transcript?.trim();
            this.reconocimientoNativoActivo = false;

            if (frase) {
              alReconocer(frase);
            }

            alFinalizar?.();
            this.quitarListenersNativos();
          }
        ),
        RECONOCIMIENTO_NATIVO.addListener(
          'error',
          evento => {
            this.reconocimientoNativoActivo = false;

            alError(evento.code ?? 'recognition-error');
            alFinalizar?.();
            this.quitarListenersNativos();
          }
        )
      ]);

      await RECONOCIMIENTO_NATIVO.start({
        language: ETIQUETAS_VOZ[idioma]
      });
    } catch (error) {
      this.reconocimientoNativoActivo = false;

      const codigo =
        error &&
        typeof error === 'object' &&
        'code' in error &&
        typeof error.code === 'string'
          ? error.code
          : 'recognition-error';

      alError(codigo);
      alFinalizar?.();
      this.quitarListenersNativos();
    }
  }

  private quitarListenersNativos(): void {
    const listeners = this.listenersNativos;
    this.listenersNativos = [];

    for (const listener of listeners) {
      void listener.remove();
    }
  }
}