import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CATALOGO_TOUR, COLECCION_ALMA_SPA, TOUR_HIPPOCAMPUS } from '../../data/catalogo-tour.data';
import { FOTOS_DESTINOS } from '../../data/fotos-destinos.data';
import { obtenerNombreNodo } from '../../data/nombres-nodos.data';
import { Nodo } from '../../models/nodo.model';
import { Idioma } from '../../services/idioma.service';

const TEXTOS = {
  es: {
    titulo: 'Recorrido visual',
    parada: 'Parada',
    fuenteTour: 'Imagen del tour oficial',
    referencia: 'Fotografía del tour no disponible para este punto.',
    abrirPanorama: 'Ver panorama 360°'
  },
  en: {
    titulo: 'Visual route',
    parada: 'Stop',
    fuenteTour: 'Official tour image',
    referencia: 'Tour photograph unavailable for this stop.',
    abrirPanorama: 'Open 360° panorama'
  },
  pt: {
    titulo: 'Percurso visual',
    parada: 'Parada',
    fuenteTour: 'Imagem do tour oficial',
    referencia: 'Fotografia do tour indisponível para este ponto.',
    abrirPanorama: 'Ver panorama 360°'
  }
};

@Component({
  selector: 'app-tour-ruta',
  standalone: true,
  templateUrl: './tour-ruta.component.html',
  styleUrl: './tour-ruta.component.scss'
})
export class TourRutaComponent implements OnChanges {
  @Input({ required: true }) nodo!: Nodo;
  @Input({ required: true }) idioma: Idioma = 'es';
  @Input({ required: true }) numero = 1;
  @Input({ required: true }) total = 1;

  protected miniaturaFallida = false;
  protected indiceFoto = 0;

  protected get fotos() {
    const principal=FOTOS_DESTINOS[this.nodo.id];
    return principal ? [principal,...(principal.galeria??[])] : [];
  }

  protected cambiarFoto(indice: number): void {
    this.indiceFoto=indice;
    this.miniaturaFallida=false;
  }

  protected get textos() {
    return TEXTOS[this.idioma];
  }

  protected get nombre(): string {
    return obtenerNombreNodo(this.nodo.id, this.idioma, this.nodo.nombre);
  }

  protected get miniatura(): string | null {
    return !this.miniaturaFallida ? this.fotos[this.indiceFoto]?.src ?? null : null;
  }

  protected get fuenteFoto(): string {
    const fuente=this.fotos[this.indiceFoto]?.fuente;
    return fuente === 'plano-nivel-4'
      ? ({es:'Fotografía del nivel 4',en:'Level 4 photograph',pt:'Fotografia do nível 4'})[this.idioma]
      : fuente === 'fotografia-local'
        ? ({es:'Fotografía del recinto',en:'Resort photograph',pt:'Fotografia do recinto'})[this.idioma]
        : this.textos.fuenteTour;
  }

  protected get panorama(): string | null {
    const escena = CATALOGO_TOUR[this.nodo.id];
    if (!escena) {
      return null;
    }
    const coleccion = this.nodo.nivel === 6 ? `shortId=${COLECCION_ALMA_SPA}&` : '';
    return `${TOUR_HIPPOCAMPUS}?${coleccion}sceneId=${escena.escenaId}`;
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['nodo']) {
      this.miniaturaFallida = false;
      this.indiceFoto = 0;
    }
  }
}
