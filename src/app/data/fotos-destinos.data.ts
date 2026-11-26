import { CATALOGO_TOUR, IMAGENES_TOUR } from './catalogo-tour.data';
import { FOTOS_COMPLEMENTARIAS } from './fotos-complementarias.data';

export interface FotoDestino {
  src: string;
  alt: string;
  fuente?: 'tour' | 'plano-nivel-4' | 'fotografia-local';
  galeria?: { src: string; alt: string; fuente?: FotoDestino['fuente'] }[];
}

export const FOTOS_DESTINOS: Record<string, FotoDestino> = {};
for (const [nodoId, escena] of Object.entries(CATALOGO_TOUR)) {
  if (escena.miniatura) {
    FOTOS_DESTINOS[nodoId] = {
      src: IMAGENES_TOUR + escena.miniatura,
      alt: escena.nombre
    };
  }
}

for (const [id,archivo,nombre] of [
  ['recepcion-resort-nivel-4','recepcion-hippocampus.jpg','Recepción Hippocampus'],
  ['recepcion-turismo-vina-nivel-4','recepcion-turismo.jpg','Recepción Turismo'],
  ['ascensor-central-nivel-4','ascensores.jpg','Ascensores del nivel 4: imagen de referencia']
]) {
  FOTOS_DESTINOS[id]={src:'assets/hippocampus/nivel-4/'+archivo,alt:nombre,fuente:'plano-nivel-4'};
}

for (const [id,complementaria] of Object.entries(FOTOS_COMPLEMENTARIAS)) {
  if (id === 'ascensor-central-nivel-3') continue;
  const actual=FOTOS_DESTINOS[id];
  if (!actual) {
    FOTOS_DESTINOS[id]={...complementaria,fuente:'fotografia-local',
      galeria:complementaria.galeria?.map(foto=>({...foto,fuente:'fotografia-local'}))};
    continue;
  }
  const candidatos=[{src:complementaria.src,alt:complementaria.alt},...(complementaria.galeria??[])];
  const vistos=new Set([actual.src]);
  actual.galeria=candidatos.filter(foto=>!vistos.has(foto.src)&&!!vistos.add(foto.src))
    .map(foto=>({...foto,fuente:'fotografia-local'}));
}
