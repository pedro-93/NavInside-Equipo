import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  inject
} from '@angular/core';
import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerCameraDirection,
  CapacitorBarcodeScannerTypeHint
} from '@capacitor/barcode-scanner';
import {
  IonContent
} from '@ionic/angular';

import {
  MapaRutaComponent
} from '../components/mapa-ruta/mapa-ruta.component';
import {
  obtenerNombreNodo
} from '../data/nombres-nodos.data';
import {
  FotoDestino,
  FOTOS_DESTINOS
} from '../data/fotos-destinos.data';
import {
  Conexion,
  LugarPlano,
  Nodo
} from '../models/nodo.model';
import {
  AsistenteVozService
} from '../services/asistente-voz.service';
import {
  Idioma,
  IdiomaService
} from '../services/idioma.service';
import {
  MapaService
} from '../services/mapa.service';
import {
  MapaValidadorService,
  ProblemaMapa,
  ResultadoValidacionMapa
} from '../services/mapa-validador.service';
import {
  QrService
} from '../services/qr.service';
import {
  PasoRuta,
  RutaService
} from '../services/ruta.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    MapaRutaComponent,
    IonContent
  ]
})
export class HomePage implements OnDestroy {
  private readonly rutaService =
    inject(RutaService);
  private readonly qrService =
    inject(QrService);
  private readonly idiomaService =
    inject(IdiomaService);
  private readonly asistenteVoz =
    inject(AsistenteVozService);
  private readonly changeDetectorRef =
    inject(ChangeDetectorRef);
  private readonly mapaService =
    inject(MapaService);
  private readonly mapaValidadorService =
    inject(MapaValidadorService);

  conexionesMapa: Conexion[] = [];
  lugares: Nodo[] = [];
  nodosMapa: Nodo[] = [];
  lugaresReferencia: LugarPlano[] = [];

  erroresMapa: ProblemaMapa[] = [];
  advertenciasMapa: ProblemaMapa[] = [];
  mapaEsValido = true;

  origen = '';
  destino = '';
  modoAccesible = false;
  idiomaSeleccionado: Idioma;
  mensajeUbicacion = '';
  resultado = '';
  distanciaTotal: number | null = null;
  rutaCalculada: Nodo[] = [];
  pasosRuta: PasoRuta[] = [];
  pasoActualIndice = 0;
  nivelVisualizado = 1;
  menuAbierto = false;
  recorridoAutomaticoActivo = false;
  asistenteVozActivo = false;
  comandoVozActivo = false;
  estadoComandoVoz = '';

  private temporizadorRecorrido:
    ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.idiomaSeleccionado =
      this.idiomaService.idiomaActual;

    this.actualizarDatosMapa();
    void this.cargarMapaInicial();
  }

  ngOnDestroy(): void {
    this.detenerRecorridoAutomatico();
    this.asistenteVoz.detener();
  }

  get reconocimientoVozDisponible(): boolean {
    return this.asistenteVoz.reconocimientoDisponible;
  }

  get fotoDestinoSeleccionado(): FotoDestino | null {
    return FOTOS_DESTINOS[this.destino] ?? null;
  }

  fotoPuntoInteres(nodoId: string): FotoDestino | null {
    return FOTOS_DESTINOS[nodoId] ?? null;
  }

  get destinoSeleccionado(): Nodo | null {
    return this.lugares.find(lugar => lugar.id === this.destino) ?? null;
  }

  get mensajeFotoDestino(): string {
    return this.esUltimoPaso
      ? this.traducir('fotoDestinoLlegada')
      : this.traducir('fotoDestinoSeleccionado');
  }

  get origenId(): string | null {
    return this.origen || null;
  }

  get destinoId(): string | null {
    return this.destino || null;
  }

  get puntosInteresNivel(): Nodo[] {
    return this.lugares
      .filter(
        nodo =>
          nodo.nivel === this.nivelVisualizado &&
          ![
            'pasillo',
            'ascensor',
            'escalera',
            'rampa',
            'entrada'
          ].includes(nodo.tipo)
      )
      .sort(
        (primerLugar, segundoLugar) =>
          this.nombreNodo(primerLugar).localeCompare(
            this.nombreNodo(segundoLugar)
          )
      );
  }

  get pasoActual(): PasoRuta | null {
    return (
      this.pasosRuta[
        this.pasoActualIndice
      ] ?? null
    );
  }

  get instruccionActual(): string {
    const paso = this.pasoActual;

    if (!paso) {
      return '';
    }

    return this.obtenerInstruccionVisual(paso);
  }

  get instruccionVozActual(): string {
    const paso = this.pasoActual;

    if (!paso) {
      return '';
    }

    if (paso.tipo === 'inicio' || paso.tipo === 'llegada') {
      return this.traducirPaso(paso);
    }

    if (paso.tipo === 'cambio-nivel') {
      return `${this.traducir('ahora')}. ${this.traducirPaso(paso)}`;
    }

    const distanciaPaso = paso.desde
      ? this.rutaService.calcularDistanciaTotal([paso.desde, paso.nodo])
      : this.distanciaProximoTramo;
    const metros = Math.max(1, Math.round(distanciaPaso));
    const direccion = this.obtenerDireccionFisica(paso);

    if (direccion) {
      return [
        `${this.traducir('ahora')}.`,
        this.obtenerInstruccionVisual(paso),
        this.traducir('avanzaAproximadamente', { metros })
      ].join(' ');
    }

    return this.traducir(
      this.pasoActualIndice <= 1
        ? 'continuaAproximadamente'
        : 'luegoContinuaAproximadamente',
      {
        metros,
        nombre: this.nombreNodo(paso.nodo)
      }
    );
  }

  get vozDisponible(): boolean {
    return this.asistenteVoz.disponible;
  }

  get estadoAsistenteVoz(): string {
    if (!this.vozDisponible) {
      return this.traducir('asistenteVozNoDisponible');
    }

    return this.traducir(
      this.asistenteVozActivo
        ? 'asistenteVozActivo'
        : 'asistenteVozListo'
    );
  }

  get nodoActualId(): string | null {
    return (
      this.pasoActual?.nodo.id ??
      null
    );
  }

  get numeroPasoActual(): number {
    if (this.pasosRuta.length === 0) {
      return 0;
    }

    return this.pasoActualIndice + 1;
  }

  get totalPasos(): number {
    return this.pasosRuta.length;
  }

  get progresoRuta(): number {
    if (this.totalPasos === 0) {
      return 0;
    }

    return Math.round(
      (
        this.numeroPasoActual /
        this.totalPasos
      ) * 100
    );
  }

  get distanciaRestante(): number {
    if (
      this.rutaCalculada.length < 2 ||
      this.esUltimoPaso
    ) {
      return 0;
    }

    return this.rutaService.calcularDistanciaTotal(
      this.rutaCalculada.slice(
        this.pasoActualIndice
      )
    );
  }

  get distanciaProximoTramo(): number {
    const tramoSiguiente =
      this.rutaCalculada.slice(
        this.pasoActualIndice,
        this.pasoActualIndice + 2
      );

    if (tramoSiguiente.length < 2) {
      return 0;
    }

    return this.rutaService.calcularDistanciaTotal(
      tramoSiguiente
    );
  }

  get esPrimerPaso(): boolean {
    return this.pasoActualIndice === 0;
  }

  get esUltimoPaso(): boolean {
    return (
      this.totalPasos > 0 &&
      this.pasoActualIndice ===
        this.totalPasos - 1
    );
  }

  get instruccionesRuta(): string[] {
    return this.pasosRuta.map(
      paso =>
        this.traducirPaso(paso)
    );
  }

  traducir(
    clave: string,
    parametros: Record<
      string,
      string | number
    > = {}
  ): string {
    return this.idiomaService.traducir(
      clave,
      parametros
    );
  }

  formatearMetros(distancia: number): string {
    return new Intl.NumberFormat(
      this.idiomaSeleccionado === 'pt'
        ? 'pt-BR'
        : this.idiomaSeleccionado === 'en'
          ? 'en-US'
          : 'es-CL',
      {
        maximumFractionDigits: 1,
        minimumFractionDigits: 1
      }
    ).format(distancia);
  }

  nombreNodo(nodo: Nodo): string {
    return obtenerNombreNodo(
      nodo.id,
      this.idiomaSeleccionado,
      nodo.nombre
    );
  }

  cambiarIdioma(): void {
    this.idiomaService.establecerIdioma(
      this.idiomaSeleccionado
    );

    this.actualizarDatosMapa();
    this.mensajeUbicacion = '';

    if (this.rutaCalculada.length > 0) {
      this.actualizarResultadoRuta();
      this.anunciarInstruccionSiActiva();
      return;
    }

    this.resultado = '';
    this.distanciaTotal = null;
  }

  seleccionarIdioma(idioma: Idioma): void {
    this.idiomaSeleccionado = idioma;
    this.cambiarIdioma();
  }

  seleccionarPuntoInteres(punto: Nodo): void {
    this.destino = punto.id;
    this.nivelVisualizado = punto.nivel ?? 1;
    this.limpiarRuta();
  }

  seleccionarPuntoMapa(nodoId: string): void {
    const idDestino = this.modoAccesible &&
      nodoId === 'piscina-acceso-escalones-nivel-3'
      ? 'piscina-acceso-accesible-nivel-3'
      : nodoId;
    const destino = this.mapaService.obtenerNodoPorId(idDestino);

    if (!destino) {
      return;
    }

    this.destino = destino.id;
    this.nivelVisualizado = destino.nivel ?? this.nivelVisualizado;
    this.limpiarRuta();
  }

  mostrarNivelMapa(nivel: 1 | 3): void {
    this.nivelVisualizado = nivel;
  }

  alternarMenu(): void {
    this.menuAbierto = !this.menuAbierto;
  }

  cambiarSeleccionRuta(): void {
    this.limpiarRuta();
  }

  iniciarComandoVozRuta(): void {
    if (!this.reconocimientoVozDisponible) {
      this.estadoComandoVoz = this.traducir('reconocimientoVozNoDisponible');
      return;
    }

    this.estadoComandoVoz = this.traducir('escuchandoComandoRuta');
    this.comandoVozActivo = true;
    const inicioCorrecto = this.asistenteVoz.escucharComando(
      this.idiomaSeleccionado,
      frase => {
        this.procesarComandoVozRuta(frase);
        this.changeDetectorRef.markForCheck();
      },
      codigo => {
        this.manejarErrorComandoVoz(codigo);
        this.changeDetectorRef.markForCheck();
      },
      () => {
        this.comandoVozActivo = false;
        if (this.estadoComandoVoz === this.traducir('escuchandoComandoRuta')) {
          this.estadoComandoVoz = this.traducir('comandoVozSinResultado');
        }
        this.changeDetectorRef.markForCheck();
      }
    );

    if (!inicioCorrecto) {
      this.comandoVozActivo = false;
      this.estadoComandoVoz = this.traducir('errorIniciarMicrofono');
    }
  }

  detenerComandoVozRuta(): void {
    this.asistenteVoz.detenerReconocimiento();
    this.comandoVozActivo = false;
    this.estadoComandoVoz = this.traducir('comandoVozCancelado');
  }

  procesarComandoVozRuta(frase: string): void {
    const seleccion = this.interpretarComandoVoz(frase);

    if (!seleccion) {
      this.comandoVozActivo = false;
      this.estadoComandoVoz = this.traducir('formatoComandoVoz');
      return;
    }

    const destinoId = this.modoAccesible &&
      seleccion.destino.id === 'piscina-acceso-escalones-nivel-3'
      ? 'piscina-acceso-accesible-nivel-3'
      : seleccion.destino.id;
    const destino = this.mapaService.obtenerNodoPorId(destinoId) ?? seleccion.destino;
    this.origen = seleccion.origen.id;
    this.destino = destino.id;
    this.nivelVisualizado = destino.nivel ?? 1;
    this.comandoVozActivo = false;
    this.estadoComandoVoz = this.traducir('comandoVozDetectado', {
      origen: this.nombreNodo(seleccion.origen),
      destino: this.nombreNodo(destino)
    });
    this.calcularRuta();
  }

  async leerQrReal(): Promise<void> {
    this.mensajeUbicacion = '';

    try {
      const lectura =
        await CapacitorBarcodeScanner.scanBarcode({
          hint:
            CapacitorBarcodeScannerTypeHint.QR_CODE,
          cameraDirection:
            CapacitorBarcodeScannerCameraDirection.BACK,
          scanInstructions:
            this.traducir('apuntarCamara'),
          scanButton: true,
          scanText:
            this.traducir('escanear')
        });

      if (!lectura.ScanResult) {
        this.mensajeUbicacion =
          this.traducir(
            'lecturaCancelada'
          );
        return;
      }

      this.procesarLecturaQr(
        lectura.ScanResult
      );
    } catch (error) {
      console.error(
        'Error al leer el código QR:',
        error
      );

      this.mensajeUbicacion =
        this.traducir('errorCamara');
    }
  }

  simularLecturaQr(): void {
    this.mensajeUbicacion = '';

    const contenidoQr = JSON.stringify({
      sistema: 'navinside',
      version: 1,
      nodoId: 'entrada-nivel-4'
    });

    this.procesarLecturaQr(
      contenidoQr
    );
  }

  calcularRuta(): void {
    this.limpiarRuta();

    if (!this.mapaEsValido) {
      this.resultado =
        this.obtenerMensajeMapaInvalido();
      return;
    }

    if (!this.origen || !this.destino) {
      this.resultado =
        this.traducir(
          'seleccionarOrigenDestino'
        );
      return;
    }

    if (this.origen === this.destino) {
      this.resultado =
        this.traducir(
          'origenDestinoIguales'
        );
      return;
    }

    const nodoOrigen =
      this.mapaService.obtenerNodoPorId(
        this.origen
      );

    const nodoDestino =
      this.mapaService.obtenerNodoPorId(
        this.destino
      );

    if (!nodoOrigen || !nodoDestino) {
      this.resultado =
        this.traducir(
          'lugaresNoEncontrados'
        );
      return;
    }

    const ruta =
      this.rutaService.calcularRuta(
        nodoOrigen.id,
        nodoDestino.id,
        this.modoAccesible
      );

    if (ruta.length === 0) {
      this.resultado =
        this.modoAccesible
          ? this.traducir(
            'rutaAccesibleNoDisponible'
          )
          : this.traducir(
            'rutaNoDisponible'
          );
      return;
    }

    this.establecerRutaCalculada(ruta);
  }

  alternarAsistenteVoz(): void {
    if (!this.vozDisponible) {
      return;
    }

    if (this.asistenteVozActivo) {
      this.asistenteVozActivo = false;
      this.asistenteVoz.detener();

      if (this.recorridoAutomaticoActivo) {
        this.programarAvanceAutomatico(2800);
      }

      return;
    }

    this.asistenteVozActivo = true;
    this.limpiarTemporizadorRecorrido();
    this.anunciarInstruccionSiActiva();
  }

  repetirIndicacionVoz(): void {
    if (!this.pasoActual || !this.vozDisponible) {
      return;
    }

    this.anunciarInstruccionSiActiva(true);
  }

  iniciarRecorridoAutomatico(): void {
    if (
      this.pasosRuta.length === 0 ||
      this.esUltimoPaso ||
      this.recorridoAutomaticoActivo
    ) {
      return;
    }

    this.recorridoAutomaticoActivo = true;

    if (this.asistenteVozActivo) {
      this.anunciarInstruccionSiActiva(true);
      return;
    }

    this.programarAvanceAutomatico(3200);
  }

  detenerRecorridoAutomatico(): void {
    const estabaActivo = this.recorridoAutomaticoActivo;
    this.limpiarTemporizadorRecorrido();
    this.recorridoAutomaticoActivo = false;

    if (estabaActivo && this.asistenteVozActivo) {
      this.asistenteVoz.detener();
    }
  }

  avanzarPaso(): void {
    if (
      this.pasosRuta.length === 0 ||
      this.esUltimoPaso
    ) {
      return;
    }

    this.limpiarTemporizadorRecorrido();
    this.pasoActualIndice++;
    this.sincronizarPasoActual();
  }

  retrocederPaso(): void {
    if (
      this.pasosRuta.length === 0 ||
      this.esPrimerPaso
    ) {
      return;
    }

    this.limpiarTemporizadorRecorrido();
    this.pasoActualIndice--;
    this.sincronizarPasoActual();
  }

  reiniciarRecorrido(): void {
    if (this.pasosRuta.length === 0) {
      return;
    }

    this.limpiarTemporizadorRecorrido();
    this.pasoActualIndice = 0;
    this.sincronizarPasoActual();
  }

  cambiarModoAccesible(): void {
    this.limpiarRuta();
  }

  private sincronizarPasoActual(): void {
    const paso = this.pasoActual;

    if (!paso) {
      return;
    }

    this.nivelVisualizado =
      paso.nodo.nivel ?? 1;

    this.anunciarInstruccionSiActiva();
  }

  private anunciarInstruccionSiActiva(
    forzar = false
  ): void {
    if (
      (!this.asistenteVozActivo && !forzar) ||
      !this.pasoActual
    ) {
      return;
    }

    const inicioLectura =
      this.asistenteVoz.hablar(
        this.instruccionVozActual,
        this.idiomaSeleccionado,
        () => {
          if (this.recorridoAutomaticoActivo) {
            this.programarAvanceAutomatico(850);
          }
        }
      );

    if (!inicioLectura) {
      this.asistenteVozActivo = false;

      if (this.recorridoAutomaticoActivo) {
        this.programarAvanceAutomatico(3200);
      }
    }
  }

  private programarAvanceAutomatico(
    esperaMs: number
  ): void {
    this.limpiarTemporizadorRecorrido();

    this.temporizadorRecorrido = setTimeout(
      () => {
        this.temporizadorRecorrido = null;

        if (!this.recorridoAutomaticoActivo) {
          return;
        }

        if (this.esUltimoPaso) {
          this.detenerRecorridoAutomatico();
          this.changeDetectorRef.markForCheck();
          return;
        }

        this.avanzarPaso();
        this.changeDetectorRef.markForCheck();

        if (!this.asistenteVozActivo) {
          this.programarAvanceAutomatico(3200);
        }
      },
      esperaMs
    );
  }

  private limpiarTemporizadorRecorrido(): void {
    if (this.temporizadorRecorrido) {
      clearTimeout(this.temporizadorRecorrido);
    }

    this.temporizadorRecorrido = null;
  }

  private procesarLecturaQr(
    contenidoQr: string
  ): void {
    if (!this.mapaEsValido) {
      this.mensajeUbicacion =
        this.obtenerMensajeMapaInvalido();
      return;
    }

    const nodoDetectado =
      this.qrService.procesarCodigo(
        contenidoQr
      );

    if (!nodoDetectado) {
      this.mensajeUbicacion =
        this.traducir('qrInvalido');
      return;
    }

    const debeRecalcular =
      this.rutaCalculada.length > 0 &&
      this.destino !== '';

    this.origen = nodoDetectado.id;

    this.nivelVisualizado =
      nodoDetectado.nivel ?? 1;

    if (debeRecalcular) {
      this.recalcularRutaDesdeQr(
        nodoDetectado
      );
      return;
    }

    this.mensajeUbicacion =
      this.traducir(
        'ubicacionDetectada',
        {
          nombre:
            this.nombreNodo(
              nodoDetectado
            )
        }
      );
  }

  private recalcularRutaDesdeQr(
    nodoDetectado: Nodo
  ): void {
    const nodoDestino =
      this.mapaService.obtenerNodoPorId(
        this.destino
      );

    if (!nodoDestino) {
      this.limpiarRuta();

      this.mensajeUbicacion =
        this.traducir(
          'lugaresNoEncontrados'
        );
      return;
    }

    if (
      nodoDetectado.id ===
      nodoDestino.id
    ) {
      this.rutaCalculada = [
        nodoDetectado
      ];

      this.pasosRuta = [
        {
          orden: 1,
          tipo: 'llegada',
          nodo: nodoDetectado
        }
      ];

      this.pasoActualIndice = 0;
      this.distanciaTotal = 0;

      this.actualizarResultadoRuta();
      this.sincronizarPasoActual();

      this.mensajeUbicacion =
        this.traducir(
          'destinoAlcanzadoQr',
          {
            nombre:
              this.nombreNodo(
                nodoDetectado
              )
          }
        );

      return;
    }

    const nuevaRuta =
      this.rutaService.calcularRuta(
        nodoDetectado.id,
        nodoDestino.id,
        this.modoAccesible
      );

    if (nuevaRuta.length === 0) {
      this.limpiarRuta();

      this.nivelVisualizado =
        nodoDetectado.nivel ?? 1;

      this.mensajeUbicacion =
        this.modoAccesible
          ? this.traducir(
            'rutaAccesibleNoDisponible'
          )
          : this.traducir(
            'rutaNoDisponible'
          );

      return;
    }

    this.establecerRutaCalculada(nuevaRuta);

    this.mensajeUbicacion =
      this.traducir(
        'rutaRecalculada',
        {
          nombre:
            this.nombreNodo(
              nodoDetectado
            )
        }
      );
  }

  private establecerRutaCalculada(
    ruta: Nodo[]
  ): void {
    this.rutaCalculada = ruta;

    this.pasosRuta =
      this.rutaService.generarPasos(ruta);

    this.pasoActualIndice = 0;

    this.distanciaTotal =
      this.rutaService
        .calcularDistanciaTotal(ruta);

    this.sincronizarPasoActual();
    this.actualizarResultadoRuta();
  }

  private async cargarMapaInicial(): Promise<void> {
    const mapaCargado =
      await this.mapaService.cargarMapaDesdeSupabase();

    if (mapaCargado) {
      this.actualizarDatosMapa();
    }
  }

  private actualizarDatosMapa(): void {
    const mapaActivo =
      this.mapaService.obtenerMapaActivo();

    const conexionesNavegables =
      this.mapaService
        .obtenerConexionesNavegables();

    const validacion:
      ResultadoValidacionMapa =
      this.mapaValidadorService.validarMapa(
        mapaActivo.nodos,
        conexionesNavegables
      );

    this.mapaEsValido =
      validacion.valido;

    this.erroresMapa =
      validacion.errores;

    this.advertenciasMapa =
      validacion.advertencias;

    this.lugares =
      mapaActivo.nodos
        .filter(
          nodo =>
            nodo.restringido !== true
        );

    this.conexionesMapa =
      conexionesNavegables;

    this.nodosMapa =
      this.lugares.map(
        nodo => ({
          ...nodo,
          nombre:
            this.nombreNodo(nodo)
        })
      );

    this.lugaresReferencia =
      this.mapaService
        .obtenerLugaresPreliminares();
  }

  private obtenerMensajeMapaInvalido(): string {
    const cantidadErrores =
      this.erroresMapa.length;

    return this.texto(
      `No se pueden calcular rutas: el mapa tiene ${cantidadErrores} error(es) de configuración.`,
      `Routes cannot be calculated: the map has ${cantidadErrores} configuration error(s).`,
      `Não é possível calcular rotas: o mapa possui ${cantidadErrores} erro(s) de configuração.`
    );
  }

  private actualizarResultadoRuta(): void {
    this.resultado =
      this.rutaCalculada
        .map(
          nodo =>
            this.nombreNodo(nodo)
        )
        .join(' → ');
  }

  private obtenerInstruccionVisual(
    paso: PasoRuta
  ): string {
    const textoBase = this.traducirPaso(paso);

    if (paso.tipo !== 'avance') {
      return textoBase;
    }

    const direccion = this.obtenerDireccionFisica(paso);
    const accesoEspecial =
      this.obtenerInstruccionAccesoEspecial(paso.nodo.id);

    return [
      direccion
        ? this.traducir(direccion, {
          nombre: this.nombreNodo(paso.nodo)
        })
        : textoBase,
      accesoEspecial
    ]
      .filter(Boolean)
      .join(' ');
  }

  private obtenerDireccionFisica(
    paso: PasoRuta
  ): string | null {
    const origenId = paso.desde?.id;
    const destinoId = paso.nodo.id;

    if (origenId === 'ascensor-central-nivel-1') {
      if (destinoId === 'zona-juego-adulto-nivel-1') {
        return 'giraDerechaHacia';
      }

      if (
        [
          'zona-kid-nivel-1',
          'zona-play-nivel-1',
          'mini-market-proa-nivel-1',
          'hall-nivel-1'
        ].includes(destinoId)
      ) {
        return 'giraIzquierdaHacia';
      }
    }

    if (
      origenId === 'hall-nivel-1' &&
      [
        'salon-eventos-terramar-nivel-1',
        'gimnasio-nivel-1',
        'alma-spa-nivel-1',
        'salon-eventos-montemar-nivel-1',
        'ascensor-habitaciones-nivel-1'
      ].includes(destinoId)
    ) {
      return 'desdeHallDerechaHacia';
    }

    if (
      (origenId === 'zona-kid-nivel-1' &&
        destinoId === 'zona-play-nivel-1') ||
      (origenId === 'zona-play-nivel-1' &&
        destinoId === 'mini-market-proa-nivel-1')
    ) {
      return 'continuaRectoHacia';
    }

    return null;
  }

  private obtenerInstruccionAccesoEspecial(
    destinoId: string
  ): string {
    if (destinoId === 'gimnasio-nivel-1') {
      return this.traducir('accesoGimnasioEscaleras');
    }

    if (destinoId === 'zona-juego-adulto-nivel-1') {
      return this.traducir('accesoJuegosAdultosEscaleras');
    }

    return '';
  }

  private traducirPaso(
    paso: PasoRuta
  ): string {
    const nombre =
      this.nombreNodo(paso.nodo);

    if (paso.tipo === 'inicio') {
      return this.traducir(
        'inicioRuta',
        { nombre }
      );
    }

    if (paso.tipo === 'llegada') {
      return this.traducir(
        'llegadaRuta',
        { nombre }
      );
    }

    if (paso.tipo === 'avance') {
      return this.traducir(
        'continuarHacia',
        { nombre }
      );
    }

    const nivel =
      paso.nodo.nivel ?? '';

    if (paso.medio === 'ascensor') {
      return this.traducir(
        paso.direccionNivel === 'subir'
          ? 'subirAscensor'
          : 'bajarAscensor',
        { nivel }
      );
    }

    if (paso.medio === 'escalera') {
      return this.traducir(
        paso.direccionNivel === 'subir'
          ? 'subirEscalera'
          : 'bajarEscalera',
        { nivel }
      );
    }

    if (paso.medio === 'rampa') {
      return this.traducir(
        paso.direccionNivel === 'subir'
          ? 'subirRampa'
          : 'bajarRampa',
        { nivel }
      );
    }

    return this.traducir(
      paso.direccionNivel === 'subir'
        ? 'cambiarNivelSubir'
        : 'cambiarNivelBajar',
      {
        nivel,
        nombre
      }
    );
  }

  private texto(
    espanol: string,
    ingles: string,
    portugues: string
  ): string {
    if (this.idiomaSeleccionado === 'en') {
      return ingles;
    }

    if (this.idiomaSeleccionado === 'pt') {
      return portugues;
    }

    return espanol;
  }

  private limpiarRuta(): void {
    this.detenerRecorridoAutomatico();
    this.asistenteVoz.detener();
    this.comandoVozActivo = false;
    this.resultado = '';
    this.distanciaTotal = null;
    this.rutaCalculada = [];
    this.pasosRuta = [];
    this.pasoActualIndice = 0;
  }

  private interpretarComandoVoz(
    frase: string
  ): { origen: Nodo; destino: Nodo } | null {
    const texto = this.normalizarTexto(frase);
    const patrones: RegExp[] = this.idiomaSeleccionado === 'en'
      ? [/\bfrom\s+(.+?)\s+to\s+(.+)$/]
      : this.idiomaSeleccionado === 'pt'
        ? [/\b(?:de|do|da)\s+(.+?)\s+(?:ate|para)\s+(.+)$/]
        : [/\bdesde\s+(.+?)\s+hasta\s+(.+)$/, /\bde\s+(.+?)\s+a\s+(.+)$/];
    let partes: RegExpMatchArray | null = null;

    for (const patron of patrones) {
      partes = texto.match(patron);
      if (partes) break;
    }

    if (!partes) {
      partes = texto.match(/\borigen\s+(.+?)\s+destino\s+(.+)$/);
    }

    if (!partes) {
      return null;
    }

    const origen = this.buscarLugarEnFrase(partes[1]);
    const destino = this.buscarLugarEnFrase(partes[2]);

    return origen && destino && origen.id !== destino.id
      ? { origen, destino }
      : null;
  }

  private buscarLugarEnFrase(fragmento: string): Nodo | null {
    const texto = this.normalizarTexto(fragmento)
      .replace(/^(?:el|la|los|las|al|a|o|os|as)\s+/, '');
    const coincidencias = this.lugares
      .filter(lugar => lugar.restringido !== true)
      .map(lugar => ({
        lugar,
        nombres: [
          this.nombreNodo(lugar),
          lugar.nombre,
          ...this.aliasVozNodo(lugar.id)
        ].map(nombre => this.normalizarTexto(nombre))
      }))
      .flatMap(item => item.nombres
        .filter(nombre => nombre.length > 2 && texto.includes(nombre))
        .map(nombre => ({ ...item, nombre }))
      )
      .sort((a, b) => b.nombre.length - a.nombre.length);

    return coincidencias[0]?.lugar ?? null;
  }

  private aliasVozNodo(nodoId: string): string[] {
    const alias: Record<string, string[]> = {
      'ascensor-central-nivel-1': ['ascensor principal', 'ascensores principales', 'ascensor central'],
      'ascensor-central-nivel-3': ['ascensor principal nivel 3', 'ascensor nivel 3', 'salida del ascensor'],
      'ascensor-habitaciones-nivel-1': ['ascensor de habitaciones', 'ascensores habitaciones', 'elevadores de habitaciones'],
      'mini-market-proa-nivel-1': ['minimarket', 'mini market', 'proa'],
      'zona-kid-nivel-1': ['mini club', 'miniclub', 'kids'],
      'zona-juego-adulto-nivel-1': ['juegos adultos', 'sala de juegos adultos'],
      'salon-eventos-montemar-nivel-1': ['montemar', 'salon montemar'],
      'salon-eventos-terramar-nivel-1': ['terramar', 'salon terramar'],
      'restaurant-faro-nivel-3': ['faro', 'restaurante faro'],
      'piscina-acceso-escalones-nivel-3': ['piscina exterior', 'piscina por escalones'],
      'piscina-acceso-accesible-nivel-3': ['piscina exterior', 'piscina accesible', 'piscina por rampa'],
      'canchas-tenis-nivel-3': ['tenis', 'cancha de tenis']
    };

    return alias[nodoId] ?? [];
  }

  private normalizarTexto(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private manejarErrorComandoVoz(codigo: string): void {
    const clave = codigo === 'not-allowed' ||
      codigo === 'service-not-allowed' ||
      codigo === 'audio-capture'
      ? 'permisoMicrofonoDenegado'
      : codigo === 'no-speech'
        ? 'comandoVozSinResultado'
        : 'errorReconocimientoVoz';
    this.comandoVozActivo = false;
    this.estadoComandoVoz = this.traducir(clave);
  }
}
