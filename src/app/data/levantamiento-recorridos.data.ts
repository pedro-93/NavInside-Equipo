import type { Conexion } from '../models/nodo.model';

export interface TramoLevantado { id:number; origen:string; destino:string; nivelOrigen:number; nivelDestino:number; distancia:number; estado:'medido'|'calculado'|'por-verificar'; observacion:string; }
export const FUENTE_LEVANTAMIENTO = {archivo:'tabla_puntos_interes_y_recorridos.pdf',libraryFileId:'libfile_13e7bd60e0548191ab306b2a719a6222',pasoMetros:0.200} as const;
export const TRAMOS_LEVANTADOS: readonly TramoLevantado[] = [
  {
    "id": 1,
    "origen": "entrada-nivel-4",
    "destino": "recepcion-turismo-vina-nivel-4",
    "nivelOrigen": 4,
    "nivelDestino": 4,
    "distancia": 6.387,
    "estado": "medido",
    "observacion": ""
  },
  {
    "id": 2,
    "origen": "entrada-nivel-4",
    "destino": "recepcion-resort-nivel-4",
    "nivelOrigen": 4,
    "nivelDestino": 4,
    "distancia": 6.751,
    "estado": "medido",
    "observacion": ""
  },
  {
    "id": 3,
    "origen": "entrada-nivel-4",
    "destino": "ascensor-central-nivel-4",
    "nivelOrigen": 4,
    "nivelDestino": 4,
    "distancia": 6.877,
    "estado": "medido",
    "observacion": ""
  },
  {
    "id": 4,
    "origen": "entrada-nivel-4",
    "destino": "puerta-exterior-derecha-nivel-4",
    "nivelOrigen": 4,
    "nivelDestino": 4,
    "distancia": 8.53,
    "estado": "medido",
    "observacion": "Accesibilidad por verificar."
  },
  {
    "id": 5,
    "origen": "entrada-nivel-4",
    "destino": "puerta-exterior-izquierda-nivel-4",
    "nivelOrigen": 4,
    "nivelDestino": 4,
    "distancia": 9.008,
    "estado": "medido",
    "observacion": "Accesibilidad por verificar."
  },
  {
    "id": 6,
    "origen": "puerta-exterior-derecha-nivel-4",
    "destino": "acceso-escalera-derecha-nivel-3",
    "nivelOrigen": 4,
    "nivelDestino": 3,
    "distancia": 2.577,
    "estado": "por-verificar",
    "observacion": "Registro original: medido. 13 escalones y 2 descansos; la longitud contradice el desglose y requiere comprobación."
  },
  {
    "id": 7,
    "origen": "puerta-exterior-izquierda-nivel-4",
    "destino": "acceso-escalera-izquierda-nivel-3",
    "nivelOrigen": 4,
    "nivelDestino": 3,
    "distancia": 2.577,
    "estado": "por-verificar",
    "observacion": "Registro original: medido. 13 escalones y 2 descansos; la longitud contradice el desglose y requiere comprobación."
  },
  {
    "id": 8,
    "origen": "ascensor-central-nivel-3",
    "destino": "piscina-acceso-escalones-nivel-3",
    "nivelOrigen": 3,
    "nivelDestino": 3,
    "distancia": 8.6,
    "estado": "calculado",
    "observacion": "43 pasos × 0,200 m. Acceso por escalones."
  },
  {
    "id": 9,
    "origen": "ascensor-central-nivel-3",
    "destino": "piscina-acceso-accesible-nivel-3",
    "nivelOrigen": 3,
    "nivelDestino": 3,
    "distancia": 12,
    "estado": "calculado",
    "observacion": "60 pasos × 0,200 m. Ancho y pendiente por comprobar."
  },
  {
    "id": 10,
    "origen": "ascensor-central-nivel-3",
    "destino": "piscina-temperada-nivel-3",
    "nivelOrigen": 3,
    "nivelDestino": 3,
    "distancia": 12,
    "estado": "calculado",
    "observacion": "60 pasos × 0,200 m."
  },
  {
    "id": 11,
    "origen": "ascensor-central-nivel-3",
    "destino": "restaurant-faro-nivel-3",
    "nivelOrigen": 3,
    "nivelDestino": 3,
    "distancia": 16,
    "estado": "calculado",
    "observacion": "80 pasos × 0,200 m."
  },
  {
    "id": 12,
    "origen": "ascensor-central-nivel-3",
    "destino": "canchas-tenis-nivel-3",
    "nivelOrigen": 3,
    "nivelDestino": 3,
    "distancia": 36,
    "estado": "calculado",
    "observacion": "180 pasos × 0,200 m. Escaleras, gravilla y pavimento deteriorado."
  },
  {
    "id": 13,
    "origen": "ascensor-central-nivel-1",
    "destino": "zona-kid-nivel-1",
    "nivelOrigen": 1,
    "nivelDestino": 1,
    "distancia": 4.411,
    "estado": "medido",
    "observacion": ""
  },
  {
    "id": 14,
    "origen": "ascensor-central-nivel-1",
    "destino": "zona-juego-adulto-nivel-1",
    "nivelOrigen": 1,
    "nivelDestino": 1,
    "distancia": 2.054,
    "estado": "medido",
    "observacion": "Acceso por pequeña escalera."
  },
  {
    "id": 15,
    "origen": "ascensor-central-nivel-1",
    "destino": "zona-play-nivel-1",
    "nivelOrigen": 1,
    "nivelDestino": 1,
    "distancia": 6.255,
    "estado": "medido",
    "observacion": ""
  },
  {
    "id": 16,
    "origen": "ascensor-central-nivel-1",
    "destino": "hall-nivel-1",
    "nivelOrigen": 1,
    "nivelDestino": 1,
    "distancia": 10.336,
    "estado": "medido",
    "observacion": ""
  },
  {
    "id": 17,
    "origen": "hall-nivel-1",
    "destino": "mini-market-proa-nivel-1",
    "nivelOrigen": 1,
    "nivelDestino": 1,
    "distancia": 10.171,
    "estado": "medido",
    "observacion": ""
  },
  {
    "id": 18,
    "origen": "hall-nivel-1",
    "destino": "gimnasio-nivel-1",
    "nivelOrigen": 1,
    "nivelDestino": 1,
    "distancia": 15.272,
    "estado": "medido",
    "observacion": "Acceso por desnivel interno."
  },
  {
    "id": 19,
    "origen": "hall-nivel-1",
    "destino": "salon-eventos-montemar-nivel-1",
    "nivelOrigen": 1,
    "nivelDestino": 1,
    "distancia": 32.184,
    "estado": "medido",
    "observacion": ""
  },
  {
    "id": 20,
    "origen": "hall-nivel-1",
    "destino": "salon-eventos-terramar-nivel-1",
    "nivelOrigen": 1,
    "nivelDestino": 1,
    "distancia": 13.586,
    "estado": "medido",
    "observacion": "La tabla de terreno lo asigna a Terramar; un borrador posterior lo rotula Altamar. Conservar la fuente original hasta verificar."
  },
  {
    "id": 21,
    "origen": "hall-nivel-1",
    "destino": "alma-spa-nivel-1",
    "nivelOrigen": 1,
    "nivelDestino": 1,
    "distancia": 26.521,
    "estado": "medido",
    "observacion": ""
  },
  {
    "id": 22,
    "origen": "salon-eventos-montemar-nivel-1",
    "destino": "ascensor-habitaciones-nivel-1",
    "nivelOrigen": 1,
    "nivelDestino": 1,
    "distancia": 5.143,
    "estado": "medido",
    "observacion": ""
  },
  {
    "id": 23,
    "origen": "ascensor-habitaciones-piso-6",
    "destino": "tinajas-piso-6",
    "nivelOrigen": 6,
    "nivelDestino": 6,
    "distancia": 48.293,
    "estado": "calculado",
    "observacion": "26,943 + 21,350 m. El registro termina en Tinajas; no confirma la distancia individual hasta la puerta."
  },
  {
    "id": 24,
    "origen": "puerta-acceso-tinajas-piso-6",
    "destino": "alma-spa-tinaja-piso-6",
    "nivelOrigen": 6,
    "nivelDestino": 6,
    "distancia": 4.8,
    "estado": "calculado",
    "observacion": "24 pasos × 0,200 m."
  }
];

export function integrarMedicionesLevantadas(conexiones: Conexion[], nodos: readonly string[]): Conexion[] {
  const clave=(a:string,b:string)=>[a,b].sort().join('|');
  const registro=new Map(TRAMOS_LEVANTADOS.map(t=>[clave(t.origen,t.destino),t]));
  const resultado=conexiones.map(c=>{
    const tramo=registro.get(clave(c.origen,c.destino));
    if (tramo) return {...c,distancia:tramo.estado==='por-verificar'?null:tramo.distancia};
    if (clave(c.origen,c.destino)===clave('ascensor-habitaciones-piso-6','puerta-acceso-tinajas-piso-6') ||
        clave(c.origen,c.destino)===clave('hall-nivel-1','salon-eventos-altamar-nivel-1')) return {...c,distancia:null};
    return {...c};
  });
  const tinajas=TRAMOS_LEVANTADOS.find(t=>t.id===23)!;
  if (nodos.includes(tinajas.origen)&&nodos.includes(tinajas.destino)&&
      !resultado.some(c=>clave(c.origen,c.destino)===clave(tinajas.origen,tinajas.destino))) {
    resultado.push({origen:tinajas.origen,destino:tinajas.destino,distancia:tinajas.distancia,tipo:'pasillo',habilitada:true});
  }
  return resultado;
}
