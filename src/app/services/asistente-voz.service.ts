import { Injectable } from '@angular/core';
import { Capacitor, PluginListenerHandle, registerPlugin } from '@capacitor/core';

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

type ConstructorReconocimiento = new () => ReconocimientoNavegador;

type NavegadorConReconocimiento = typeof globalThis & {
  SpeechRecognition?: ConstructorReconocimiento;
  webkitSpeechRecognition?: ConstructorReconocimiento;
};

interface ResultadoVozNativo {
  transcript?: string;
  code?: string;
  message?: string;
}

interface ReconocimientoVozNativo {
  start(options: { language: string }): Promise<void>;
  stop(): Promise<void>;
  addListener(
    eventName: string,
    listener: (event: ResultadoVozNativo) => void
  ): Promise<PluginListenerHandle>;
}

const RECONOCIMIENTO_NATIVO = registerPlugin<ReconocimientoVozNativo>(
  'NavInsideSpeechRecognition'
);

@Injectable({
  providedIn: 'root'
})
export class AsistenteVozService {
  private secuencia = 0;
  private reconocimiento: ReconocimientoNavegador | null = null;
  private reconocimientoNativoActivo = false;
  private listenersNativos: PluginListenerHandle[] = [];

  get disponible(): boolean {
    return this.obtenerSintetizador() !== null &&
      typeof SpeechSynthesisUtterance !== 'undefined';
  }

  get reconocimientoDisponible(): boolean {
    if (Capacitor.isNativePlatform()) {
      return true;
    }

    if (typeof window === 'undefined') {
      return false;
    }

    const hostLocal = ['localhost', '127.0.0.1', '[::1]']
      .includes(window.location.hostname);
    const contextoSeguro = window.isSecureContext || hostLocal;

    return contextoSeguro && this.obtenerConstructorReconocimiento() !== null;
  }

  hablar(
    texto: string,
    idioma: Idioma,
    alFinalizar?: () => void
  ): boolean {
    const sintetizador = this.obtenerSintetizador();

    if (
      !sintetizador ||
      typeof SpeechSynthesisUtterance === 'undefined'
    ) {
      return false;
    }

    const secuenciaActual = ++this.secuencia;
    sintetizador.cancel();

    const indicacion = new SpeechSynthesisUtterance(texto);
    const etiquetaIdioma = ETIQUETAS_VOZ[idioma];
    indicacion.lang = etiquetaIdioma;
    indicacion.rate = 0.92;
    indicacion.pitch = 1;

    const voz = sintetizador.getVoices().find(
      disponible => disponible.lang
        .toLocaleLowerCase()
        .startsWith(etiquetaIdioma.slice(0, 2))
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

  detener(): void {
    this.secuencia++;
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
      this.escucharComandoNativo(idioma, alReconocer, alError, alFinalizar);
      return true;
    }

    const Constructor = this.obtenerConstructorReconocimiento();

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
        const frase = evento.results[0]?.[0]?.transcript?.trim();

        if (evento.results[0]?.isFinal && frase) {
          alReconocer(frase);
        }
      };
      reconocimiento.onerror = evento => alError(evento.error);
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
      // Algunos navegadores lanzan si el reconocimiento ya había terminado.
    }

    if (this.reconocimientoNativoActivo) {
      this.reconocimientoNativoActivo = false;
      void RECONOCIMIENTO_NATIVO.stop().catch(() => undefined);
    }
    this.quitarListenersNativos();
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

  private obtenerConstructorReconocimiento(): ConstructorReconocimiento | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const navegador = window as NavegadorConReconocimiento;

    return navegador.SpeechRecognition ??
      navegador.webkitSpeechRecognition ??
      null;
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
        RECONOCIMIENTO_NATIVO.addListener('result', evento => {
          const frase = evento.transcript?.trim();
          this.reconocimientoNativoActivo = false;
          if (frase) alReconocer(frase);
          alFinalizar?.();
          this.quitarListenersNativos();
        }),
        RECONOCIMIENTO_NATIVO.addListener('error', evento => {
          this.reconocimientoNativoActivo = false;
          alError(evento.code ?? 'recognition-error');
          alFinalizar?.();
          this.quitarListenersNativos();
        })
      ]);
      await RECONOCIMIENTO_NATIVO.start({
        language: ETIQUETAS_VOZ[idioma]
      });
    } catch (error) {
      this.reconocimientoNativoActivo = false;
      const codigo = error && typeof error === 'object' && 'code' in error &&
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
