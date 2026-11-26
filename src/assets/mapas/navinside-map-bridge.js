(() => {
  'use strict';
  if (window.parent === window) return;
  const config = window.NAVINSIDE_MAPS?.[D.floor];
  const guide = window.NavInsideRouteGuidance;
  if (!config || !guide) return;
  const originals = Object.fromEntries(PLACES.map(p => [p.node, p.name]));
  const texts = {
    es: {points:'Puntos de interés',choose:'Selecciona un destino',pending:'La conexión de este punto con las rutas está pendiente.',reference:'Referencia del sector; acceso exacto por confirmar.',missing:'Hay tramos de esta ruta pendientes de ubicar en este plano.',photo:'Fotografía del tour pendiente.',close:'Cerrar',orientation:'Orientación física',waiting:'Selecciona origen y destino en NavInside para calcular la ruta.'},
    en: {points:'Points of interest',choose:'Choose a destination',pending:'This point is not linked to navigation routes yet.',reference:'Area reference; the exact entrance is pending confirmation.',missing:'Some route sections have not been positioned on this map yet.',photo:'Tour photograph pending.',close:'Close',orientation:'Physical orientation',waiting:'Choose an origin and destination in NavInside to calculate a route.'},
    pt: {points:'Pontos de interesse',choose:'Selecione um destino',pending:'A conexão deste ponto com as rotas está pendente.',reference:'Referência do setor; o acesso exato aguarda confirmação.',missing:'Alguns trechos da rota ainda não foram localizados neste mapa.',photo:'Fotografia do tour pendente.',close:'Fechar',orientation:'Orientação física',waiting:'Selecione origem e destino no NavInside para calcular a rota.'}
  };
  let state = {labels:{},route:[],language:'es',orientation:[]};
  let selectedVisual = null, currentVisual = null, currentMotion = '', routeKey = '';
  let movement = 0, routePoints = [], unplaced = false;
  let activeLeg=null, activeFraction=0, cursorHeading=null, guidanceText='', guidanceSignature='';
  let following=false;
  const text = () => texts[state.language] || texts.es;
  const send = data => window.parent.postMessage({...data, level:D.floor}, window.location.origin);
  const visualId = id => config.nodes[id] && N[config.nodes[id]] ? config.nodes[id] : null;
  const canonicalId = id => {
    let key = config.destinations[id];
    if (state.accessible && key === 'piscina-acceso-escalones-nivel-3') key = 'piscina-acceso-accesible-nivel-3';
    return key && Object.hasOwn(state.labels,key) ? key : null;
  };
  const localPoint = id => PL[id] || (N[id] ? {node:id,name:N[id].name,fotos:D.fotos[id]||[],desc:''} : null);
  const nameOf = (id, canonical) => canonical && state.labels[canonical] || localPoint(id)?.name || '';
  const style = document.createElement('style');
  style.textContent = '.navinside-embedded #editFab,.navinside-embedded .org{display:none!important}.navinside-embedded #sheet{max-height:42%;overflow:auto}.navinside-embedded #card{padding:11px 15px}.navinside-embedded #card h2{font-size:17px;margin:0}.navinside-embedded #card p{font-size:12px;margin:5px 0}.navinside-card{display:flex;gap:12px;align-items:center}.navinside-card>img{width:78px;height:54px;object-fit:cover;border-radius:9px;flex:none}.navinside-card>div{flex:1;min-width:0}.navinside-embedded .places .pl{min-height:45px}.navinside-embedded details{font-size:11px;margin-top:7px}.navinside-embedded details p{font-size:11px!important}.navinside-warning{color:#a05c12!important}.navinside-host-cursor{pointer-events:none}.r-reference{stroke-dasharray:10 8;opacity:.7}';
  document.head.appendChild(style);
  body.classList.add('navinside-embedded');
  body.classList.remove('nav','routing','editing');
  pause();
  const cursor = el('g',{class:'me navinside-host-cursor','aria-label':'Cursor del recorrido'});
  cursor.appendChild(el('circle',{r:18,fill:'#17345c',stroke:'#fff','stroke-width':3}));
  const arrow=el('path',{class:'navinside-cursor-arrow',d:'M0 -12 L8 9 L0 4 L-8 9Z',fill:'#fff'});
  cursor.appendChild(arrow);
  cursor.dataset.x = 0; cursor.dataset.y = 0; cursor.style.display = 'none';
  mkG.appendChild(cursor);
  const followButton=document.createElement('button');
  followButton.type='button';followButton.id='navinsideFollow';followButton.className='fab';
  followButton.textContent='➤';followButton.style.cssText='left:12px;right:auto;top:76px;bottom:auto';
  followButton.setAttribute('aria-pressed','false');document.body.appendChild(followButton);
  const followLabel=()=>state.language==='en'?'Follow cursor':state.language==='pt'?'Seguir cursor':'Seguir cursor';
  followButton.setAttribute('aria-label',followLabel());
  function setFollowing(value){following=value;followButton.setAttribute('aria-pressed',String(value));}
  followButton.onclick=()=>{
    setFollowing(!following);
    if(following&&cursor.style.display!=='none'){
      if(anim!==null){cancelAnimationFrame(anim);anim=null;}
      V.w=Math.min(3200,Math.max(250,32/SCALE_M));
      setCursor({x:+cursor.dataset.x,y:+cursor.dataset.y,heading:cursorHeading});
    }
  };
  const compass=$('ntCompass');
  if(compass)compass.onclick=()=>{setFollowing(false);animTo({cx:V.cx,cy:V.cy,w:V.w,rot:0},350);};
  const applyOriginal=apply;
  apply=function(){
    applyOriginal();
    $('scaleTxt').textContent=state.language==='en'?'Reference scale':state.language==='pt'?'Escala de referência':'Escala referencial';
    arrow.style.display=cursorHeading===null?'none':'';
    if(cursorHeading!==null)arrow.setAttribute('transform',`rotate(${cursorHeading+V.rot})`);
  };
  const originMarker=el('g',{class:'pin navinside-origin','aria-label':'Origen del recorrido'});
  originMarker.appendChild(el('circle',{r:9,fill:'#12813f',stroke:'#fff','stroke-width':3}));
  originMarker.dataset.x=0;originMarker.dataset.y=0;originMarker.style.display='none';mkG.appendChild(originMarker);
  if (D.floor === 1 && !mkG.querySelector('[data-node="asc"]')) {
    const tag = D.tags.find(t=>t.n==='asc') || N.asc;
    const marker = el('g',{class:'mk',role:'button',tabindex:'0','aria-label':'Ascensor principal'});
    marker.dataset.x=tag.x;marker.dataset.y=tag.y;marker.dataset.node='asc';
    marker.appendChild(el('circle',{class:'ring',r:20}));
    const icon=el('text',{class:'emoji'});icon.textContent='🛗';marker.appendChild(icon);
    const label=el('text',{class:'name',y:36});label.textContent='Ascensor principal';marker.appendChild(label);
    marker.addEventListener('click',event=>{event.stopPropagation();openPlace('asc');});
    marker.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openPlace('asc');}});
    mkG.appendChild(marker);
  }

  function renderPanel(id, canonical=null) {
    body.classList.remove('navinside-lista');
    const photo=canonical&&state.photos?.[canonical];
    let point = id && localPoint(id) || (canonical&&state.labels[canonical] ? {
      name:state.labels[canonical],fotos:photo?[photo.src]:[]
    } : null);
    if (!point) { showList(); return; }
    if(photo)point={...point,fotos:[photo.src,...(photo.galeria||[]).map(f=>f.src)]};
    const linked = canonical || canonicalId(id);
    const warning = !linked ? text().pending : !visualId(linked) ? text().missing : config.references.includes(linked) ? text().reference : '';
    card.innerHTML='<div class="grip"></div><div class="navinside-card">'+
      (point.fotos[0]?'<img alt="'+esc(config.references.includes(linked)?text().reference+' '+point.name:nameOf(id,linked))+'" src="'+point.fotos[0]+'">':'<img alt="" class="navinside-icono" src="'+iconImg(point.name)+'">')+
      '<div><h2>'+esc(nameOf(id,linked))+'</h2><p class="navinside-guidance" aria-live="polite">'+esc(guidanceText||state.instruction||text().waiting)+'</p>'+
      (warning?'<p class="navinside-warning">'+esc(warning)+'</p>':'')+
      (unplaced&&warning!==text().missing?'<p class="navinside-warning">'+esc(text().missing)+'</p>':'')+
      '</div><button type="button" class="ctrl" id="navinsideClose" aria-label="'+esc(text().close)+'">✕</button></div>'+
      (point.fotos.length>1?'<div class="navinside-gallery" style="display:flex;gap:7px;overflow:auto;padding:6px">'+point.fotos.map((url,i)=>
        '<button type="button" data-gallery-index="'+i+'" aria-label="'+esc(point.name)+' · '+(i+1)+'" style="padding:0;border:0;border-radius:5px;overflow:hidden;flex:none"><img alt="" src="'+esc(url)+'" style="width:64px;height:44px;object-fit:cover"></button>').join('')+'</div>':'')+
      (state.orientation?.length?'<details><summary>'+esc(text().orientation)+'</summary>'+state.orientation.map(line=>'<p>'+esc(line)+'</p>').join('')+'</details>':'');
    $('navinsideClose').onclick=showList;
    card.querySelector('.navinside-card>img')?.addEventListener('click',()=>openViewer(point.fotos[0]));
    card.querySelectorAll('[data-gallery-index]').forEach(button=>button.onclick=()=>openViewer(point.fotos[Number(button.dataset.galleryIndex)]));
    apply();
  }

  function showList(query='') {
    body.classList.add('navinside-lista');
    const entries=PLACES.filter(p=>!(D.hide||[]).includes(p.node)).filter(p=>p.name.toLowerCase().includes(query.toLowerCase()));
    const pending=(state.places||[]).filter(p=>p.level===D.floor&&!visualId(p.id)&&state.labels[p.id]?.toLowerCase().includes(query.toLowerCase()));
    card.innerHTML='<div class="grip"></div><h2>'+esc(text().points)+' · '+D.floor+'</h2><div class="places">'+
      entries.map(p=>'<button type="button" class="pl" data-nav-place="'+esc(p.node)+'">'+
        (p.fotos[0]?'<img alt="" src="'+p.fotos[0]+'">':'<img alt="" class="navinside-icono" src="'+iconImg(p.name)+'">')+'<b>'+esc(p.name)+'</b></button>').join('')+
      pending.map(p=>'<button type="button" class="pl" data-nav-canonical="'+esc(p.id)+'">'+
        (state.photos?.[p.id]?'<img alt="" src="'+esc(state.photos[p.id].src)+'">':'<img alt="" class="navinside-icono" src="'+iconImg(state.labels[p.id])+'">')+'<b>'+esc(state.labels[p.id])+'</b></button>').join('')+'</div>';
    card.querySelectorAll('[data-nav-place]').forEach(button=>button.onclick=()=>openPlace(button.dataset.navPlace));
    card.querySelectorAll('[data-nav-canonical]').forEach(button=>button.onclick=()=>{
      renderPanel(null,button.dataset.navCanonical);send({type:'navinside-select-destination',nodeId:button.dataset.navCanonical});
    });
    apply();
  }
  openPlace = id => {
    selectedVisual=id;renderPanel(id);
    if(N[id])fitPoints([N[id],localPoint(id)?.tag||N[id]]);
    const key=canonicalId(id);
    if (key) send({type:'navinside-select-destination',nodeId:key});
  };
  idle = () => showList();
  $('searchBtn').onclick=()=>{
    card.innerHTML='<div class="grip"></div><label for="navinsideSearch">'+esc(text().choose)+'</label><input id="navinsideSearch" class="form-control" type="search"><div id="navinsideResults"></div>';
    const input=$('navinsideSearch'),results=$('navinsideResults');
    const update=()=>{
      results.innerHTML='<div class="places">'+PLACES.filter(p=>p.name.toLowerCase().includes(input.value.toLowerCase())).map(p=>'<button type="button" class="pl" data-nav-place="'+p.node+'"><b>'+esc(p.name)+'</b></button>').join('')+'</div>';
      results.querySelectorAll('[data-nav-place]').forEach(button=>button.onclick=()=>openPlace(button.dataset.navPlace));apply();
    };
    input.addEventListener('input',update);update();input.focus();
  };
  $('recenter').onclick=()=>{setFollowing(false);routePoints.length?fitPoints(routePoints):animTo(fullView());};

  function pathBetween(a,b) {
    if (!a || !b) return [];
    if (a===b) return [a];
    return dijkstra(a,b)?.path || [];
  }
  function pathPoints(path) { return path.map(id=>N[id]); }
  function setCursor(point) {
    cursor.style.display=point?'':'none';
    if(point){
      cursor.dataset.x=point.x;cursor.dataset.y=point.y;
      if(Number.isFinite(point.heading))cursorHeading=point.heading;
      cursor.dataset.heading=cursorHeading===null?'':String(cursorHeading);
      if(following){
        V.cx=point.x;V.cy=point.y;
        if(cursorHeading!==null){const target=-cursorHeading;V.rot+=((target-V.rot)%360+540)%360-180;}
      }
      apply();
    }
  }
  function incomingAt(index) {
    for(let i=index-1;i>=0;i--){
      if(state.route[i].level!==D.floor||state.route[i+1].level!==D.floor)break;
      const points=pathPoints(pathBetween(visualId(state.route[i].id),visualId(state.route[i+1].id)));
      if(points.length>1)return guide.vector(points.at(-2),points.at(-1));
    }
    return null;
  }
  function legBetween(fromId,toId,backwards=false) {
    const path=pathBetween(visualId(fromId),visualId(toId));
    if(path.length<2)return null;
    const index=state.route.findIndex(n=>n.id===fromId);
    let incoming=backwards && cursorHeading!==null ? {x:Math.sin(cursorHeading*Math.PI/180),y:-Math.cos(cursorHeading*Math.PI/180)} : incomingAt(index);
    let facingId=null;
    if(!incoming && fromId===config.facing?.originId){
      incoming=guide.vector(N[visualId(fromId)],N[config.facing.towards]);facingId=config.facing.towards;
    }
    const metadata=(state.legs||[]).find(leg=>leg.fromId===fromId&&leg.toId===toId||leg.fromId===toId&&leg.toId===fromId);
    return {plan:guide.plan(pathPoints(path),incoming),fromId,toId,facingId,
      meters:metadata?.meters??null,approxMeters:metadata?.approxMeters??null,
      reference:config.references.includes(fromId)||config.references.includes(toId),
      stairs:path.some((id,i)=>i&&typeOf(path[i-1],id)==='escalera')};
  }
  function publishGuidance(leg,progress) {
    const result=leg && state.guidanceEnabled!==false ? guide.guidance(leg.plan,progress,{
      language:state.language,destination:state.labels[leg.toId]||nameOf(visualId(leg.toId)),
      facing:leg.facingId?nameOf(leg.facingId,canonicalId(leg.facingId)):null,
      meters:leg.meters,approxMeters:leg.approxMeters,reference:leg.reference,stairs:leg.stairs
    }) : null;
    guidanceText=result?.text||'';
    const panel=card.querySelector('.navinside-guidance');
    if(panel && panel.textContent!==(guidanceText||state.instruction))panel.textContent=guidanceText||state.instruction||text().waiting;
    const message={type:'navinside-guidance',motionId:state.motionId,context:state.guidanceContext,
      key:result?JSON.stringify([state.route,state.accessible,leg.fromId,leg.toId,state.language]):'',
      text:guidanceText,speech:result?.speech||''};
    const signature=JSON.stringify(message);
    if(signature!==guidanceSignature){guidanceSignature=signature;send(message);}
    return result;
  }
  function showLeg(leg,progress) {
    activeLeg=leg;activeFraction=progress;
    const point=guide.pose(leg.plan,progress);
    if(state.physical?.direction==='retrocediendo' && point && point.heading!==null)point.heading=(point.heading+180)%360;
    setCursor(point);return publishGuidance(leg,progress);
  }
  function drawHostRoute() {
    routeG.innerHTML='';routePoints=[];unplaced=false;
    const list=state.route||[];
    for(let i=0;i<list.length-1;i++){
      if(list[i].level!==D.floor||list[i+1].level!==D.floor)continue;
      const path=pathBetween(visualId(list[i].id),visualId(list[i+1].id));
      const points=pathPoints(path);
      if(!points.length){unplaced=true;continue;}
      routePoints.push(...points);
      if(points.length<2)continue;
      const d=points.map((p,j)=>(j?'L':'M')+p.x+' '+p.y).join(' '),reference=config.references.includes(list[i].id)||config.references.includes(list[i+1].id);
      routeG.appendChild(el('path',{class:'r-case',d,'data-w':15}));
      routeG.appendChild(el('path',{class:'r-main'+(reference?' r-reference':''),d,'data-w':9}));
      for(let j=0;j<path.length-1;j++)if(typeOf(path[j],path[j+1])==='escalera'){
        const a=N[path[j]],b=N[path[j+1]];
        routeG.appendChild(el('line',{class:'r-stairs',x1:a.x,y1:a.y,x2:b.x,y2:b.y,'data-w':9,'stroke-dasharray':'8 7'}));
      }
    }
    apply();
  }
  drawRoute=drawHostRoute;

  function updateCursor(previousId,previousState) {
    const target=visualId(state.currentId);
    if(state.physical){
      cancelAnimationFrame(movement);movement=0;
      const from=visualId(state.physical.originId),to=visualId(state.physical.destinationId);
      const leg=legBetween(state.physical.originId,state.physical.destinationId);
      if(!state.visible){setCursor(null);publishGuidance(null,0);}
      else if(leg)showLeg(leg,state.physical.fraction);
      else{setCursor(from?N[from]:null);publishGuidance(null,0);}
      currentVisual=target;currentMotion=state.motionId;return;
    }
    if(state.motionId===currentMotion){publishGuidance(activeLeg,activeFraction);return;}
    cancelAnimationFrame(movement);movement=0;
    const token=state.motionId;currentMotion=token;
    activeLeg=null;
    if(!target||!state.visible){setCursor(null);currentVisual=null;publishGuidance(null,0);send({type:'navinside-animation-end',motionId:token});return;}
    const sameRoute=JSON.stringify(previousState.route)===JSON.stringify(state.route);
    const leg=sameRoute&&previousState.currentId!==state.currentId ? legBetween(previousState.currentId,state.currentId,
      state.route.findIndex(n=>n.id===state.currentId)<state.route.findIndex(n=>n.id===previousState.currentId)) : null;
    currentVisual=target;
    if(!leg){
      const index=state.route.findIndex(n=>n.id===state.currentId),next=state.route[index+1];
      const outgoing=next?.level===D.floor?legBetween(state.currentId,next.id):null;
      if(outgoing)showLeg(outgoing,0);else{setCursor(N[target]);publishGuidance(null,0);}
      send({type:'navinside-animation-end',motionId:token});return;
    }
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){showLeg(leg,1);send({type:'navinside-animation-end',motionId:token});return;}
    const speech=showLeg(leg,0)?.speech||'';
    const duration=Math.min(25000,Math.max(700,Number(state.voiceDurationMs)||1400,
      state.voiceActive?speech.split(/\s+/).length/2.2*1000:0));
    const began=performance.now();send({type:'navinside-animation-start',motionId:token,durationMs:duration});
    const frame=time=>{
      if(currentMotion!==token)return;
      const t=Math.min(1,(time-began)/duration);showLeg(leg,t);
      if(t<1)movement=requestAnimationFrame(frame);else{movement=0;send({type:'navinside-animation-end',motionId:token});}
    };
    movement=requestAnimationFrame(frame);
  }

  window.addEventListener('message',event=>{
    if(event.source!==window.parent||event.origin!==window.location.origin)return;
    const next=event.data;
    if(next?.type!=='navinside-map-state'||next.level!==D.floor||!Array.isArray(next.route)||!next.labels)return;
    const previous=state,previousId=currentVisual;state=next;MODE=state.accessible?'accesible':'normal';
    body.classList.toggle('acc',!!state.accessible);
    PLACES.forEach(p=>{const key=canonicalId(p.node);p.name=key&&!config.keepNames.includes(p.node)?state.labels[key]:originals[p.node];if(p.tag)p.tag.t=p.name;});
    mkG.querySelectorAll('.mk').forEach(marker=>{const p=localPoint(marker.dataset.node),key=canonicalId(marker.dataset.node),name=key&&!config.keepNames.includes(marker.dataset.node)?state.labels[key]:p?.name||N[marker.dataset.node]?.name||'';marker.setAttribute('aria-label',name);marker.classList.toggle('sel',marker.dataset.node===visualId(state.destinationId));const label=marker.querySelector('.name');if(label)label.textContent=name;});
    const originNode=visualId(state.originId);originMarker.style.display=originNode?'':'none';
    if(originNode){originMarker.dataset.x=N[originNode].x;originMarker.dataset.y=N[originNode].y;}
    $('searchBtn').setAttribute('aria-label',text().choose);
    followButton.setAttribute('aria-label',followLabel());
    const key=JSON.stringify([state.route,state.accessible]);
    drawHostRoute();
    if(key!==routeKey){routeKey=key;setFollowing(false);if(routePoints.length)fitPoints(routePoints);}
    if(!state.route.length&&state.destinationId!==previous.destinationId){const id=visualId(state.destinationId);if(id)fitPoints([N[id],localPoint(id)?.tag||N[id]]);}
    const currentOnFloor=(state.places||state.route).some(n=>n.id===state.currentId&&n.level===D.floor);
    const activeCanonical=currentOnFloor?state.currentId:null;
    const active=activeCanonical?visualId(activeCanonical):visualId(state.destinationId)||selectedVisual;
    selectedVisual=active;
    const linked=activeCanonical||(state.currentId&&visualId(state.currentId)===active?state.currentId:null);
    renderPanel(active,linked);
    updateCursor(previousId,previous);
  });
  const ICON_TABLE=[[/ascensor/,'🛗','ascensor'],[/escaler/,'🪜','escalera'],[/toalla/,'🧺','toallas'],[/bano|camarin/,'🚻','banos'],
    [/jacuzzi|tinaja|hot ?tub/,'♨️','jacuzzi'],[/sauna/,'🧖','sauna'],[/masaje|spa/,'💆','spa'],[/gimnasio|gym/,'🏋️','gimnasio'],
    [/tobogan/,'🛝','tobogan'],[/piscina|pool/,'🏊','piscina'],[/restaurant/,'🍽️','restaurante'],[/terraza/,'☀️','terraza'],
    [/mirador/,'🌊','mirador'],[/cancha|tenis/,'🎾','cancha'],[/salon|evento/,'🎉','salon'],[/recepcion/,'🛎️','recepcion'],
    [/lobby/,'🛋️','lobby'],[/hall/,'🏛️','hall'],[/minimarket|market/,'🛒','minimarket'],[/kid|club/,'🧸','kids'],
    [/juego|play/,'🎮','juegos'],[/habitacion/,'🛏️','habitacion'],[/pasillo/,'🚶','pasillo'],
    [/entrada|puerta|acceso/,'🚪','puerta'],[/estacionamiento/,'🅿️','estacionamiento']];
  function iconEntry(name){
    const n=String(name||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
    return ICON_TABLE.find(([re])=>re.test(n))||[null,'📍','punto'];
  }
  function iconFor(name){return iconEntry(name)[1];}
  function iconImg(name){return new URL('../iconos-puntos/'+iconEntry(name)[2]+'.svg',location.href).href;}
  const iconStyle=document.createElement('style');
  iconStyle.textContent='.places .pl img.navinside-icono{object-fit:contain;background:#eef2f7;padding:6px;box-sizing:border-box}.navinside-card>img.navinside-icono{object-fit:contain;background:#eef2f7;padding:6px;box-sizing:border-box}';
  document.head.appendChild(iconStyle);
  function fixIcons(){
    PLACES.forEach(p=>{if(!p.fotos.length)p.icon=iconFor(p.name);});
    mkG.querySelectorAll('.mk').forEach(g=>{
      const t=g.querySelector('.emoji');if(!t||g.querySelector('image'))return;
      const name=g.getAttribute('aria-label')||PLACES.find(p=>p.node===g.dataset.node)?.name||'';
      const id='icon-clip-'+(g.dataset.node||Math.random().toString(36).slice(2));
      const cp=el('clipPath',{id});cp.appendChild(el('circle',{r:17}));g.insertBefore(cp,t);
      g.insertBefore(el('image',{href:iconImg(name),x:-17,y:-17,width:34,height:34,'clip-path':`url(#${id})`,preserveAspectRatio:'xMidYMid slice'}),t);
      t.remove();
    });
  }
  try{fixIcons();}catch(error){ }

  const metrajeStyle=document.createElement('style');
  metrajeStyle.textContent='.navinside-metraje{pointer-events:none}.navinside-metraje rect{fill:#fff;stroke:#17345c;stroke-opacity:.35;stroke-width:1}.navinside-metraje text{font:700 10px system-ui,sans-serif;fill:#17345c;text-anchor:middle;dominant-baseline:central}.navinside-metraje.approx text{fill:#6b5310;font-style:italic}.navinside-metraje.approx rect{fill:#fff8e6}.navinside-metraje-off .navinside-metraje{display:none}.navinside-waze #top{display:none!important}.navinside-waze.navinside-lista #sheet{display:none!important}';
  document.head.appendChild(metrajeStyle);
  const metrajeG=el('g',{class:'navinside-metraje-capa'});
  routeG.parentNode.insertBefore(metrajeG,routeG.nextSibling);
  let metrajeSig='';
  function drawMetraje(){
    const list=state.metraje||[];
    const sig=JSON.stringify([list,state.language]);
    if(sig===metrajeSig)return;metrajeSig=sig;
    metrajeG.innerHTML='';
    const seen=new Set(),fmt=new Intl.NumberFormat(state.language||'es',{maximumFractionDigits:1});
    list.forEach(edge=>{
      const key=[edge.fromId,edge.toId].sort().join('|');
      if(seen.has(key)||!Number.isFinite(edge.meters))return;seen.add(key);
      const path=pathBetween(visualId(edge.fromId),visualId(edge.toId));
      if(path.length<2)return;
      const mid=guide.pose(guide.plan(pathPoints(path)),0.5);if(!mid)return;
      const label=(edge.approx?'≈ ':'')+fmt.format(edge.meters)+' m';
      const g=el('g',{class:'navinside-metraje'+(edge.approx?' approx':''),'aria-label':label});
      g.dataset.x=mid.x;g.dataset.y=mid.y;
      const w=label.length*6+8;
      g.appendChild(el('rect',{x:-w/2,y:-8,width:w,height:16,rx:8}));
      const t=el('text');t.textContent=label;g.appendChild(t);
      metrajeG.appendChild(g);
    });
    apply();
  }
  function placeMetraje(){
    const k=V.w/box().width;
    metrajeG.querySelectorAll('.navinside-metraje').forEach(g=>g.setAttribute('transform',`translate(${g.dataset.x} ${g.dataset.y}) rotate(${-V.rot}) scale(${k})`));
  }
  const applyWithMetraje=apply;
  apply=function(){applyWithMetraje();placeMetraje();};
  const metrajeButton=document.createElement('button');
  metrajeButton.type='button';metrajeButton.className='fab';metrajeButton.textContent='📏';
  metrajeButton.style.cssText='left:12px;right:auto;top:128px;bottom:auto';
  metrajeButton.setAttribute('aria-pressed','true');
  const metrajeLabel=()=>state.language==='en'?'Show corridor meters':state.language==='pt'?'Mostrar metragem':'Mostrar metraje';
  metrajeButton.setAttribute('aria-label',metrajeLabel());metrajeButton.title=metrajeLabel();
  metrajeButton.onclick=()=>{const off=document.body.classList.toggle('navinside-metraje-off');metrajeButton.setAttribute('aria-pressed',String(!off));};
  document.body.classList.add('navinside-metraje-off');
  window.addEventListener('message',event=>{
    if(event.source!==window.parent||event.origin!==window.location.origin)return;
    if(event.data?.type!=='navinside-map-state'||event.data.level!==D.floor)return;
    document.body.classList.toggle('navinside-waze',!!event.data.waze);
    metrajeButton.setAttribute('aria-label',metrajeLabel());metrajeButton.title=metrajeLabel();
    try{drawMetraje();}catch(error){ }
  });

  const wifiStyle=document.createElement('style');
  wifiStyle.textContent='.navinside-wifi{pointer-events:none}.navinside-wifi .halo{fill:#12a150;fill-opacity:.16;stroke:#12a150;stroke-opacity:.45;stroke-width:1.5}.navinside-wifi.tentative .halo{fill:#f0a43a;stroke:#f0a43a}.navinside-wifi.tentative .dot{fill:#f0a43a}.navinside-wifi text{font:700 11px system-ui,sans-serif;fill:#fff;paint-order:stroke;stroke:#0d5c30;stroke-width:3px}';
  document.head.appendChild(wifiStyle);
  const wifiCursor=el('g',{class:'navinside-wifi','aria-label':'Posición Wi-Fi'});
  const wifiHalo=el('circle',{class:'halo',r:20});
  wifiCursor.appendChild(wifiHalo);
  wifiCursor.appendChild(el('circle',{class:'dot',r:11,fill:'#12a150',stroke:'#fff','stroke-width':3}));
  const wifiLabel=el('text',{x:15,y:-12});wifiLabel.textContent='Wi-Fi';wifiCursor.appendChild(wifiLabel);
  wifiCursor.style.display='none';mkG.appendChild(wifiCursor);
  const wifiLegs=new Map();
  let wifiNow=null,wifiTarget=null,wifiFrame=0,wifiUncertainty=5;
  function wifiLeg(fromId,toId){
    const key=fromId+'|'+toId;
    if(!wifiLegs.has(key)){
      const path=pathBetween(visualId(fromId),visualId(toId));
      wifiLegs.set(key,path.length>1?guide.plan(pathPoints(path)):null);
    }
    return wifiLegs.get(key);
  }
  function placeWifi(){
    if(!wifiNow){wifiCursor.style.display='none';return;}
    wifiCursor.style.display='';
    if(mkG.lastChild!==wifiCursor)mkG.appendChild(wifiCursor);
    const k=V.w/box().width;
    const radius=Math.max(14,Math.min(160,wifiUncertainty/(SCALE_M||0.1)/k));
    wifiHalo.setAttribute('r',radius);
    wifiCursor.setAttribute('transform',`translate(${wifiNow.x} ${wifiNow.y}) rotate(${-V.rot}) scale(${k})`);
  }
  const applyWithWifi=apply;
  apply=function(){applyWithWifi();placeWifi();};
  function animateWifi(){
    cancelAnimationFrame(wifiFrame);
    const from=wifiNow?{...wifiNow}:{...wifiTarget},to={...wifiTarget},t0=performance.now();
    const jump=Math.hypot(to.x-from.x,to.y-from.y)*(SCALE_M||0.1)>6;
    if(!wifiNow||jump||document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches){
      wifiNow={x:to.x,y:to.y};
      if(following&&wifiTarget.firm&&cursor.style.display==='none'){V.cx=wifiNow.x;V.cy=wifiNow.y;}
      apply();
      return;
    }
    const step=t=>{
      const e=jump?1:Math.min(1,(t-t0)/260);
      wifiNow={x:from.x+(to.x-from.x)*e,y:from.y+(to.y-from.y)*e};
      if(following&&wifiTarget.firm&&cursor.style.display==='none'){V.cx=wifiNow.x;V.cy=wifiNow.y;}
      apply();
      if(e<1)wifiFrame=requestAnimationFrame(step);
    };
    wifiFrame=requestAnimationFrame(step);
    const objetivo=wifiTarget;
    setTimeout(()=>{
      if(wifiTarget!==objetivo||!wifiNow)return;
      if(Math.hypot(wifiNow.x-objetivo.x,wifiNow.y-objetivo.y)>0.5){
        cancelAnimationFrame(wifiFrame);wifiNow={x:objetivo.x,y:objetivo.y};apply();
      }
    },400);
  }
  window.addEventListener('message',event=>{
    if(event.source!==window.parent||event.origin!==window.location.origin)return;
    const m=event.data;
    if(m?.type!=='navinside-wifi-position'||m.level!==D.floor)return;
    if(!m.visible){cancelAnimationFrame(wifiFrame);wifiNow=null;wifiTarget=null;placeWifi();return;}
    const leg=wifiLeg(m.fromId,m.toId);
    const point=leg?guide.pose(leg,m.fraction):null;
    if(!point){cancelAnimationFrame(wifiFrame);wifiNow=null;wifiTarget=null;placeWifi();return;}
    wifiUncertainty=Number.isFinite(m.uncertaintyMeters)?m.uncertaintyMeters:5;
    wifiCursor.classList.toggle('tentative',!m.firm);
    wifiCursor.setAttribute('aria-label',(m.firm?'Posición Wi-Fi':'Posición Wi-Fi aproximada')+' ±'+Math.round(wifiUncertainty)+' m');
    wifiTarget={x:point.x,y:point.y,firm:!!m.firm};
    animateWifi();
  });

  function sendGeometry(){
    const ids=Object.keys(config.nodes).filter(id=>visualId(id));
    const nodes={},lengths={};
    ids.forEach(id=>{const v=N[visualId(id)];nodes[id]={x:v.x,y:v.y};});
    for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
      const points=pathPoints(pathBetween(visualId(ids[i]),visualId(ids[j])));
      if(points.length<2)continue;
      let d=0;for(let k=1;k<points.length;k++)d+=Math.hypot(points[k].x-points[k-1].x,points[k].y-points[k-1].y);
      if(d>0)lengths[ids[i]+'|'+ids[j]]=Math.round(d*(SCALE_M||0.1)*100)/100;
    }
    send({type:'navinside-map-geometry',scaleM:SCALE_M||0.1,nodes,lengths});
  }
  let placesSig='';
  function sendPlaces(){
    const list=PLACES.filter(p=>!(D.hide||[]).includes(p.node)).map(p=>({
      node:p.node,
      canonical:canonicalId(p.node)||config.destinations[p.node]||null,
      name:p.name,
      photo:p.fotos[0]?new URL(p.fotos[0],location.href).href:null,
      icon:p.icon||iconFor(p.name)
    }));
    const sig=JSON.stringify(list);
    if(sig!==placesSig){placesSig=sig;send({type:'navinside-places',places:list});}
  }
  window.addEventListener('message',event=>{
    if(event.source!==window.parent||event.origin!==window.location.origin)return;
    const m=event.data;
    if(m?.level!==D.floor)return;
    if(m.type==='navinside-map-state'){try{sendPlaces();}catch(error){ }}
    if(m.type==='navinside-open-place'&&typeof m.node==='string'&&PLACES.some(p=>p.node===m.node))openPlace(m.node);
  });

  showList();send({type:'navinside-map-ready'});
  try{sendGeometry();}catch(error){ }
})();
