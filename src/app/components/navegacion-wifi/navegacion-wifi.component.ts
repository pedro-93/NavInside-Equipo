import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  Input,
  OnChanges,
  OnDestroy
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { Conexion, Nodo } from '../../models/nodo.model';
import { MapaRadioService } from '../../services/mapa-radio.service';
import {
  EstadoNavegacionWifi,
  NavegacionWifiService
} from '../../services/navegacion-wifi.service';

type Idioma = 'es' | 'en' | 'pt';

@Component({
  selector: 'app-navegacion-wifi',
  standalone: true,
  templateUrl: './navegacion-wifi.component.html',
  styleUrls: ['./navegacion-wifi.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe]
})
export class NavegacionWifiComponent implements OnChanges, OnDestroy {
  private readonly servicio = inject(NavegacionWifiService);
  private readonly mapaRadio = inject(MapaRadioService);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly suscripcion: Subscription;
  private temporizadorPunto: ReturnType<typeof setTimeout> | null = null;
  private relojLevantamiento: ReturnType<typeof setInterval> | null = null;

  @Input() nivel = 1;
  @Input() nodos: Nodo[] = [];
  @Input() conexiones: Conexion[] = [];
  @Input() ruta: Nodo[] = [];
  @Input() origenId: string | null = null;
  @Input() idioma: Idioma = 'es';

  estado: EstadoNavegacionWifi;
  tramoSeleccionado = '';
  nodoSeleccionado = '';
  mensaje = '';
  exportado = '';
  textoImportar = '';
  segundosLevantamiento = 0;
  levantamientoAbierto = false;
  private inicioActiva = 0;

  constructor() {
    this.estado = this.servicio.obtenerEstado();
    this.suscripcion = this.servicio.estado$.subscribe(e => {
      this.estado = e;
      this.cd.markForCheck();
    });
  }

  ngOnChanges(): void {
    this.servicio.configurar(this.nivel, this.nodos, this.conexiones, this.ruta, this.origenId);
  }

  ngOnDestroy(): void {
    this.suscripcion.unsubscribe();
    this.limpiarTemporizadores();
  }

  t(es: string, en: string, pt: string): string {
    return this.idioma === 'en' ? en : this.idioma === 'pt' ? pt : es;
  }

  nombre(id: string): string {
    return this.nodos.find(n => n.id === id)?.nombre ?? id;
  }

  get tramos() {
    return this.servicio.tramosNivel();
  }

  get nodosNivel(): Nodo[] {
    return this.nodos.filter(n => n.nivel === this.nivel && !n.restringido);
  }

  get resumen() {
    return this.mapaRadio.resumen(this.nivel);
  }

  get textoPosicion(): string {
    const e = this.estado.estimacion;
    if (!this.estado.activa) return this.t('Inactiva', 'Off', 'Inativa');
    if (!e) return this.t('Buscando señales…', 'Looking for signals…', 'Procurando sinais…');
    const lugar = e.fraccion < 0.2
      ? this.t('cerca de', 'near', 'perto de') + ' ' + this.nombre(e.origenId)
      : e.fraccion > 0.8
        ? this.t('cerca de', 'near', 'perto de') + ' ' + this.nombre(e.destinoId)
        : this.t('entre', 'between', 'entre') + ' ' + this.nombre(e.origenId) + ' ' + this.t('y', 'and', 'e') + ' ' + this.nombre(e.destinoId);
    const estado = this.estado.firme
      ? ''
      : ' · ' + this.t('aún sin confirmar', 'not confirmed yet', 'ainda sem confirmar');
    return `${lugar} · ±${Math.round(e.incertidumbreMetros)} m · ${Math.round(e.confianza * 100)} %${estado}`;
  }

  get segundosEscaneo(): number {
    return Math.floor(this.estado.diagnostico.intervaloEscaneoMs / 1000);
  }

  get movimiento(): string {
    const v = Math.abs(this.estado.estimacion?.velocidad ?? 0);
    return v < 0.25
      ? this.t('detenido', 'stopped', 'parado')
      : `${v.toFixed(1)} m/s`;
  }

  get avisos(): string[] {
    const d = this.estado.diagnostico;
    const avisos: string[] = [];

    if (!this.estado.disponible) {
      avisos.push(this.t(
        'Solo funciona en la app Android: el navegador no puede leer el Wi-Fi.',
        'Only works in the Android app: browsers cannot read Wi-Fi.',
        'Funciona apenas no app Android: o navegador não lê o Wi-Fi.'
      ));
      return avisos;
    }

    if (this.estado.activa && !d.acelerometro && Date.now() - this.inicioActiva > 6000) {
      avisos.push(this.t(
        'No llegan datos del acelerómetro: el cursor solo se corregirá con cada escaneo Wi-Fi (cada ~30 s).',
        'No accelerometer data: the cursor will only be corrected at each Wi-Fi scan (every ~30 s).',
        'Sem dados do acelerômetro: o cursor só será corrigido a cada varredura Wi-Fi (~30 s).'
      ));
    }

    if (d.capacidades?.locationEnabled === false) {
      avisos.push(this.t('Activa la ubicación del teléfono.', 'Turn on device location.', 'Ative a localização do telefone.'));
    }

    if (d.aristas && d.aristasConDatos < d.aristas / 2) {
      avisos.push(this.t(
        `Mapa de radio incompleto: ${d.aristasConDatos} de ${d.aristas} pasillos recorridos. Por ahora solo hay huellas en algunos puntos; recorre los pasillos en «Levantamiento».`,
        `Incomplete radio map: ${d.aristasConDatos} of ${d.aristas} corridors surveyed. For now there are only fingerprints at a few points; walk the corridors under “Survey”.`,
        `Mapa de rádio incompleto: ${d.aristasConDatos} de ${d.aristas} corredores percorridos. Por enquanto há impressões só em alguns pontos; percorra os corredores em «Levantamento».`
      ));
    }

    return avisos;
  }

  async alternar(): Promise<void> {
    if (this.estado.activa) {
      await this.servicio.detener();
      return;
    }
    this.inicioActiva = Date.now();
    const ok = await this.servicio.iniciar();
    if (!ok) {
      this.mensaje = this.t(
        'No se pudo iniciar: revisa que estés en la app Android y que el nivel tenga pasillos.',
        'Could not start: check you are in the Android app and the level has corridors.',
        'Não foi possível iniciar: verifique o app Android e os corredores do nível.'
      );
    }
  }

  async empezarTramo(invertido: boolean): Promise<void> {
    const [a, b] = this.tramoSeleccionado.split('|');
    if (!a || !b) return;
    const [origen, destino] = invertido ? [b, a] : [a, b];
    if (await this.servicio.iniciarLevantamientoTramo(origen, destino)) {
      this.iniciarReloj();
      this.mensaje = this.t(
        `Grabando. Camina a ritmo constante, por el centro del pasillo, hasta ${this.nombre(destino)} y pulsa «Llegué».`,
        `Recording. Walk at a steady pace, along the middle of the corridor, to ${this.nombre(destino)} and press “Arrived”.`,
        `Gravando. Caminhe em ritmo constante, pelo centro do corredor, até ${this.nombre(destino)} e toque «Cheguei».`
      );
    }
  }

  async capturarPunto(): Promise<void> {
    if (!this.nodoSeleccionado) return;
    if (await this.servicio.iniciarCapturaPunto(this.nodoSeleccionado)) {
      this.iniciarReloj();
      this.mensaje = this.t(
        'Grabando 20 s: quédate en el punto y gira lentamente una vuelta completa.',
        'Recording 20 s: stay on the spot and slowly turn a full circle.',
        'Gravando 20 s: fique no ponto e gire lentamente uma volta completa.'
      );
      this.temporizadorPunto = setTimeout(() => void this.terminar(), 20000);
    }
  }

  async terminar(): Promise<void> {
    this.limpiarTemporizadores();
    const n = await this.servicio.finalizarLevantamiento();
    this.mensaje = n
      ? this.t(`Guardadas ${n} muestras.`, `Saved ${n} samples.`, `Salvas ${n} amostras.`)
      : this.t('No se guardaron muestras: no llegaron lecturas Wi-Fi.', 'No samples saved: no Wi-Fi readings arrived.', 'Nenhuma amostra salva: não chegaram leituras Wi-Fi.');
    this.cd.markForCheck();
  }

  async cancelar(): Promise<void> {
    this.limpiarTemporizadores();
    await this.servicio.cancelarLevantamiento();
    this.mensaje = this.t('Levantamiento cancelado.', 'Survey cancelled.', 'Levantamento cancelado.');
  }

  borrarTramo(): void {
    const [a, b] = this.tramoSeleccionado.split('|');
    if (!a || !b) return;
    const n = this.mapaRadio.borrarTramo(this.nivel, a, b);
    this.mensaje = this.t(`Borradas ${n} muestras de este teléfono.`, `Deleted ${n} samples from this phone.`, `Apagadas ${n} amostras deste telefone.`);
  }

  async exportar(): Promise<void> {
    this.exportado = this.mapaRadio.exportar();
    try {
      await navigator.clipboard.writeText(this.exportado);
      this.mensaje = this.t('Mapa de radio copiado al portapapeles.', 'Radio map copied to clipboard.', 'Mapa de rádio copiado.');
    } catch {
      this.mensaje = this.t('Copia el texto del cuadro.', 'Copy the text from the box.', 'Copie o texto da caixa.');
    }
    try {
      const enlace = document.createElement('a');
      enlace.href = URL.createObjectURL(new Blob([this.exportado], { type: 'application/json' }));
      enlace.download = 'mapa-radio.json';
      enlace.click();
      setTimeout(() => URL.revokeObjectURL(enlace.href), 5000);
    } catch {
    }
    this.cd.markForCheck();
  }

  importarTexto(): void {
    const n = this.mapaRadio.importar(this.textoImportar);
    this.mensaje = n
      ? this.t(`Importadas ${n} muestras.`, `Imported ${n} samples.`, `Importadas ${n} amostras.`)
      : this.t('El texto no es un mapa de radio válido.', 'The text is not a valid radio map.', 'O texto não é um mapa de rádio válido.');
    if (n) this.textoImportar = '';
  }

  async importarArchivo(evento: Event): Promise<void> {
    const archivo = (evento.target as HTMLInputElement).files?.[0];
    if (!archivo) return;
    this.textoImportar = await archivo.text();
    this.importarTexto();
    this.cd.markForCheck();
  }

  alEscribirImportar(evento: Event): void {
    this.textoImportar = (evento.target as HTMLTextAreaElement).value;
  }

  alAlternarLevantamiento(evento: Event): void {
    this.levantamientoAbierto = (evento.target as HTMLDetailsElement).open;
    this.cd.markForCheck();
  }

  seleccionarTramo(evento: Event): void {
    this.tramoSeleccionado = (evento.target as HTMLSelectElement).value;
  }

  seleccionarNodo(evento: Event): void {
    this.nodoSeleccionado = (evento.target as HTMLSelectElement).value;
  }

  private iniciarReloj(): void {
    this.segundosLevantamiento = 0;
    this.relojLevantamiento = setInterval(() => {
      ++this.segundosLevantamiento;
      this.cd.markForCheck();
    }, 1000);
  }

  private limpiarTemporizadores(): void {
    if (this.temporizadorPunto) clearTimeout(this.temporizadorPunto);
    if (this.relojLevantamiento) clearInterval(this.relojLevantamiento);
    this.temporizadorPunto = null;
    this.relojLevantamiento = null;
  }
}
