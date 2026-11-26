import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DoCheck, ElementRef, HostListener, inject, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import type { HomePage, PuntoPlanoLista } from '../../home/home.page';
import { Nodo } from '../../models/nodo.model';
import { buscarLugares } from '../../data/busqueda-puntos';
import { CATALOGO_TOUR, COLECCION_ALMA_SPA, IMAGENES_TOUR, TOUR_HIPPOCAMPUS } from '../../data/catalogo-tour.data';
import { TourRutaComponent } from '../tour-ruta/tour-ruta.component';

type Campo = 'origen' | 'destino';
type Hoja = 'cerrada' | 'abierta';
type Panel = 'explora' | 'tour' | null;

interface EscenaTour {
  id: string;
  nombre: string;
  miniatura: string | null;
  enlace: string;
  nivel: number | null;
}

@Component({
  selector: 'app-vista-waze',
  standalone: true,
  templateUrl: './vista-waze.component.html',
  styleUrls: ['./vista-waze.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TourRutaComponent]
})
export class VistaWazeComponent implements OnInit, OnDestroy, DoCheck {
  private readonly cd = inject(ChangeDetectorRef);
  @Input({ required: true }) app!: HomePage;
  @ViewChild('campoBusqueda') private campoBusqueda?: ElementRef<HTMLInputElement>;

altura = 0;
  arrastrando = false;
  private arrastre: { y: number; altura: number; movio: boolean } | null = null;
  private rutaPrevia = false;

  private get alturas(): { minima: number; cerrada: number; abierta: number } {
    const alto = typeof window !== 'undefined' ? window.innerHeight : 800;
    return {
      minima: 132,
      cerrada: this.enRuta ? Math.min(270, Math.round(alto * 0.4)) : Math.min(380, Math.round(alto * 0.48)),
      abierta: Math.round(alto * 0.88)
    };
  }

  get hoja(): Hoja {
    const a = this.alturas;
    return this.altura >= (a.cerrada + a.abierta) / 2 ? 'abierta' : 'cerrada';
  }

  set hoja(valor: Hoja) {
    this.ajustarHoja(valor);
  }

  ajustarHoja(nivel: 'minima' | 'cerrada' | 'abierta'): void {
    this.fijarAltura(this.alturas[nivel]);
  }

  private fijarAltura(px: number): void {
    const a = this.alturas;
    this.altura = Math.round(Math.max(a.minima - 30, Math.min(a.abierta, px)));
    document.documentElement.style.setProperty('--waze-hoja', `${Math.min(this.altura, a.cerrada)}px`);
  }

  inicioArrastre(evento: PointerEvent): void {
    this.arrastre = { y: evento.clientY, altura: this.altura, movio: false };
    this.arrastrando = true;
    (evento.target as Element).setPointerCapture?.(evento.pointerId);
  }

  moverArrastre(evento: PointerEvent): void {
    if (!this.arrastre) return;
    const delta = this.arrastre.y - evento.clientY;
    if (Math.abs(delta) > 4) this.arrastre.movio = true;
    if (this.arrastre.movio) this.fijarAltura(this.arrastre.altura + delta);
  }

  finArrastre(evento: PointerEvent): void {
    if (!this.arrastre) return;
    const { movio, y } = this.arrastre;
    this.arrastre = null;
    this.arrastrando = false;
    const a = this.alturas;

    if (!movio) {
      this.ajustarHoja(this.hoja === 'abierta' ? 'cerrada' : 'abierta');
      return;
    }
    const sube = y - evento.clientY > 0;
    const objetivos = (['minima', 'cerrada', 'abierta'] as const).map(n => ({ n, d: Math.abs(a[n] - this.altura) }));
    let destino = objetivos.sort((p, q) => p.d - q.d)[0].n;
    if (destino === 'cerrada' && Math.abs(this.altura - a.cerrada) > 40) destino = sube ? 'abierta' : 'minima';
    this.ajustarHoja(destino);
  }

  @HostListener('window:resize')
  alCambiarTamano(): void {
    this.ajustarHoja(this.hoja === 'abierta' ? 'abierta' : 'cerrada');
  }
  campo: Campo = 'destino';
  consulta = '';
  escuchando = false;
  estadoVoz = '';
  menuAbierto = false;
  planosAbiertos = false;
  panel: Panel = null;
  nivelExplora = 1;
  seleccionExplora: string | null = null;
  fotosParada = false;

  readonly niveles = [1, 3, 4, 5, 6] as const;

  ngDoCheck(): void {
    if (this.enRuta !== this.rutaPrevia) {
      this.rutaPrevia = this.enRuta;
      this.ajustarHoja('cerrada');
    }
    this.cd.markForCheck();
  }

  ngOnInit(): void {
    this.rutaPrevia = this.enRuta;
    this.ajustarHoja('cerrada');
  }

  ngOnDestroy(): void {
    document.documentElement.style.removeProperty('--waze-hoja');
    if (this.escuchando) this.app.detenerVozBusqueda();
  }

  t(es: string, en: string, pt: string): string {
    return this.app.texto(es, en, pt);
  }

  nombreNivel(nivel: number | null | undefined): string {
    if (nivel === 6) return this.t('Piso 6', 'Floor 6', 'Andar 6');
    return `${this.t('Nivel', 'Level', 'Nível')} ${nivel ?? '—'}`;
  }

get enRuta(): boolean {
    return this.app.rutaCalculada.length > 1;
  }

  get nodoOrigen(): Nodo | null {
    return this.app.lugares.find(n => n.id === this.app.origen) ?? null;
  }

  get nodoDestino(): Nodo | null {
    return this.app.lugares.find(n => n.id === this.app.destino) ?? null;
  }

  nombre(nodo: Nodo | null): string {
    return nodo ? this.app.nombreNodo(nodo) : '';
  }

  foto(nodo: Nodo): string | null {
    return this.app.fotoPuntoInteres(nodo.id)?.src ?? this.app.fotoDesdePlano(nodo.id);
  }

  abrirPuntoPlano(punto: PuntoPlanoLista): void {
    this.app.abrirPuntoPlano(punto);
    if (punto.canonical && !this.app.origen) {
      this.campo = 'origen';
      this.estadoVoz = `${this.t('Destino', 'Destination', 'Destino')}: ${punto.name}. ` +
        this.t('¿Desde dónde sales? Toca «Origen».', 'Where are you starting from? Tap “Origin”.', 'De onde você sai? Toque «Origem».');
    }
  }

  get lugares(): Nodo[] {
    return [...this.app.lugares]
      .filter(n => !n.restringido && n.id !== this.otroCampoId)
      .sort((a, b) => (a.nivel ?? 0) - (b.nivel ?? 0) || this.app.nombreNodo(a).localeCompare(this.app.nombreNodo(b)));
  }

  private get otroCampoId(): string {
    return this.campo === 'origen' ? this.app.destino : this.app.origen;
  }

  get resultados(): { nivel: number | null; items: Nodo[] }[] {
    const encontrados = buscarLugares(this.consulta, this.lugares, n => [this.app.nombreNodo(n), n.nombre]);
    const lista = encontrados.map(r => r.item);
    if (this.consulta.trim()) return lista.length ? [{ nivel: null, items: lista }] : [];
    const grupos = new Map<number | null, Nodo[]>();
    for (const n of lista) grupos.set(n.nivel ?? null, [...(grupos.get(n.nivel ?? null) ?? []), n]);
    return [...grupos].map(([nivel, items]) => ({ nivel, items }));
  }

  get textoDistancia(): string {
    return this.app.textoDistanciaRuta(this.app.distanciaTotal, this.app.metrajeRuta(0));
  }

  get textoRestante(): string {
    return this.app.textoDistanciaRuta(this.app.distanciaRestante, this.app.metrajeRuta(this.app.pasoActualIndice));
  }

abrirBusqueda(campo: Campo = 'destino'): void {
    this.campo = campo;
    this.hoja = 'abierta';
    this.consulta = '';
    this.estadoVoz = '';
    setTimeout(() => this.campoBusqueda?.nativeElement.focus(), 60);
  }

escribir(evento: Event): void {
    this.consulta = (evento.target as HTMLInputElement).value;
    if (this.hoja !== 'abierta') this.hoja = 'abierta';
  }

  seleccionar(nodo: Nodo): void {
    const campo = this.campo;
    this.app.elegirPuntoRuta(campo, nodo.id);
    this.consulta = '';

    if (campo === 'destino' && !this.app.origen) {
      this.campo = 'origen';
      this.estadoVoz = this.t('¿Desde dónde sales? Elige tu origen o usa «Aquí estoy».',
        'Where are you starting from? Choose your origin or use “I am here”.',
        'De onde você sai? Escolha a origem ou use «Estou aqui».');
      return;
    }
    if (campo === 'origen' && !this.app.destino) {
      this.campo = 'destino';
      this.estadoVoz = this.t('¿Adónde vas?', 'Where to?', 'Para onde vai?');
      return;
    }
    this.estadoVoz = '';
    this.hoja = 'cerrada';
  }

  elegirPuntoTira(nodo: Nodo): void {
    this.campo = 'destino';
    this.app.elegirPuntoRuta('destino', nodo.id);
    if (!this.app.origen) {
      this.campo = 'origen';
      this.estadoVoz = `${this.t('Destino', 'Destination', 'Destino')}: ${this.app.nombreNodo(nodo)}. ` +
        this.t('¿Desde dónde sales? Toca «Origen».', 'Where are you starting from? Tap “Origin”.', 'De onde você sai? Toque «Origem».');
    } else {
      this.estadoVoz = '';
    }
  }

  intercambiar(): void {
    this.app.intercambiarOrigenDestino();
  }

  alternarVoz(): void {
    if (this.escuchando) {
      this.app.detenerVozBusqueda();
      this.escuchando = false;
      this.estadoVoz = '';
      return;
    }
    if (this.hoja !== 'abierta') this.abrirBusqueda(this.campo);

    const inicio = this.app.escucharVozBusqueda(
      frase => {
        this.escuchando = false;
        this.consulta = frase;
        const lugar = this.app.lugarEnFrase(frase);
        if (lugar && lugar.id !== this.otroCampoId) {
          this.estadoVoz = `${this.t('Elegido', 'Selected', 'Escolhido')}: ${this.app.nombreNodo(lugar)}`;
          this.seleccionar(lugar);
        } else {
          this.estadoVoz = this.resultados.length
            ? this.t(`Lugares parecidos a «${frase}»`, `Places similar to “${frase}”`, `Lugares parecidos com «${frase}»`)
            : this.t(`No encontré «${frase}». Prueba otra vez o elige de la lista.`,
              `I couldn't find “${frase}”. Try again or pick from the list.`,
              `Não encontrei «${frase}». Tente de novo ou escolha na lista.`);
        }
      },
      error => {
        if (!this.escuchando) return;
        this.escuchando = false;
        this.estadoVoz = error
          ? this.t('No se pudo usar el micrófono.', 'The microphone could not be used.', 'Não foi possível usar o microfone.')
          : this.t('No escuché un lugar. Intenta de nuevo.', 'I did not hear a place. Try again.', 'Não ouvi um lugar. Tente de novo.');
      }
    );

    if (inicio) {
      this.escuchando = true;
      this.estadoVoz = this.campo === 'origen'
        ? this.t('Escuchando… di dónde estás', 'Listening… say where you are', 'Ouvindo… diga onde você está')
        : this.t('Escuchando… di adónde vas', 'Listening… say where you are going', 'Ouvindo… diga para onde vai');
    } else {
      this.estadoVoz = this.t('El reconocimiento de voz no está disponible.', 'Voice recognition is not available.', 'O reconhecimento de voz não está disponível.');
    }
  }

  aquiEstoy(): void {
    this.app.aquiEstoy();
    this.app.abrirVistaClasica('ubicacion-actual');
  }

  verPlano(nivel: 1 | 3 | 4 | 5 | 6 | 'resort'): void {
    if (nivel === 'resort') this.app.mostrarVistaResortCompleto();
    else this.app.mostrarNivelMapa(nivel);
    this.planosAbiertos = false;
  }

  menu(accion: () => void): void {
    this.menuAbierto = false;
    accion();
  }

  async seguirmeWifi(): Promise<void> {
    if (this.app.estadoWifi?.activa) {
      await this.app.detenerWifi();
      return;
    }
    if (!(await this.app.seguirmeConWifi())) {
      this.app.abrirVistaClasica('navegacion-wifi');
    }
  }

pidiendoPin = false;
  errorPin = false;
  private toques: number[] = [];

  toqueLogo(): void {
    const ahora = Date.now();
    this.toques = [...this.toques.filter(t => ahora - t < 3000), ahora];
    if (this.toques.length >= 5) {
      this.toques = [];
      this.pidiendoPin = !this.app.admin.activo;
      this.errorPin = false;
    }
  }

  async entrarAdmin(pin: string): Promise<void> {
    const ok = await this.app.admin.activar(pin);
    this.errorPin = !ok;
    if (ok) this.pidiendoPin = false;
  }

abrirExplora(): void {
    this.nivelExplora = this.app.nivelVisualizado;
    this.seleccionExplora = null;
    this.panel = 'explora';
  }

  get lugaresExplora(): Nodo[] {
    return this.app.lugares
      .filter(n => n.nivel === this.nivelExplora && !n.restringido)
      .sort((a, b) => Number(!!this.foto(b)) - Number(!!this.foto(a)) || this.app.nombreNodo(a).localeCompare(this.app.nombreNodo(b)));
  }

  verEnMapa(nodo: Nodo): void {
    this.panel = null;
    if (nodo.nivel && [1, 3, 4, 5, 6].includes(nodo.nivel)) this.app.mostrarNivelMapa(nodo.nivel as 1 | 3 | 4 | 5 | 6);
    this.app.seleccionarPuntoMapa(nodo.id);
  }

  irA(nodo: Nodo): void {
    this.panel = null;
    this.campo = 'destino';
    this.hoja = 'abierta';
    this.seleccionar(nodo);
  }

readonly enlaceTour = TOUR_HIPPOCAMPUS;

  get escenasTour(): EscenaTour[] {
    const vistas = new Set<string>();
    return Object.entries(CATALOGO_TOUR).flatMap(([id, escena]) => {
      if (vistas.has(escena.escenaId)) return [];
      vistas.add(escena.escenaId);
      const nodo = this.app.lugares.find(n => n.id === id);
      const coleccion = nodo?.nivel === 6 ? `shortId=${COLECCION_ALMA_SPA}&` : '';
      const nombreLugar = escena.nombreLugar?.[this.app.idiomaSeleccionado];
      return [{
        id,
        nombre: nombreLugar ?? (nodo ? this.app.nombreNodo(nodo) : escena.nombre),
        miniatura: escena.miniatura ? `${IMAGENES_TOUR}${escena.miniatura}` : null,
        enlace: `${TOUR_HIPPOCAMPUS}?${coleccion}sceneId=${escena.escenaId}`,
        nivel: nodo?.nivel ?? null
      }];
    });
  }

  get muestraTour(): EscenaTour[] {
    return this.escenasTour.filter(e => e.miniatura).slice(0, 6);
  }
}
