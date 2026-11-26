import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const root = fileURLToPath(new URL('../', import.meta.url));
const config = readFileSync(root+'src/assets/mapas/navinside-map-config.js','utf8');
const bridge = readFileSync(root+'src/assets/mapas/navinside-map-bridge.js','utf8');
const guidance = readFileSync(root+'src/assets/mapas/navinside-route-guidance.js','utf8');
const theme = readFileSync(root+'src/assets/mapas/nav-theme.js','utf8');

// En SVG el eje Y crece hacia abajo: este convenio invierte izquierda/derecha
// si se reutiliza una fórmula cartesiana sin adaptar.
{
  const page=new JSDOM('',{runScripts:'outside-only'});
  page.window.eval(guidance);
  const g=page.window.NavInsideRouteGuidance;
  const route=g.plan([{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:20,y:10}]);
  assert.deepEqual(Array.from(route.turns,t=>t.kind),['depart','right','left']);
  assert.equal(g.pose(route,0).heading,90);
  assert.equal(g.pose(route,1/3).heading,180);
  assert.equal(g.pose(route,2/3).heading,90);
  assert.equal(g.pose(g.plan([...route.points].reverse()),0).heading,270);
  assert.equal(g.turn({x:0,y:-1},{x:1,y:0}),'right');
  assert.equal(g.turn({x:0,y:-1},{x:-1,y:0}),'left');
  assert.equal(g.turn({x:1,y:0},{x:-1,y:0}),'back');
  const measured=g.guidance(route,0,{destination:'Hall',meters:12,language:'es'});
  assert.ok(measured.speech.includes('derecha')&&measured.speech.includes('izquierda'));
  assert.ok(measured.text.includes('Tramo completo hasta Hall: 12 m'));
  assert.ok(measured.text.includes('distancias entre giros están por medir'));
  for(const meters of [null,undefined,Infinity,NaN])assert.ok(g.guidance(route,0,{destination:'Hall',meters}).text.includes('Distancia por medir'));
  assert.ok(g.guidance(route,0,{destination:'Sector',meters:12,reference:true}).text.includes('Distancia por medir'));
  assert.equal(g.pose(g.plan([{x:0,y:0},{x:0,y:0}]),0).heading,null);
  assert.equal(g.pose(route,NaN).x,0);
  console.log('Sentido de la flecha, giros relativos y medidas de tramos completos verificados.');
  page.window.close();
}

for (const level of [1,3,4,5,6]) {
  const messages=[], errors=[], frames=new Map();
  let sequence=0;
  const host=new JSDOM('<!doctype html>',{url:'https://navinside.test/'});
  host.window.postMessage=(data,origin)=>messages.push({data,origin});
  const html=readFileSync(root+`src/assets/mapas/nivel-${level}-navegacion.html`,'utf8');
  const page=new JSDOM(html,{runScripts:'dangerously',url:`https://navinside.test/assets/mapas/nivel-${level}-navegacion.html`,beforeParse(w){
    Object.defineProperty(w,'parent',{value:host.window});
    w.matchMedia=()=>({matches:false});
    w.requestAnimationFrame=callback=>{const id=++sequence;frames.set(id,callback);return id;};
    w.cancelAnimationFrame=id=>frames.delete(id);
    w.HTMLElement.prototype.getBoundingClientRect=function(){return{width:900,height:this.id==='sheet'?180:700,x:0,y:0,left:0,top:0,right:900,bottom:700};};
    w.SVGElement.prototype.getBBox=()=>({x:0,y:0,width:120,height:30});
    w.addEventListener('error',event=>errors.push(event.message));
  }});
  const w=page.window,d=w.document;
  w.eval(theme);w.eval(config);w.eval(guidance);w.eval(bridge);
  assert.equal(messages[0].data.type,'navinside-map-ready');
  assert.equal(messages[0].origin,'https://navinside.test');
  const mapping=w.NAVINSIDE_MAPS[level];
  const labels=Object.fromEntries(Object.keys(mapping.nodes).map(id=>[id,id]));
  const origin=({1:'ascensor-central-nivel-1',3:'ascensor-central-nivel-3',4:'entrada-nivel-4',5:'ascensor-central-nivel-5',6:'ascensor-habitaciones-piso-6'})[level];
  const destination=({1:'gimnasio-nivel-1',3:'restaurant-faro-nivel-3',4:'recepcion-resort-nivel-4',5:'salon-costamar-nivel-5',6:'puerta-acceso-tinajas-piso-6'})[level];
  const intermediate=level===1?'hall-nivel-1':level===4?'lobby-nivel-4':destination;
  const route=[origin,...(intermediate!==destination?[intermediate]:[]),destination].map(id=>({id,level}));
  const state={type:'navinside-map-state',level,route,labels,originId:origin,destinationId:destination,currentId:origin,
    motionId:'1',visible:true,language:'es',accessible:false,physical:null,orientation:[],instruction:'Sigue la ruta',
    guidanceEnabled:true,guidanceContext:'route-1',legs:route.slice(1).map((n,i)=>({fromId:route[i].id,toId:n.id,meters:i?null:12}))};
  const publish=(value,origin='https://navinside.test')=>w.dispatchEvent(new w.MessageEvent('message',{source:host.window,origin,data:value}));
  const flush=()=>{for(let i=0;i<12&&frames.size;i++){const list=[...frames.values()];frames.clear();list.forEach(fn=>fn(w.performance.now()+20000));}};
  publish(state);flush();
  const lastGuidance=()=>messages.filter(m=>m.data.type==='navinside-guidance').at(-1)?.data;
  if(level===1||level===3){
    assert.ok(lastGuidance().text.includes('mirando hacia'));
    assert.ok(lastGuidance().text.includes(level===1?'Sigue recto':'Gira a la derecha'));
  }else if(level===4)assert.ok(lastGuidance().text.includes('Avanza'));
  else assert.ok(lastGuidance().text.includes('mirando hacia'));
  assert.equal(lastGuidance().context,'route-1');
  const heading=Number(d.querySelector('.navinside-host-cursor').dataset.heading);
  assert.ok(Number.isFinite(heading));
  w.eval('V.rot=35;apply()');
  assert.equal(d.querySelector('.navinside-cursor-arrow').getAttribute('transform'),`rotate(${heading+35})`);
  assert.ok(d.querySelectorAll('#routeG .r-main').length);
  for(const path of d.querySelectorAll('#routeG path'))assert.ok(!/NaN|Infinity/.test(path.getAttribute('d')));
  const local=({1:'gym',3:'far',4:'precH',5:'sal',6:'pta'})[level];
  d.querySelector(`.mk[data-node="${local}"]`).dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  assert.equal(messages.at(-1).data.type,'navinside-select-destination');
  assert.equal(messages.at(-1).data.nodeId,destination);
  const unsupported=({1:'pd2',3:'can',4:'pascH',5:'hc',6:'esc1'})[level],count=messages.length;
  w.openPlace(unsupported);
  assert.equal(messages.length,count);
  assert.ok(d.getElementById('card').textContent.includes('pendiente'));
  const moved={...state,currentId:intermediate,motionId:'2'};
  publish(moved);
  assert.equal(messages.at(-1).data.type,'navinside-animation-start');
  flush();
  assert.equal(messages.at(-1).data.type,'navinside-animation-end');
  assert.equal(messages.at(-1).data.motionId,'2');
  const current=d.querySelector('.navinside-host-cursor');
  const position=[current.dataset.x,current.dataset.y];
  publish({...state,currentId:destination,motionId:'other'},'https://other.invalid');
  assert.deepEqual([current.dataset.x,current.dataset.y],position);
  if(level===1){
    publish({...state,motionId:'3',physical:{originId:origin,destinationId:intermediate,fraction:0.5}});
    assert.equal(Number(current.dataset.x),(w.eval('N.asc.x')+w.eval('N.hall.x'))/2);
    assert.equal(Number(current.dataset.y),(w.eval('N.asc.y')+w.eval('N.hall.y'))/2);
    assert.equal(Number(current.dataset.heading),heading);
    const games='zona-juego-adulto-nivel-1',kids='zona-kid-nivel-1';
    for(const [id,turn]of[[games,'derecha'],[kids,'izquierda']]){
      publish({...state,route:[{id:origin,level},{id,level}],destinationId:id,motionId:id});flush();
      assert.ok(lastGuidance().text.includes(turn));
    }
    publish({...state,accessible:true,currentId:destination,motionId:'4'});flush();
    assert.ok(d.getElementById('card').textContent.includes('pendientes de ubicar'));
  } else if(level===3) {
    const comunes = ['asc','asc1','j1','ban','j2','vf','fa','pp'];
    const rutasAccesibles = [
      [...comunes, 'eap'],
      [...comunes, 'eat','tem'],
      [...comunes, 'eap','pri','pc','ec','hall','k0','k1','k2','ten1']
    ];
    const ids = {asc:origin,eap:'piscina-acceso-accesible-nivel-3',tem:'piscina-temperada-nivel-3',ten1:'canchas-tenis-nivel-3'};
    for (const puntos of rutasAccesibles) {
      const ruta = puntos.map(key => ({id:ids[key] ?? 'tramo-accesible-nivel-3-'+key, level}));
      for (const nodo of ruta) assert.ok(w.eval(`!!N[${JSON.stringify(mapping.nodes[nodo.id])}]`), nodo.id);
      publish({...state,accessible:true,route:ruta,currentId:origin,destinationId:ruta.at(-1).id,motionId:ruta.at(-1).id});flush();
      for (let i=1;i<puntos.length;i++) {
        const path=w.dijkstra(puntos[i-1],puntos[i])?.path;
        assert.ok(path?.length>=2, puntos[i-1]+' → '+puntos[i]);
        for(let j=1;j<path.length;j++)assert.notEqual(w.eval(`typeOf('${path[j-1]}','${path[j]}')`),'escalera');
      }
      assert.ok(d.querySelectorAll('#routeG .r-main').length);
      for(const path of d.querySelectorAll('#routeG path'))assert.ok(!/NaN|Infinity/.test(path.getAttribute('d')));
    }
    const pool='piscina-acceso-accesible-nivel-3';
    publish({...state,accessible:true,route:[{id:origin,level},{id:pool,level}],currentId:origin,destinationId:pool,motionId:'3'});
    const path=w.dijkstra('asc','pri').path;
    assert.ok(path.includes('eap'));
    for(let i=0;i<path.length-1;i++)assert.notEqual(w.eval(`typeOf('${path[i]}','${path[i+1]}')`),'escalera');
    w.openPlace('pri');assert.equal(messages.at(-1).data.nodeId,pool);
  } else if(level===4) {
    const costamar='acceso-costamar-nivel-4';
    const image='data:image/jpeg;base64,'+readFileSync(root+'src/assets/tour/zYVz8M8aRKji-thumb.jpg').toString('base64');
    const pending={...state,labels:{...labels,[costamar]:'Entrada Salón Costamar'},
      places:[...Object.keys(labels).map(id=>({id,level})),{id:costamar,level}],
      photos:{[costamar]:{src:image}},route:[{id:origin,level},{id:costamar,level}],
      currentId:costamar,destinationId:costamar,motionId:'costamar'};
    publish(pending);flush();
    assert.ok(d.getElementById('card').textContent.includes('pendientes de ubicar'));
    assert.equal(d.querySelector('.navinside-card>img').src,image);
    assert.equal(current.style.display,'none');
    // Las fotos incluidas en el archivo nuevo siguen asociadas a sus lugares.
    for(const id of ['pentrada','precH','precT','pascA','pascB','h2'])assert.ok(w.eval(`D.fotos.${id}[0]`).startsWith('data:image/'));
    assert.equal(w.eval('N.s6.x'),7450);
    assert.equal(w.eval('D.edges.length'),24);
  }
  if(level===5){
    assert.ok(lastGuidance().text.includes('Distancia por medir'));
    assert.equal(d.querySelectorAll('#routeG .r-main').length,1);
  }
  if(level===6){
    const physical={...state,motionId:'physical-6',physical:{originId:origin,destinationId:destination,fraction:0.25}};
    publish(physical);
    const atQuarter=[Number(current.dataset.x),Number(current.dataset.y)];
    publish({...physical,physical:{...physical.physical,fraction:0.75}});
    const atThreeQuarters=[Number(current.dataset.x),Number(current.dataset.y)];
    assert.notDeepEqual(atQuarter,atThreeQuarters);
    const forwardHeading=Number(current.dataset.heading);
    publish({...physical,guidanceEnabled:false,physical:{...physical.physical,fraction:0.75,direction:'retrocediendo'}});
    assert.equal(Number(current.dataset.heading),(forwardHeading+180)%360);
    assert.equal(lastGuidance().text,'');
  }
  publish({...state,route:[],currentId:null,visible:false,motionId:'clear'});flush();
  assert.equal(lastGuidance().text,'');
  assert.equal(current.style.display,'none');
  for(const image of d.querySelectorAll('img[src]'))assert.ok(image.src.startsWith('data:image/'));
  assert.deepEqual(errors,[]);
  console.log(`Nivel ${level}: selección, trazado, cursor, mensajes de animación y fotos sin conexión verificados.`);
  w.close();host.window.close();
}
