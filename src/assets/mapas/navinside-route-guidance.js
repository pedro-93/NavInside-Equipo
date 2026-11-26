(function (root) {
  'use strict';
  const clean = points => (points || []).filter(p => Number.isFinite(p?.x) && Number.isFinite(p?.y))
    .filter((p, i, list) => !i || Math.hypot(p.x-list[i-1].x, p.y-list[i-1].y)>1e-6);
  const vector = (a,b) => ({x:b.x-a.x,y:b.y-a.y});
  const length = v => Math.hypot(v.x,v.y);
  const heading = v => (Math.atan2(v.y,v.x)*180/Math.PI+450)%360;
  const fraction = n => Number.isFinite(n) ? Math.max(0,Math.min(1,n)) : 0;
  function turn(before,after) {
    if (!before || length(before)<1e-6 || length(after)<1e-6) return 'depart';
    const angle=Math.atan2(before.x*after.y-before.y*after.x,before.x*after.x+before.y*after.y)*180/Math.PI;
    if (Math.abs(angle)<35) return 'straight';
    if (Math.abs(angle)>155) return 'back';
    return angle>0?'right':'left';
  }
  function plan(points,incoming=null) {
    points=clean(points);
    const segments=points.slice(1).map((p,i)=>({from:points[i],to:p,vector:vector(points[i],p),length:length(vector(points[i],p))}));
    let total=0;
    const turns=[];
    segments.forEach((segment,i)=>{
      segment.start=total;total+=segment.length;
      const kind=turn(i?segments[i-1].vector:incoming,segment.vector);
      if (!i || kind!=='straight') turns.push({distance:segment.start,kind});
    });
    return {points,segments,total,turns};
  }
  function pose(route,progress) {
    if (!route.segments.length) return route.points[0] ? {...route.points[0],heading:null} : null;
    const distance=fraction(progress)*route.total;
    const segment=route.segments.find((s,i)=>distance<s.start+s.length-1e-6 || i===route.segments.length-1);
    const t=Math.max(0,Math.min(1,(distance-segment.start)/segment.length));
    return {x:segment.from.x+segment.vector.x*t,y:segment.from.y+segment.vector.y*t,heading:heading(segment.vector)};
  }
  const words={
    es:{depart:'Avanza',straight:'Sigue recto',right:'Gira a la derecha',left:'Gira a la izquierda',back:'Da la vuelta',then:'Luego, ',towards:'hacia',facing:'Al salir de los ascensores, mirando hacia',whole:'Tramo completo hasta',meters:'m aprox.',unknown:'Distancia por medir.',approx:'Aproximado según el plano:',bends:'Las distancias entre giros están por medir.',stairs:'Usa las escaleras del tramo.',reference:'Referencia del sector; acceso exacto por confirmar.'},
    en:{depart:'Go ahead',straight:'Continue straight',right:'Turn right',left:'Turn left',back:'Turn around',then:'Then, ',towards:'towards',facing:'Leaving the lifts, facing',whole:'Whole section to',meters:'m approx.',unknown:'Distance pending measurement.',approx:'Approximate from the map:',bends:'Distances between turns are pending measurement.',stairs:'Use the stairs along this section.',reference:'Area reference; exact entrance pending confirmation.'},
    pt:{depart:'Avance',straight:'Siga em frente',right:'Vire à direita',left:'Vire à esquerda',back:'Dê a volta',then:'Depois, ',towards:'em direção a',facing:'Ao sair dos elevadores, olhando para',whole:'Trecho completo até',meters:'m aprox.',unknown:'Distância por medir.',approx:'Aproximado pelo mapa:',bends:'As distâncias entre curvas estão por medir.',stairs:'Use as escadas deste trecho.',reference:'Referência do setor; acesso exato por confirmar.'}
  };
  function guidance(route,progress,options={}) {
    if (!route.turns.length) return null;
    const w=words[options.language]||words.es;
    const distance=fraction(progress)*route.total;
    let index=0;
    route.turns.forEach((step,i)=>{if(step.distance<=distance+1e-6)index=i;});
    const command=i=>w[route.turns[i].kind]+(i===route.turns.length-1?' '+w.towards+' '+options.destination:'')+'.';
    const prefix=options.facing ? w.facing+' '+options.facing+'. ' : '';
    const measured=typeof options.meters==='number' && Number.isFinite(options.meters) && options.meters>=0 && !options.reference;
    const fmt=n=>new Intl.NumberFormat(options.language||'es',{maximumFractionDigits:1}).format(n);
    const approx=!measured && !options.reference && typeof options.approxMeters==='number' && Number.isFinite(options.approxMeters) && options.approxMeters>0
      ? ' '+w.approx+' ≈ '+fmt(options.approxMeters)+' m.' : '';
    const meters=measured ? w.whole+' '+options.destination+': '+fmt(options.meters)+' '+w.meters+(w.meters.endsWith('.')?'':'.') : w.unknown+approx;
    const metersVoz=measured ? w.whole+' '+options.destination+': '+fmt(options.meters)+' '+w.meters+'.' : w.unknown;
    const extra=[measured&&route.turns.length>1?w.bends:'',options.stairs?w.stairs:'',options.reference?w.reference:''];
    const notes=[meters,...extra].filter(Boolean).join(' ');
    const notesVoz=[metersVoz,...extra].filter(Boolean).join(' ');
    const next=index+1<route.turns.length ? ' '+w.then+command(index+1).replace(/^./,c=>c.toLowerCase()) : '';
    return {
      index,
      text:(index===0?prefix:'')+command(index)+next+' '+notes,
      speech:prefix+route.turns.map((_,i)=>(i?w.then:'')+command(i).replace(/^./,c=>i?c.toLowerCase():c)).join(' ')+' '+notesVoz
    };
  }
  root.NavInsideRouteGuidance={plan,pose,guidance,turn,heading,vector};
})(window);
