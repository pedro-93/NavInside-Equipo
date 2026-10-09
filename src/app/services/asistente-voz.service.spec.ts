import {
  afterEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { AsistenteVozService } from './asistente-voz.service';

describe('AsistenteVozService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lee una indicación en el idioma elegido y permite cancelarla', () => {
    class IndicacionSimulada {
      lang = '';
      rate = 1;
      pitch = 1;
      voice: SpeechSynthesisVoice | null = null;
      onend: ((event: SpeechSynthesisEvent) => void) | null = null;

      constructor(readonly text: string) {}
    }

    const cancelar = vi.fn();
    const hablar = vi.fn();
    const sintetizador = {
      cancel: cancelar,
      speak: hablar,
      getVoices: () => []
    };
    const termino = vi.fn();

    vi.stubGlobal('speechSynthesis', sintetizador);
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      IndicacionSimulada
    );

    const servicio = new AsistenteVozService();

    expect(servicio.disponible).toBe(true);
    expect(
      servicio.hablar('Gira a la derecha', 'es', termino)
    ).toBe(true);

    const indicacion = hablar.mock.calls[0][0] as IndicacionSimulada;
    expect(indicacion.text).toBe('Gira a la derecha');
    expect(indicacion.lang).toBe('es-CL');
    expect(cancelar).toHaveBeenCalledOnce();

    indicacion.onend?.({} as SpeechSynthesisEvent);
    expect(termino).toHaveBeenCalledOnce();

    servicio.detener();
    expect(cancelar).toHaveBeenCalledTimes(2);
  });

  it('devuelve false si el dispositivo no ofrece voz', () => {
    const servicio = new AsistenteVozService();

    expect(servicio.disponible).toBe(false);
    expect(servicio.hablar('Hola', 'es')).toBe(false);
  });

  it('escucha una frase de origen y destino en el idioma elegido', () => {
    const referencia: { actual?: ReconocimientoSimulado } = {};

    class ReconocimientoSimulado {
      lang = '';
      interimResults = true;
      maxAlternatives = 0;
      onresult: ((event: Event) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      onend: (() => void) | null = null;
      start = vi.fn();
      stop = vi.fn();

      constructor() {
        referencia.actual = this;
      }
    }

    const fraseReconocida = vi.fn();
    const errorReconocimiento = vi.fn();
    vi.stubGlobal('SpeechRecognition', ReconocimientoSimulado);
    const servicio = new AsistenteVozService();

    expect(servicio.reconocimientoDisponible).toBe(true);
    expect(servicio.escucharComando('es', fraseReconocida, errorReconocimiento)).toBe(true);
    const instancia = referencia.actual;
    expect(instancia?.lang).toBe('es-CL');
    expect(instancia?.interimResults).toBe(false);
    expect(instancia?.maxAlternatives).toBe(1);

    const resultados = [{
      isFinal: true,
      0: { transcript: 'desde ascensor principal hasta gimnasio' }
    }];
    instancia?.onresult?.({ results: resultados } as unknown as Event);
    expect(fraseReconocida).toHaveBeenCalledWith('desde ascensor principal hasta gimnasio');

    servicio.detenerReconocimiento();
    expect(instancia?.stop).toHaveBeenCalledOnce();
  });
});
