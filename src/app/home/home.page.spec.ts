import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import {
  NODOS_HIPPOCAMPUS
} from '../data/mapa-simulado.data';

import {
  HomePage
} from './home.page';

import { MapaService } from '../services/mapa.service';
import { AsistenteVozService } from '../services/asistente-voz.service';
import { PosicionamientoApoyoService } from '../services/posicionamiento-apoyo.service';
import { Capacitor } from '@capacitor/core';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(() => {
    vi.spyOn(MapaService.prototype, 'cargarMapaDesdeSupabase')
      .mockResolvedValue(false);

    fixture =
      TestBed.createComponent(HomePage);

    component =
      fixture.componentInstance;

    component.seleccionarIdioma('es');
    component.lugares =
      NODOS_HIPPOCAMPUS;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component)
      .toBeTruthy();
  });

  it('permite confirmar Aquí estoy sin Wi-Fi y utiliza el punto confirmado como origen',()=>{
    vi.spyOn(TestBed.inject(PosicionamientoApoyoService),'wifiDisponible','get').mockReturnValue(false);
    fixture.detectChanges();
    const pagina=fixture.nativeElement as HTMLElement;
    const aqui=pagina.querySelector<HTMLButtonElement>('.controles-aplicacion__ubicacion')!;
    expect(aqui.textContent).toContain('Aquí estoy');
    expect(aqui.closest('.controles-aplicacion')).toBeTruthy();
    expect(aqui.compareDocumentPosition(pagina.querySelector('#puntos-interes')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(component.menuAbierto).toBe(false);
    expect(component.rutaCalculada).toHaveLength(0);
    expect(aqui.disabled).toBe(false);
    aqui.click();fixture.detectChanges();
    const selector=pagina.querySelector<HTMLSelectElement>('#punto-ubicacion')!;
    expect(document.activeElement).toBe(selector);
    expect(aqui.getAttribute('aria-expanded')).toBe('true');
    selector.value='hall-nivel-1';selector.dispatchEvent(new Event('change'));
    fixture.detectChanges();pagina.querySelector<HTMLButtonElement>('.confirmar-ubicacion')!.click();
    expect(component.origen).toBe('hall-nivel-1');
    expect(component.origenConfirmadoSeguimiento).toBe(true);
    expect(component.mensajeApoyo).toContain('Ubicación confirmada por ti');
    expect(pagina.querySelectorAll('.tabla-levantamiento tbody tr')).toHaveLength(24);
  });

  it('conserva Aquí estoy visible y permite confirmar mientras se buscan redes en Android', () => {
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
    vi.spyOn(Capacitor, 'isPluginAvailable').mockImplementation(nombre => nombre === 'App');
    vi.spyOn(TestBed.inject(PosicionamientoApoyoService), 'wifiDisponible', 'get').mockReturnValue(true);
    const buscar = vi.spyOn(component, 'buscarReferenciasWifi');
    component.estadoApoyo = { ...component.estadoApoyo, buscandoWifi: true };
    fixture.detectChanges();
    const pagina = fixture.nativeElement as HTMLElement;
    const aqui = pagina.querySelector<HTMLButtonElement>('.controles-aplicacion__ubicacion')!;
    expect(aqui.textContent).toContain('Aquí estoy');
    expect(aqui.getAttribute('aria-busy')).toBe('true');
    expect(aqui.disabled).toBe(false);
    expect(pagina.querySelector('.controles-aplicacion__salir')).toBeTruthy();
    aqui.click(); fixture.detectChanges();
    expect(pagina.querySelector('#punto-ubicacion')).toBeTruthy();
    expect(buscar).not.toHaveBeenCalled();
  });

  it('muestra Iniciar y permite usar Atrás durante la guía',()=>{
    component.origen='hall-nivel-1';component.destino='mini-market-proa-nivel-1';
    component.calcularRuta();fixture.detectChanges();
    const pagina=fixture.nativeElement as HTMLElement;
    expect(pagina.querySelector('.guia-paso-a-paso__automatico')?.textContent?.trim()).toBe('Iniciar');
    const atras=pagina.querySelector<HTMLButtonElement>('.controles-aplicacion__atras')!;
    expect(atras.textContent).toContain('Atrás');
    component.avanzarPaso();fixture.detectChanges();
    atras.click();expect(component.pasoActualIndice).toBe(0);
    component.menuAbierto=true;component.volverAtras();expect(component.menuAbierto).toBe(false);
  });

  it('reconoce las referencias Movistar entregadas para Proa, Play, Juegos Adultos y Kids', () => {
    fixture.detectChanges();
    const pagina = fixture.nativeElement as HTMLElement;
    for (const id of ['mini-market-proa-nivel-1', 'zona-play-nivel-1', 'zona-juego-adulto-nivel-1', 'zona-kid-nivel-1']) {
      const fila = pagina.querySelector(`[data-poi="${id}"]`)!;
      expect(fila.textContent).toContain('Referencia compartida recibida');
      expect(fila.textContent).toContain('movistar2,4GHZ_E23C58');
      expect(fila.textContent).toContain('sin dBm individuales');
      expect(fila.textContent).not.toContain('Sin captura');
    }
    expect(pagina.textContent).toContain('WiFi Analyzer');
    expect(pagina.textContent).toContain('Captura 11:57');
  });

  it('muestra la salida en Android con el complemento App disponible', () => {
    const plataforma = vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('web');
    vi.spyOn(Capacitor, 'isPluginAvailable').mockImplementation(nombre => nombre === 'App');
    const salir = vi.spyOn(component, 'salirAplicacion').mockResolvedValue(undefined);
    const pagina = fixture.nativeElement as HTMLElement;
    const botonSalida = () => pagina.querySelector<HTMLButtonElement>('.menu-principal__salir');

    fixture.detectChanges();
    const menu = pagina.querySelector<HTMLButtonElement>('button[aria-controls="menu-principal"]')!;
    menu.click();
    fixture.detectChanges();
    expect(pagina.querySelector('#menu-principal')).toBeTruthy();
    expect(botonSalida()).toBeNull();

    menu.click();
    fixture.detectChanges();
    plataforma.mockReturnValue('android');
    expect(component.puedeSalirAplicacion).toBe(true);
    menu.click();
    fixture.detectChanges();
    expect(botonSalida()?.textContent?.trim()).toBe('Salir');
    expect(botonSalida()?.getAttribute('aria-label')).toBe('Salir de la aplicación');
    botonSalida()?.click();
    expect(salir).toHaveBeenCalledOnce();
  });

  it('sigue el cursor y actualiza la escena al cambiar de piso', () => {
    const pagina = fixture.nativeElement as HTMLElement;
    const imagen = () => pagina.querySelector<HTMLImageElement>('app-tour-ruta img');
    const enlace = () => pagina.querySelector<HTMLAnchorElement>('app-tour-ruta a')?.href;
    const siguiente = () => {
      pagina.querySelector<HTMLButtonElement>('.mapa-con-tour__avance .guia-paso-a-paso__siguiente')?.click();
      fixture.detectChanges();
    };

    component.origen = 'lobby-nivel-4';
    component.destino = 'salon-costamar-nivel-5';
    component.calcularRuta();
    fixture.detectChanges();

    expect(imagen()?.src).toContain('JeTutcK7xb-j-thumb.jpeg');
    expect(enlace()).toContain('sceneId=oK_w-wZnOM');
    expect(component.nodoActualId).toBe('lobby-nivel-4');

    siguiente();
    expect(imagen()?.src).toContain('zYVz8M8aRKji-thumb.jpg');
    expect(enlace()).toContain('sceneId=fV1x-5WeFj');
    expect(component.nodoActualId).toBe('acceso-costamar-nivel-4');

    pagina.querySelector<HTMLButtonElement>('.mapa-con-tour__avance button')?.click();
    fixture.detectChanges();
    expect(enlace()).toContain('sceneId=oK_w-wZnOM');

    siguiente();
    siguiente();
    expect(imagen()?.src).toContain('PlVhXGiCoAZS-thumb.jpg');
    expect(enlace()).toContain('sceneId=wmKo3wzc6K');
    expect(component.nodoActualId).toBe('salon-costamar-nivel-5');
    expect(pagina.querySelector('iframe.mapa-interactivo-iframe--nivel-5')).toBeTruthy();

    imagen()?.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(imagen()).toBeNull();
    expect(pagina.querySelector('app-tour-ruta')?.textContent).toContain('Fotografía del tour no disponible');

    component.origen = 'restaurant-faro-nivel-3';
    component.destino = 'piscina-temperada-nivel-3';
    component.calcularRuta();
    fixture.detectChanges();

    expect(imagen()?.src).toContain('7-Ii0_cegOqa-thumb.jpg');
    expect(enlace()).toContain('sceneId=thBYUcbf8z');
  });

  it('espera a que el cursor animado termine antes de cambiar la vista', () => {
    const pagina = fixture.nativeElement as HTMLElement;
    const nombre = () => pagina.querySelector('app-tour-ruta h3')?.textContent?.trim();
    component.origen = 'piscina-temperada-nivel-3';
    component.destino = 'restaurant-faro-nivel-3';
    component.calcularRuta();
    fixture.detectChanges();

    const mapa = pagina.querySelector<HTMLIFrameElement>('iframe.mapa-interactivo-iframe--guiado')!;
    const publicar = vi.spyOn(mapa.contentWindow!, 'postMessage');
    component.avanzarPaso();
    fixture.detectChanges();
    component.actualizarCursorMapa(true);
    const estado = publicar.mock.calls.at(-1)![0];
    window.dispatchEvent(new MessageEvent('message', { source: mapa.contentWindow, origin: window.location.origin,
      data: { type: 'navinside-animation-start', level: 3, motionId: estado.motionId, durationMs: 2400 } }));
    fixture.detectChanges();

    expect(component.nodoActualId).toBe('ascensor-central-nivel-3');
    expect(nombre()).toBe('Piscina temperada');

    window.dispatchEvent(new MessageEvent('message', { source: mapa.contentWindow, origin: window.location.origin,
      data: { type: 'navinside-animation-end', level: 3, motionId: estado.motionId } }));
    fixture.detectChanges();

    expect(nombre()).toBe('Salida Ascensor Central - Nivel 3');
    expect(pagina.querySelector('app-tour-ruta img')).toBeNull();
  });

  it('muestra los mapas incorporados al cambiar entre los niveles 1 y 3', () => {
    fixture.detectChanges();
    const pagina = fixture.nativeElement as HTMLElement;
    expect(pagina.querySelector<HTMLIFrameElement>('iframe')?.src).toContain('nivel-1-navegacion.html');
    component.mostrarNivelMapa(3);
    fixture.detectChanges();
    expect(pagina.querySelector<HTMLIFrameElement>('iframe')?.src).toContain('nivel-3-navegacion.html');
    component.mostrarNivelMapa(1);
    fixture.detectChanges();
    expect(pagina.querySelector<HTMLIFrameElement>('iframe')?.src).toContain('nivel-1-navegacion.html');
  });

  it('abre los cinco planos fusionados y transmite el avance físico del piso 6 sin esperar un cambio de nodo',()=>{
    const pagina=fixture.nativeElement as HTMLElement;
    for(const nivel of [1,3,4,5,6] as const){
      component.mostrarNivelMapa(nivel);fixture.detectChanges();
      expect(pagina.querySelector<HTMLIFrameElement>('iframe')?.src).toContain(`nivel-${nivel}-navegacion.html`);
    }
    component.origen='ascensor-habitaciones-piso-6';component.destino='puerta-acceso-tinajas-piso-6';
    component.calcularRuta();fixture.detectChanges();
    const mapa=pagina.querySelector<HTMLIFrameElement>('iframe')!;
    const publicar=vi.spyOn(mapa.contentWindow!,'postMessage');
    component.seguimientoFisicoSeleccionado=true;
    const estado={fase:'siguiendo' as const,indiceNodo:0,origenTramoId:component.origen,destinoTramoId:component.destino,
      fraccionTramo:0.25,metrosRecorridos:5,metrosRestantes:15,pasosEstimados:25,longitudPasoMetros:0.2};
    component['recibirEstadoSeguimiento'](estado);component.actualizarCursorMapa();
    const inicial=publicar.mock.calls.at(-1)![0];
    component['recibirEstadoSeguimiento']({...estado,fraccionTramo:0.75,metrosRecorridos:15,metrosRestantes:5});
    component.actualizarCursorMapa();
    const avanzado=publicar.mock.calls.at(-1)![0];
    expect(inicial.physical.fraction).toBe(0.25);
    expect(avanzado.physical.fraction).toBe(0.75);
    expect(avanzado.currentId).toBe(inicial.currentId);
    expect(avanzado.motionId).toBe(inicial.motionId);
    expect(avanzado.level).toBe(6);
  });

  it('selecciona destinos desde el mapa y rechaza mensajes de otro origen, marco o nivel', () => {
    fixture.detectChanges();
    const mapa = (fixture.nativeElement as HTMLElement).querySelector<HTMLIFrameElement>('iframe')!;
    const seleccionar = (nodeId: string, origin = window.location.origin, source: MessageEventSource | null = mapa.contentWindow, level = 1) => {
      window.dispatchEvent(new MessageEvent('message', { origin, source,
        data: { type: 'navinside-select-destination', level, nodeId } }));
    };
    seleccionar('gimnasio-nivel-1');
    expect(component.destino).toBe('gimnasio-nivel-1');
    seleccionar('hall-nivel-1', 'https://otro-origen.invalid');
    seleccionar('hall-nivel-1', window.location.origin, window);
    seleccionar('hall-nivel-1', window.location.origin, mapa.contentWindow, 3);
    seleccionar('salon-costamar-nivel-5');
    expect(component.destino).toBe('gimnasio-nivel-1');
    component.mostrarNivelMapa(3); component.modoAccesible = true;
    fixture.detectChanges();
    const mapaTres = (fixture.nativeElement as HTMLElement).querySelector<HTMLIFrameElement>('iframe')!;
    window.dispatchEvent(new MessageEvent('message', { origin: window.location.origin, source: mapaTres.contentWindow,
      data: { type: 'navinside-select-destination', level: 3, nodeId: 'piscina-acceso-escalones-nivel-3' } }));
    expect(component.destino).toBe('piscina-acceso-accesible-nivel-3');
  });

  it('ignora finales de animación antiguos al sincronizar la foto con el cursor', () => {
    component.origen = 'ascensor-central-nivel-1'; component.destino = 'mini-market-proa-nivel-1';
    component.calcularRuta(); fixture.detectChanges();
    const mapa = (fixture.nativeElement as HTMLElement).querySelector<HTMLIFrameElement>('iframe')!;
    const publicar = vi.spyOn(mapa.contentWindow!, 'postMessage');
    component.avanzarPaso(); fixture.detectChanges(); component.actualizarCursorMapa(true);
    const estado = publicar.mock.calls.at(-1)![0];
    const evento = (type: string, motionId: string) => window.dispatchEvent(new MessageEvent('message', {
      source: mapa.contentWindow, origin: window.location.origin,
      data: { type, motionId, level: 1, durationMs: 1400 }
    }));
    evento('navinside-animation-start', estado.motionId);
    expect(component.nodoVistaRuta?.id).toBe('ascensor-central-nivel-1');
    evento('navinside-animation-end', 'anterior');
    expect(component.nodoVistaRuta?.id).toBe('ascensor-central-nivel-1');
    evento('navinside-animation-end', estado.motionId);
    expect(component.nodoVistaRuta?.id).toBe(component.nodoActualId);
  });

  it('sincroniza la indicación y la voz con los giros del plano sin repetir el tramo ni aceptar mensajes antiguos', () => {
    const voz=TestBed.inject(AsistenteVozService);
    vi.spyOn(voz,'disponible','get').mockReturnValue(true);
    const hablar=vi.spyOn(voz,'hablar').mockReturnValue(true);
    component.origen='ascensor-central-nivel-1';component.destino='gimnasio-nivel-1';
    component.calcularRuta();fixture.detectChanges();
    const mapa=(fixture.nativeElement as HTMLElement).querySelector<HTMLIFrameElement>('iframe')!;
    const publicar=vi.spyOn(mapa.contentWindow!,'postMessage');
    component.actualizarCursorMapa(true);
    const estado=publicar.mock.calls.at(-1)![0];
    expect(estado.legs[0]).toEqual({fromId:'ascensor-central-nivel-1',toId:'hall-nivel-1',meters:10.336});
    hablar.mockClear();
    const guia={type:'navinside-guidance',level:1,motionId:estado.motionId,context:estado.guidanceContext,
      key:'tramo-del-plano',text:'Sigue recto hacia Hall Central.',speech:'Sigue recto. Luego, gira a la derecha.'};
    const enviar=(datos=guia,origin=window.location.origin,source:MessageEventSource|null=mapa.contentWindow)=>
      window.dispatchEvent(new MessageEvent('message',{source,origin,data:datos}));
    const anterior=component.instruccionActual;
    enviar(guia,'https://otro.invalid');enviar(guia,window.location.origin,window);
    enviar({...guia,motionId:'anterior'});enviar({...guia,context:'otra-ruta'});
    expect(component.instruccionActual).toBe(anterior);
    enviar();
    expect(component.instruccionActual).toBe(guia.text);
    expect(component.instruccionVozActual).toBe(guia.speech);
    expect(hablar).toHaveBeenCalledOnce();
    expect(hablar.mock.calls[0].slice(0,2)).toEqual([guia.speech,'es']);
    enviar({...guia,text:'Ahora gira a la derecha.'});
    expect(component.instruccionActual).toBe('Ahora gira a la derecha.');
    expect(hablar).toHaveBeenCalledOnce();
    component.alternarAsistenteVoz();component.alternarAsistenteVoz();
    expect(hablar).toHaveBeenCalledTimes(2);
    component.avanzarPaso();
    expect(component.instruccionActual).not.toBe('Ahora gira a la derecha.');
    fixture.detectChanges();enviar();
    expect(component.instruccionActual).not.toBe(guia.text);
    component.cambiarSeleccionRuta();
    expect(component.instruccionActual).toBe('');
  });

  it('conserva los avisos de desvío y pausa por encima de los giros del mapa', () => {
    component.origen='ascensor-central-nivel-1';component.destino='hall-nivel-1';
    component.calcularRuta();fixture.detectChanges();
    component.seguimientoFisicoSeleccionado=true;
    component.seguimientoFisico={fase:'siguiendo',indiceNodo:0,origenTramoId:component.origen,
      destinoTramoId:component.destino,fraccionTramo:0.4,metrosRecorridos:4,metrosRestantes:6,
      pasosEstimados:20,longitudPasoMetros:0.2,direccion:'avanzando'};
    const mapa=(fixture.nativeElement as HTMLElement).querySelector<HTMLIFrameElement>('iframe')!;
    const publicar=vi.spyOn(mapa.contentWindow!,'postMessage');
    component.actualizarCursorMapa(true);
    const estado=publicar.mock.calls.at(-1)![0];
    window.dispatchEvent(new MessageEvent('message',{origin:window.location.origin,source:mapa.contentWindow,
      data:{type:'navinside-guidance',level:1,motionId:estado.motionId,context:estado.guidanceContext,
        key:'fisico',text:'Sigue el pasillo del plano.',speech:'Sigue el pasillo del plano.'}}));
    expect(component.instruccionActual).toBe('Sigue el pasillo del plano.');
    component.seguimientoFisico.direccion='desviado';
    expect(component.instruccionActual).not.toBe('Sigue el pasillo del plano.');
    component.seguimientoFisico.fase='pausado';
    expect(component.instruccionActual).toBe('Recorrido pausado.');
  });

  it('actualiza la imagen con el punto alcanzado en el seguimiento físico', () => {
    const pagina = fixture.nativeElement as HTMLElement;
    component.origen = 'ascensor-central-nivel-3';
    component.destino = 'restaurant-faro-nivel-3';
    component.calcularRuta();
    fixture.detectChanges();

    component.seguimientoFisicoSeleccionado = true;
    component['recibirEstadoSeguimiento']({
      fase: 'llegada-estimada',
      indiceNodo: 1,
      origenTramoId: 'restaurant-faro-nivel-3',
      destinoTramoId: null,
      fraccionTramo: 1,
      metrosRecorridos: 16,
      metrosRestantes: 0,
      pasosEstimados: 80,
      longitudPasoMetros: 0.2
    });
    fixture.detectChanges();

    expect(component.nodoVistaRuta?.id).toBe('restaurant-faro-nivel-3');
    expect(pagina.querySelector<HTMLImageElement>('app-tour-ruta img')?.src)
      .toContain('7-Ii0_cegOqa-thumb.jpg');
  });

  it('simula el recorrido en los mapas de los niveles 4 y 5', () => {
    vi.useFakeTimers();
    try {
      component.origen = 'lobby-nivel-4';
      component.destino = 'salon-costamar-nivel-5';
      component.calcularRuta();
      fixture.detectChanges();

      component.iniciarRecorridoAutomatico();
      vi.advanceTimersByTime(700);
      fixture.detectChanges();
      expect(component.nodoVistaRuta?.id).toBe('acceso-costamar-nivel-4');

      vi.advanceTimersByTime(700);
      fixture.detectChanges();
      expect(component.nodoVistaRuta?.id).toBe('salon-costamar-nivel-5');

      vi.advanceTimersByTime(700);
      fixture.detectChanges();
      expect(component.esUltimoPaso).toBe(true);
      expect(component.recorridoAutomaticoActivo).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('usa el nuevo plano del nivel 4 y muestra la fotografía de recepción durante la ruta', () => {
    component.mostrarNivelMapa(4);fixture.detectChanges();
    const pagina=fixture.nativeElement as HTMLElement;
    const mapa=pagina.querySelector<HTMLIFrameElement>('iframe.mapa-interactivo-iframe--guiado')!;
    expect(mapa.src).toContain('nivel-4-navegacion.html');
    window.dispatchEvent(new MessageEvent('message',{origin:window.location.origin,source:mapa.contentWindow,
      data:{type:'navinside-select-destination',level:4,nodeId:'recepcion-resort-nivel-4'}}));
    expect(component.destino).toBe('recepcion-resort-nivel-4');
    component.origen='entrada-nivel-4';component.calcularRuta();fixture.detectChanges();
    const publicar=vi.spyOn(mapa.contentWindow!,'postMessage');
    component.actualizarCursorMapa(true);
    const estado=publicar.mock.calls.at(-1)![0];
    expect(estado.type).toBe('navinside-map-state');
    expect(estado.level).toBe(4);
    expect(estado.legs[0].meters).toBe(6.751);
    expect(estado.photos['recepcion-resort-nivel-4'].src).toContain('recepcion-hippocampus.jpg');
    component.avanzarPaso();fixture.detectChanges();
    expect(pagina.querySelector<HTMLImageElement>('app-tour-ruta img')?.src).toContain('recepcion-hippocampus.jpg');
    expect(pagina.querySelector('app-tour-ruta small')?.textContent).toContain('Fotografía del nivel 4');
  });

  it('guía del Lobby a Costa Mar con la escena del acceso y sin distancia estimada', () => {
    component.origen = 'lobby-nivel-4';
    component.destino = 'salon-costamar-nivel-5';
    component.calcularRuta();
    fixture.detectChanges();

    expect(component.resultado).toBe('Lobby → Entrada Salón Costamar → Salón Costamar');
    expect(component.instruccionesRuta).toContain('Usa el acceso a Costamar y sube al nivel 5.');
    expect(component.textoDistanciaRuta(component.distanciaTotal)).toBe('Por medir');
    expect(component.puedeIniciarSeguimientoFisico).toBe(false);
    expect(fixture.nativeElement.querySelector('app-tour-ruta')).toBeTruthy();
  });

  it('incorpora el Pasillo de habitaciones del nivel 4 con referencia 360 y distancia por medir', () => {
    component.origen = 'lobby-nivel-4';
    component.destino = 'pasillo-habitaciones-nivel-4';
    component.calcularRuta();
    fixture.detectChanges();

    expect(component.resultado).toBe('Lobby → Pasillo de habitaciones');
    expect(component.textoDistanciaRuta(component.distanciaTotal)).toBe('Por medir');
    expect(component.puedeIniciarSeguimientoFisico).toBe(false);
    expect(component.puntosInteresNivel.filter(punto => punto.id === component.destino)).toHaveLength(1);
    component.avanzarPaso();
    fixture.detectChanges();
    const pagina = fixture.nativeElement as HTMLElement;
    expect(pagina.querySelector('app-tour-ruta h3')?.textContent).toContain('Pasillo de habitaciones');
    expect(pagina.querySelector<HTMLAnchorElement>('app-tour-ruta a')?.href).toContain('sceneId=teu3P2hlrr');
    expect(pagina.querySelector('app-tour-ruta img[src*="undefined"]')).toBeNull();
  });

  it(
    'interpreta una solicitud hablada para completar origen y destino',
    () => {
      component.procesarComandoVozRuta(
        'Desde ascensor principal hasta gimnasio'
      );

      expect(component.origen)
        .toBe(
          'ascensor-central-nivel-1'
        );

      expect(component.destino)
        .toBe(
          'gimnasio-nivel-1'
        );

      expect(
        component.estadoComandoVoz
      ).toContain(
        'Ascensor principal'
      );

      expect(
        component.estadoComandoVoz
      ).toContain('Gimnasio');
    }
  );

  it(
    'reconoce recepción turismo mediante alias de voz',
    () => {
      component.procesarSeleccionVoz(
        'origen',
        'recepción de turismo'
      );

      expect(component.origen)
        .toBe(
          'recepcion-turismo-vina-nivel-4'
        );
    }
  );

  it(
    'reconoce salón Altamar mediante distintas expresiones',
    () => {
      const expresiones = [
        'salón Altamar',
        'Altamar',
        'salón alta mar'
      ];

      for (
        const expresion of expresiones
      ) {
        component.destino = '';

        component.procesarSeleccionVoz(
          'destino',
          expresion
        );

        expect(component.destino)
          .toBe(
            'salon-eventos-altamar-nivel-1'
          );
      }
    }
  );

  it(
    'reconoce Hall aunque el navegador lo transcriba de otra forma',
    () => {
      const expresiones = [
        'hall',
        'all',
        'al',
        'jal'
      ];

      for (
        const expresion of expresiones
      ) {
        component.origen = '';

        component.procesarSeleccionVoz(
          'origen',
          expresion
        );

        expect(component.origen)
          .toBe(
            'hall-nivel-1'
          );
      }
    }
  );

  it('distingue el Lobby del nivel 4 y el Hall del nivel 1 al pedir una ruta por voz', () => {
    component.procesarComandoVozRuta('Desde el lobby hasta el hall');

    expect(component.origen).toBe('lobby-nivel-4');
    expect(component.destino).toBe('hall-nivel-1');
  });

  it(
    'reconoce gimnasio mediante expresiones en inglés',
    () => {
      component.seleccionarIdioma(
        'en'
      );

      component.lugares =
        NODOS_HIPPOCAMPUS;

      const expresiones = [
        'gym',
        'jim',
        'gem',
        'fitness',
        'fitness center',
        'fitness centre',
        'fitness room'
      ];

      for (
        const expresion of expresiones
      ) {
        component.destino = '';

        component.procesarSeleccionVoz(
          'destino',
          expresion
        );

        expect(component.destino)
          .toBe(
            'gimnasio-nivel-1'
          );
      }
    }
  );

  it(
    'reconoce juegos de adultos mediante expresiones en inglés',
    () => {
      component.seleccionarIdioma(
        'en'
      );

      component.lugares =
        NODOS_HIPPOCAMPUS;

      const expresiones = [
        'adult',
        'adults',
        'adult game',
        'adult games',
        'adult game room',
        'adult games area',
        'game room',
        'games room'
      ];

      for (
        const expresion of expresiones
      ) {
        component.destino = '';

        component.procesarSeleccionVoz(
          'destino',
          expresion
        );

        expect(component.destino)
          .toBe(
            'zona-juego-adulto-nivel-1'
          );
      }
    }
  );

  it(
    'reconoce gimnasio mediante expresiones en portugués',
    () => {
      component.seleccionarIdioma(
        'pt'
      );

      component.lugares =
        NODOS_HIPPOCAMPUS;

      const expresiones = [
        'academia',
        'ginásio',
        'ginasio',
        'sala de ginástica',
        'centro fitness'
      ];

      for (
        const expresion of expresiones
      ) {
        component.destino = '';

        component.procesarSeleccionVoz(
          'destino',
          expresion
        );

        expect(component.destino)
          .toBe(
            'gimnasio-nivel-1'
          );
      }
    }
  );

  it(
    'reconoce juegos de adultos mediante expresiones en portugués',
    () => {
      component.seleccionarIdioma(
        'pt'
      );

      component.lugares =
        NODOS_HIPPOCAMPUS;

      const expresiones = [
        'jogos adultos',
        'sala de jogos adultos',
        'área de jogos para adultos',
        'jogos para adultos'
      ];

      for (
        const expresion of expresiones
      ) {
        component.destino = '';

        component.procesarSeleccionVoz(
          'destino',
          expresion
        );

        expect(component.destino)
          .toBe(
            'zona-juego-adulto-nivel-1'
          );
      }
    }
  );

  it(
    'impide usar el mismo lugar como origen y destino',
    () => {
      component.origen =
        'hall-nivel-1';

      component.destino = '';

      component.procesarSeleccionVoz(
        'destino',
        'hall'
      );

      expect(component.destino)
        .toBe('');
    }
  );

  it(
    'da indicaciones habladas sin numeración y con distancia aproximada',
    () => {
      const origen =
        NODOS_HIPPOCAMPUS.find(
          nodo =>
            nodo.id ===
            'hall-nivel-1'
        )!;

      const destino =
        NODOS_HIPPOCAMPUS.find(
          nodo =>
            nodo.id ===
            'gimnasio-nivel-1'
        )!;

      component.rutaCalculada = [
        origen,
        destino
      ];

      component.pasosRuta = [
        {
          orden: 1,
          tipo: 'inicio',
          nodo: origen
        },
        {
          orden: 2,
          tipo: 'avance',
          desde: origen,
          nodo: destino,
          medio: 'pasillo'
        },
        {
          orden: 3,
          tipo: 'llegada',
          nodo: destino
        }
      ];

      component.pasoActualIndice = 0;

      vi.spyOn(
        component['rutaService'],
        'calcularDistanciaTotal'
      ).mockReturnValue(
        15.272
      );

      component.avanzarPaso();

      const indicacion =
        component.instruccionVozActual;

      expect(indicacion)
        .not
        .toMatch(
          /paso\s+\d+\s+de\s+\d+/i
        );

      expect(indicacion)
        .toMatch(
          /(Continúa|Luego|Ahora)/
        );

      expect(indicacion)
        .toMatch(
          /\d+ metros/
        );
    }
  );

  it(
    'muestra fotos en las tarjetas de puntos de interés elegibles',
    () => {
      component.nivelVisualizado =
        1;

      fixture.detectChanges();

      const tarjetas =
        fixture.nativeElement
          .querySelectorAll(
            '.tarjeta-punto'
          );

      expect(tarjetas.length)
        .toBeGreaterThan(0);

      const imagen = fixture.nativeElement.querySelector(
        'img.tarjeta-punto__imagen[alt="Gimnasio"]'
      ) as HTMLImageElement;
      expect(imagen?.src).toContain('RPpq9-S1hSdm-thumb.jpg');
      imagen.dispatchEvent(new Event('error'));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('img.tarjeta-punto__imagen[alt="Gimnasio"]')).toBeNull();
      expect(component.fotoPuntoInteres('gimnasio-nivel-1')).toBeNull();
    }
  );

  it('muestra una sola Piscina y mantiene los dos accesos para la ruta', () => {
    component.nivelVisualizado = 3;
    fixture.detectChanges();
    const pagina = fixture.nativeElement as HTMLElement;
    const tarjetasPiscina = () => Array.from(
      pagina.querySelectorAll<HTMLButtonElement>('.tarjeta-punto')
    ).filter(tarjeta => tarjeta.textContent?.trim() === 'Piscina');

    expect(tarjetasPiscina()).toHaveLength(1);
    for (const acceso of ['escalones', 'accesible']) {
      expect(pagina.querySelectorAll(
        `option[value="piscina-acceso-${acceso}-nivel-3"]`
      )).toHaveLength(2);
    }

    tarjetasPiscina()[0].click();
    expect(component.destino).toBe('piscina-acceso-escalones-nivel-3');
    component.modoAccesible = true;
    fixture.detectChanges();
    expect(tarjetasPiscina()).toHaveLength(1);
    expect(tarjetasPiscina()[0].classList.contains('seleccionado')).toBe(true);
    tarjetasPiscina()[0].click();
    expect(component.destino).toBe('piscina-acceso-accesible-nivel-3');
  });
});
