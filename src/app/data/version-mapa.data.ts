import {
  VersionMapa
} from '../models/version-mapa.model';

export const VERSION_MAPA_ACTUAL:
  VersionMapa = {
    id: 'hippocampus-resort',
    version: '0.3.0',
    fechaActualizacion: '2026-10-31',
    estado: 'preliminar',
    nivelesDisponibles: [
      1,
      3,
      4,
      5,
      6
    ],
    origenDatos:
      'Mediciones de terreno y respaldo local de referencia',
    requiereInternet: false
  };
