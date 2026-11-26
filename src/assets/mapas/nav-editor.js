(function () {
  "use strict";
  if (!/[?&]editor=1/.test(location.search) || typeof D === "undefined") return;

  var NS = "http://www.w3.org/2000/svg";
  var CLAVE = "navinside-editor-piso" + D.floor;
  var GROSOR = 3.4;
  var ANCHO_PUERTA_HUECO = 6;
  var MAX_VERTICES = 700;

  var vacio = function () { return { nodos: {}, tags: {}, muros: [], puertas: [], borrados: [], trazos: {} }; };
  var E;
  try { E = JSON.parse(localStorage.getItem(CLAVE)) || vacio(); } catch (e) { E = vacio(); }
  ["nodos", "tags", "trazos"].forEach(function (k) { E[k] = E[k] || {}; });
  ["muros", "puertas", "borrados"].forEach(function (k) { E[k] = E[k] || []; });

  var hist = [], herramienta = "puntos", pendiente = null, muroNuevo = null, seleccion = null, ultimoToqueManija = 0;
  var guardar = function () { try { localStorage.setItem(CLAVE, JSON.stringify(E)); } catch (e) {} };
  var marcar = function () { hist.push(JSON.stringify(E)); if (hist.length > 80) hist.shift(); };
  var mk = function (t, a, p) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
  var r1 = function (v) { return Math.round(v * 10) / 10; };
  var ptsMuro = function (m) { return Array.isArray(m) ? m : m.p; };
  var grosorMuro = function (m) { return Array.isArray(m) ? GROSOR : (m.g || GROSOR); };
  var info = function (t) { document.getElementById("edInfo").textContent = t; };

  var murosPlano = Array.prototype.slice.call(document.querySelectorAll("#map .wall"));
  function leerTrazos(d) {
    return (d || "").split(/(?=M)/).filter(function (s) { return s.trim(); }).map(function (s) {
      var nums = s.match(/-?\d+(?:\.\d+)?/g) || [], pts = [];
      for (var i = 0; i + 1 < nums.length; i += 2) pts.push([+nums[i], +nums[i + 1]]);
      return { pts: pts, cerrado: /z/i.test(s) };
    });
  }
  function escribirTrazos(tr) {
    return tr.map(function (t) { return t.pts.length ? "M" + t.pts.map(function (p) { return r1(p[0]) + " " + r1(p[1]); }).join(" L") + (t.cerrado ? "Z" : "") : ""; }).join("");
  }
  var trazosPlano = murosPlano.map(function (el) { return leerTrazos(el.getAttribute("d")); });
  Object.keys(E.trazos).forEach(function (k) {
    var m = k.match(/^e(\d+)s(\d+)$/); if (!m) return;
    var t = trazosPlano[+m[1]] && trazosPlano[+m[1]][+m[2]];
    if (t) t.pts = E.trazos[k].map(function (p) { return p.slice(); });
  });
  var murosLinea = Array.prototype.slice.call(document.querySelectorAll("#map .muro-linea"));
  if (murosLinea.length && !E.importado) {
    E.muros = murosLinea.map(function (el) {
      var t = leerTrazos(el.getAttribute("d"))[0];
      return { p: t ? t.pts : [], g: +el.getAttribute("stroke-width") || GROSOR };
    }).filter(function (m) { return m.p.length >= 2; }).concat(E.muros);
    E.importado = 1;
    try { localStorage.setItem(CLAVE, JSON.stringify(E)); } catch (e) {}
  }
  murosLinea.forEach(function (el) { el.style.display = "none"; });

  function redibujarMuroPlano(ei) { murosPlano[ei].setAttribute("d", escribirTrazos(trazosPlano[ei])); }
  murosPlano.forEach(function (el, ei) { if (Object.keys(E.trazos).some(function (k) { return k.indexOf("e" + ei + "s") === 0; })) redibujarMuroPlano(ei); });

  Object.keys(E.nodos).forEach(function (k) { if (N[k]) { N[k].x = E.nodos[k].x; N[k].y = E.nodos[k].y; } });
  function aplicarTags() {
    D.tags.forEach(function (t) { var g = E.tags[t.n]; if (g) { t.x = g.x; t.y = g.y; } });
    if (typeof PLACES !== "undefined") PLACES.forEach(function (p) { var g = E.tags[p.node]; if (g && p.tag) { p.tag.x = g.x; p.tag.y = g.y; } });
  }
  aplicarTags();

  var css = document.createElement("style");
  css.textContent =
    "body.nt-editor #top,body.nt-editor #sheet,body.nt-editor #banner,body.nt-editor #ntLegendBtn,body.nt-editor #ntLegend,body.nt-editor #recenter{display:none!important}" +
    "#edBar{position:fixed;left:0;right:0;bottom:0;z-index:50;background:var(--sheet,#fff);border-top:1px solid var(--line,#ddd);padding:8px 10px calc(10px + env(safe-area-inset-bottom));font-family:'Barlow Semi Condensed',system-ui,sans-serif;box-shadow:0 -6px 20px rgba(0,0,0,.12)}" +
    "#edBar .t{font-weight:700;font-size:16px;margin:0 0 2px}#edInfo{font-size:13px;color:var(--muted,#667);min-height:17px;margin-bottom:6px}" +
    "#edBar .f{display:flex;gap:6px;flex-wrap:wrap}#edBar button{font:600 14px 'Barlow Semi Condensed',system-ui;border:1px solid var(--line,#ccd);background:var(--chip,#f1f3f5);color:var(--ink,#123);border-radius:11px;padding:7px 10px;min-height:38px}" +
    "#edBar button.on{background:#1A73E8;border-color:#1A73E8;color:#fff}#edBar button.ok{background:#0E9DAB;border-color:#0E9DAB;color:#fff}#edBar button.peligro{color:#B42318}" +
    "#edBar .f:empty{display:none}" +
    ".ed-nodo{fill:#1A73E8;stroke:#fff;cursor:grab}.ed-nodo.fijo{fill:#F59E0B}.ed-arista{stroke:#1A73E8;stroke-dasharray:3 2;opacity:.55;fill:none}" +
    ".ed-lbl{fill:#1A73E8;font-weight:600;font-family:'Barlow Semi Condensed',sans-serif;pointer-events:none}" +
    ".ed-tag{fill:rgba(14,157,171,.25);stroke:#0E9DAB;cursor:grab}" +
    ".ed-muro{fill:var(--wall,#4F5D6E)}.ed-borrado{fill:var(--floor,#fff)}.ed-borrado-marco{fill:none;stroke:#E11D48;stroke-dasharray:2 1.5;stroke-width:.6}" +
    ".ed-puerta path{fill:none;stroke:#0E9DAB;stroke-linecap:round}.ed-pend{fill:#E11D48}" +
    ".ed-v{fill:#fff;stroke:#E11D48;cursor:grab}.ed-v.mio{stroke:#1A73E8}.ed-v.sel{fill:#E11D48}.ed-v.mio.sel{fill:#1A73E8}" +
    ".ed-nuevo{fill:none;stroke:#1A73E8;stroke-dasharray:2 1.5}";
  document.head.appendChild(css);
  document.body.classList.add("nt-editor");

  var bar = document.createElement("div");
  bar.id = "edBar";
  bar.innerHTML =
    '<p class="t">Editor del plano · Piso ' + D.floor + '</p><div id="edInfo"></div>' +
    '<div class="f" id="edHerr">' +
    '<button data-h="puntos">⦿ Puntos de ruta</button><button data-h="iconos">◎ Íconos</button>' +
    '<button data-h="vertices">✎ Vértices</button><button data-h="muro">▬ Muro</button><button data-h="puerta">🚪 Puerta</button>' +
    '<button data-h="borrador">⌫ Borrar muro</button><button data-h="eliminar">🗑 Quitar lo mío</button>' +
    '<button id="edEnderezar">📏 Enderezar muros</button></div>' +
    '<div class="f" id="edCtx" style="margin-top:6px"></div>' +
    '<div class="f" style="margin-top:6px"><button id="edDeshacer">↶ Deshacer</button><button id="edReset">Restablecer</button><button id="edListo" class="ok">✓ Diseño listo</button></div>';
  document.body.appendChild(bar);

  var AYUDA = {
    puntos: "Arrastra los puntos azules: son por donde pasan las rutas. Los naranjos son puertas y entradas.",
    iconos: "Arrastra los círculos turquesa para mover los íconos de los lugares.",
    vertices: "Arrastra los vértices para mover los muros. Toca uno para quitarlo o agregar otro al lado.",
    muro: "Toca para poner cada vértice del muro. Luego «Terminar muro».",
    puerta: "Toca los dos extremos del vano: se abre el muro y se dibuja la puerta.",
    borrador: "Toca dos esquinas de un rectángulo para borrar ese trozo de muro.",
    eliminar: "Toca un muro, puerta o borrado que agregaste para quitarlo."
  };
  function elegir(h) {
    if (muroNuevo) terminarMuro();
    herramienta = h; pendiente = null; seleccion = null;
    [].forEach.call(document.querySelectorAll("#edHerr button"), function (b) { b.classList.toggle("on", b.dataset.h === h); });
    info(AYUDA[h]);
    dibujar();
  }
  [].forEach.call(document.querySelectorAll("#edHerr button"), function (b) { b.onclick = function () { elegir(b.dataset.h); }; });

  function contexto() {
    var c = document.getElementById("edCtx"); c.innerHTML = "";
    var b = function (t, fn, cls) { var x = document.createElement("button"); x.textContent = t; if (cls) x.className = cls; x.onclick = fn; c.appendChild(x); };
    if (herramienta === "muro" && muroNuevo) {
      b("✓ Terminar muro", function () { terminarMuro(); dibujar(); }, "ok");
      b("✕ Cancelar", function () { muroNuevo = null; dibujar(); });
    }
    if (herramienta === "vertices" && seleccion) {
      b("＋ Agregar vértice al lado", agregarVertice);
      b("🗑 Quitar vértice", quitarVertice, "peligro");
    }
  }

  var world = document.getElementById("world"), routeG = document.getElementById("routeG");
  var capaPlano = mk("g", { id: "edPlano" }); world.insertBefore(capaPlano, routeG);
  var capaEdit = mk("g", { id: "edCapa" }); world.appendChild(capaEdit);
  var esc = function () { return (V && V.w ? V.w : 600) / 160; };

  function franja(a, b, ancho) {
    var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * ancho / 2, ny = dx / l * ancho / 2;
    return "M" + [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]].map(function (p) { return r1(p[0]) + " " + r1(p[1]); }).join(" L") + "Z";
  }
  function muroPoli(pts, ancho) {
    var d = "";
    for (var i = 0; i < pts.length - 1; i++) d += franja(pts[i], pts[i + 1], ancho);
    var h = ancho / 2;
    for (var j = 0; j < pts.length; j++) { var p = pts[j]; d += "M" + r1(p[0] - h) + " " + r1(p[1] - h) + " L" + r1(p[0] + h) + " " + r1(p[1] - h) + " L" + r1(p[0] + h) + " " + r1(p[1] + h) + " L" + r1(p[0] - h) + " " + r1(p[1] + h) + "Z"; }
    return d;
  }
  function rect(a, b) {
    var x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
    return "M" + x0 + " " + y0 + " L" + x1 + " " + y0 + " L" + x1 + " " + y1 + " L" + x0 + " " + y1 + "Z";
  }
  function quitable(el, lista, i) {
    el.addEventListener("pointerdown", function (ev) {
      if (herramienta !== "eliminar") return;
      ev.stopPropagation(); ev.preventDefault();
      marcar(); E[lista].splice(i, 1); guardar(); dibujar();
    });
  }

  function dibujarPlano() {
    capaPlano.innerHTML = "";
    E.borrados.forEach(function (b, i) { quitable(mk("path", { "class": "nt-hueco ed-borrado", d: rect(b[0], b[1]) }, capaPlano), "borrados", i); });
    E.puertas.forEach(function (pu, i) {
      mk("path", { "class": "nt-hueco ed-borrado", d: franja(pu[0], pu[1], ANCHO_PUERTA_HUECO) }, capaPlano);
      var a = pu[0], b = pu[1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
      var nx = -uy, ny = ux, h = l / 2, ang = 1.15;
      var h1 = [a[0] + (ux * Math.cos(ang) + nx * Math.sin(ang)) * h, a[1] + (uy * Math.cos(ang) + ny * Math.sin(ang)) * h];
      var h2 = [b[0] + (-ux * Math.cos(ang) + nx * Math.sin(ang)) * h, b[1] + (-uy * Math.cos(ang) + ny * Math.sin(ang)) * h];
      var m1 = [a[0] + ux * h, a[1] + uy * h];
      var g = mk("g", { "class": "nt-puerta ed-puerta" }, capaPlano);
      mk("path", { d: "M" + r1(a[0]) + " " + r1(a[1]) + "L" + r1(h1[0]) + " " + r1(h1[1]), "stroke-width": 1.4 }, g);
      mk("path", { d: "M" + r1(b[0]) + " " + r1(b[1]) + "L" + r1(h2[0]) + " " + r1(h2[1]), "stroke-width": 1.4 }, g);
      mk("path", { "class": "arco", d: "M" + r1(h1[0]) + " " + r1(h1[1]) + "A" + r1(h) + " " + r1(h) + " 0 0 1 " + r1(m1[0]) + " " + r1(m1[1]) + "M" + r1(h2[0]) + " " + r1(h2[1]) + "A" + r1(h) + " " + r1(h) + " 0 0 0 " + r1(m1[0]) + " " + r1(m1[1]), "stroke-width": .8, "stroke-dasharray": "2 1.5" }, g);
      mk("path", { d: franja(a, b, Math.max(ANCHO_PUERTA_HUECO, esc() * 5)), fill: "transparent", stroke: "none" }, g);
      quitable(g, "puertas", i);
    });
    E.muros.forEach(function (m, i) {
      var dl = "M" + ptsMuro(m).map(function (p) { return p[0] + " " + p[1]; }).join(" L");
      mk("path", { "class": "ed-muro-linea", d: dl, fill: "none", stroke: "var(--wall)", "stroke-width": grosorMuro(m), "stroke-linejoin": "round", "stroke-linecap": "round" }, capaPlano);
      quitable(mk("path", { d: dl, fill: "none", stroke: "transparent", "stroke-width": Math.max(grosorMuro(m), esc() * 5), "pointer-events": "stroke" }, capaPlano), "muros", i);
    });
  }

  function arrastrar(el, alMover, alTocar) {
    el.addEventListener("pointerdown", function (ev) {
      ev.stopPropagation(); ev.preventDefault();
      var antes = JSON.stringify(E), movido = false, x0 = ev.clientX, y0 = ev.clientY;
      function mov(e) {
        if (!movido && Math.hypot(e.clientX - x0, e.clientY - y0) < 4) return;
        var w = toWorld(e.clientX, e.clientY); movido = true; alMover(r1(w.x), r1(w.y));
      }
      function fin() {
        window.removeEventListener("pointermove", mov); window.removeEventListener("pointerup", fin); window.removeEventListener("pointercancel", fin);
        if (movido) { hist.push(antes); guardar(); } else if (alTocar) alTocar();
        ultimoToqueManija = Date.now();
        dibujar();
      }
      window.addEventListener("pointermove", mov); window.addEventListener("pointerup", fin); window.addEventListener("pointercancel", fin);
    });
  }

  function refrescarBandas() {
    var pts = function (b) { return b.map(function (k) { return N[k].x + "," + N[k].y; }).join(" "); };
    var bandas = document.querySelectorAll("#floorG .floorband"), curbs = document.querySelectorAll("#ntCurbG .nt-curb");
    D.bands.forEach(function (b, i) { if (bandas[i]) bandas[i].setAttribute("points", pts(b)); if (curbs[i]) curbs[i].setAttribute("points", pts(b)); });
  }

  function puntosDe(sel) { return sel.tipo === "plano" ? trazosPlano[sel.e][sel.s].pts : ptsMuro(E.muros[sel.m]); }
  function guardarTrazo(sel) {
    if (sel.tipo !== "plano") return;
    E.trazos["e" + sel.e + "s" + sel.s] = trazosPlano[sel.e][sel.s].pts.map(function (p) { return p.slice(); });
    redibujarMuroPlano(sel.e);
  }
  function agregarVertice() {
    if (!seleccion) return;
    var pts = puntosDe(seleccion), i = seleccion.i, j = (i + 1) % pts.length;
    if (seleccion.tipo === "mio" && i === pts.length - 1) j = i - 1;
    marcar();
    var nuevo = [r1((pts[i][0] + pts[j][0]) / 2), r1((pts[i][1] + pts[j][1]) / 2)];
    var pos = Math.max(i, j) === pts.length - 1 && Math.min(i, j) === 0 && seleccion.tipo === "plano" ? pts.length : Math.max(i, j);
    pts.splice(pos, 0, nuevo);
    seleccion.i = pos; guardarTrazo(seleccion); guardar(); dibujar();
  }
  function quitarVertice() {
    if (!seleccion) return;
    var pts = puntosDe(seleccion), minimo = seleccion.tipo === "mio" ? 2 : 3;
    if (pts.length <= minimo) { info("Ese muro ya tiene el mínimo de vértices."); return; }
    marcar(); pts.splice(seleccion.i, 1); guardarTrazo(seleccion); seleccion = null; guardar(); dibujar();
  }

  function enVista() {
    var b = document.getElementById("stage").getBoundingClientRect(), h = V.w * b.height / b.width, m = V.w * 0.05;
    return { x0: V.cx - V.w / 2 - m, x1: V.cx + V.w / 2 + m, y0: V.cy - h / 2 - m, y1: V.cy + h / 2 + m };
  }

  function dibujarManijas() {
    capaEdit.innerHTML = "";
    var s = esc();
    if (herramienta === "puntos") {
      D.edges.forEach(function (e) { if (N[e[0]] && N[e[1]]) mk("line", { x1: N[e[0]].x, y1: N[e[0]].y, x2: N[e[1]].x, y2: N[e[1]].y, "class": "ed-arista", "stroke-width": s * .35 }, capaEdit); });
      Object.keys(N).forEach(function (k) {
        if (k.charAt(0) === "~") return;
        var nm = (N[k].name || "").toLowerCase();
        var c = mk("circle", { cx: N[k].x, cy: N[k].y, r: s * 1.6, "class": "ed-nodo" + (/^(puerta|entrada)/.test(nm) ? " fijo" : ""), "stroke-width": s * .4 }, capaEdit);
        var t = mk("text", { x: N[k].x + s * 2, y: N[k].y - s * 1.2, "class": "ed-lbl", style: "font-size:" + (s * 2.2) + "px" }, capaEdit);
        t.textContent = N[k].name || k;
        arrastrar(c, function (x, y) {
          N[k].x = x; N[k].y = y; E.nodos[k] = { x: x, y: y };
          c.setAttribute("cx", x); c.setAttribute("cy", y); t.setAttribute("x", x + s * 2); t.setAttribute("y", y - s * 1.2);
          refrescarBandas();
        });
      });
    } else if (herramienta === "iconos") {
      D.tags.forEach(function (tg) {
        var c = mk("circle", { cx: tg.x, cy: tg.y, r: s * 5, "class": "ed-tag", "stroke-width": s * .4 }, capaEdit);
        arrastrar(c, function (x, y) { E.tags[tg.n] = { x: x, y: y }; aplicarTags(); c.setAttribute("cx", x); c.setAttribute("cy", y); buildMarkers(); });
      });
    } else if (herramienta === "vertices") {
      var vista = enVista(), lista = [];
      var dentro = function (p) { return p[0] >= vista.x0 && p[0] <= vista.x1 && p[1] >= vista.y0 && p[1] <= vista.y1; };
      E.muros.forEach(function (m, mi) { ptsMuro(m).forEach(function (p, i) { if (dentro(p)) lista.push({ tipo: "mio", m: mi, i: i }); }); });
      if (!E.ocultarTrazado) trazosPlano.forEach(function (tr, e) { tr.forEach(function (t, si) { t.pts.forEach(function (p, i) { if (dentro(p)) lista.push({ tipo: "plano", e: e, s: si, i: i }); }); }); });
      if (lista.length > MAX_VERTICES) {
        info("Hay " + lista.length + " vértices a la vista: acerca el zoom a la zona que quieres cambiar.");
        lista = [];
      } else info(AYUDA.vertices);
      lista.forEach(function (v) {
        var pts = puntosDe(v), p = pts[v.i];
        var es = seleccion && seleccion.tipo === v.tipo && seleccion.i === v.i && (v.tipo === "mio" ? seleccion.m === v.m : seleccion.e === v.e && seleccion.s === v.s);
        var c = mk("circle", { cx: p[0], cy: p[1], r: s * (es ? 1.1 : 0.75), "class": "ed-v" + (v.tipo === "mio" ? " mio" : "") + (es ? " sel" : ""), "stroke-width": s * .35 }, capaEdit);
        var unidos = null;
        arrastrar(c, function (x, y) {
          if (v.tipo === "mio" && !unidos) {
            var p0 = pts[v.i].slice(); unidos = [];
            E.muros.forEach(function (m) { ptsMuro(m).forEach(function (q, qi, arr) { if (Math.abs(q[0] - p0[0]) < 0.05 && Math.abs(q[1] - p0[1]) < 0.05) unidos.push([arr, qi]); }); });
          }
          if (unidos) unidos.forEach(function (u) { u[0][u[1]] = [x, y]; }); else pts[v.i] = [x, y];
          seleccion = v;
          c.setAttribute("cx", x); c.setAttribute("cy", y);
          if (v.tipo === "plano") guardarTrazo(v); else dibujarPlano();
        }, function () { seleccion = v; });
      });
    } else if (herramienta === "borrador") {
      E.borrados.forEach(function (b) { mk("path", { d: rect(b[0], b[1]), "class": "ed-borrado-marco" }, capaEdit); });
    }
    if (muroNuevo) {
      mk("polyline", { points: muroNuevo.map(function (p) { return p.join(","); }).join(" "), "class": "ed-nuevo", "stroke-width": s * .6 }, capaEdit);
      muroNuevo.forEach(function (p) { mk("circle", { cx: p[0], cy: p[1], r: s * 1.1, "class": "ed-pend" }, capaEdit); });
    }
    if (pendiente) mk("circle", { cx: pendiente[0], cy: pendiente[1], r: s * 1.3, "class": "ed-pend" }, capaEdit);
    contexto();
  }

  function terminarMuro() {
    if (muroNuevo && muroNuevo.length >= 2) { marcar(); E.muros.push(muroNuevo); guardar(); }
    muroNuevo = null; info(AYUDA[herramienta]);
  }

  function dibujar() { dibujarPlano(); dibujarManijas(); }

  var stage = document.getElementById("stage"), inicio = null;
  stage.addEventListener("pointerdown", function (e) { inicio = { x: e.clientX, y: e.clientY }; }, true);
  stage.addEventListener("click", function (e) {
    if (Date.now() - ultimoToqueManija < 400) return;
    if (inicio && Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) > 8) return;
    if (herramienta === "vertices" && seleccion) { seleccion = null; dibujar(); return; }
    if (["muro", "puerta", "borrador"].indexOf(herramienta) < 0) return;
    e.stopPropagation(); e.preventDefault();
    var w = toWorld(e.clientX, e.clientY), p = [r1(w.x), r1(w.y)];
    if (herramienta === "muro") {
      muroNuevo = muroNuevo || [];
      muroNuevo.push(p);
      info(muroNuevo.length < 2 ? "Toca el siguiente vértice." : "Sigue tocando para agregar vértices, o «Terminar muro».");
      dibujar(); return;
    }
    if (!pendiente) { pendiente = p; info("Ahora toca el segundo punto."); dibujar(); return; }
    var a = pendiente; pendiente = null;
    if (Math.hypot(p[0] - a[0], p[1] - a[1]) < 1) { dibujar(); return; }
    marcar();
    if (herramienta === "puerta") E.puertas.push([a, p]); else E.borrados.push([a, p]);
    guardar(); info(AYUDA[herramienta]); dibujar();
  }, true);

  document.getElementById("edDeshacer").onclick = function () {
    if (!hist.length) return;
    E = JSON.parse(hist.pop()); guardar();
    location.reload();
  };
  document.getElementById("edReset").onclick = function () {
    if (!confirm("¿Borrar todos tus cambios y volver al plano original?")) return;
    try { localStorage.removeItem(CLAVE); } catch (e) {}
    location.reload();
  };
  document.getElementById("edListo").onclick = function () {
    if (muroNuevo) terminarMuro();
    E.listo = new Date().toISOString(); guardar();
    try {
      var blob = new Blob([JSON.stringify(E)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "diseno-nivel-" + D.floor + ".json";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    } catch (e) { }
    info("✓ Guardado y descargado como diseno-nivel-" + D.floor + ".json. Avisa al equipo que el diseño está listo.");
  };

  var _apply = apply, pendienteManijas = 0;
  apply = function () {
    _apply();
    if (!capaEdit) return;
    clearTimeout(pendienteManijas);
    pendienteManijas = setTimeout(dibujarManijas, 40);
  };

  function aplicarOcultar() {
    murosPlano.forEach(function (el) { el.style.display = E.ocultarTrazado ? "none" : ""; });
    var b = document.getElementById("edEnderezar");
    if (b) {
      b.textContent = E.ocultarTrazado ? "↺ Volver al trazado original" : "📏 Enderezar muros";
      b.style.display = murosPlano.length ? "" : "none";
    }
  }
  function cargarEnderezar(listo) {
    if (window.enderezarMuros) return listo();
    var s = document.createElement("script");
    s.src = "nav-enderezar.js?v=" + Date.now(); s.onload = listo;
    s.onerror = function () { info("No se pudo cargar la herramienta para enderezar muros."); };
    document.body.appendChild(s);
  }
  document.getElementById("edEnderezar").onclick = function () {
    if (E.ocultarTrazado) {
      if (!confirm("¿Quitar los muros rectos generados y volver al trazado original? (Tus muros dibujados a mano se mantienen.)")) return;
      marcar();
      E.muros = E.muros.filter(function (m) { return !(m && m.a); });
      E.ocultarTrazado = false; guardar(); aplicarOcultar(); dibujar();
      info("Volviste al trazado original.");
      return;
    }
    if (!confirm("Se reemplazarán los muros dentados del plano por muros rectos que puedes mover por sus vértices. ¿Continuar?")) return;
    info("Enderezando muros… (puede tardar unos segundos)");
    setTimeout(function () {
      cargarEnderezar(function () {
        try {
          murosPlano.forEach(function (el) { el.style.display = ""; });
          var huecos = Array.prototype.slice.call(document.querySelectorAll("#map .nt-hueco"));
          var rectos = window.enderezarMuros(murosPlano, huecos, {});
          marcar();
          E.muros = E.muros.filter(function (m) { return !(m && m.a); }).concat(rectos.map(function (m) { m.a = 1; return m; }));
          E.ocultarTrazado = true; E.trazos = {};
          guardar(); aplicarOcultar(); elegir("vertices");
          var nv = 0; rectos.forEach(function (m) { nv += m.p.length; });
          info("Listo: " + rectos.length + " muros rectos con " + nv + " vértices. Acerca el zoom y arrastra los vértices para ajustarlos.");
        } catch (err) {
          aplicarOcultar();
          info("No se pudieron enderezar los muros: " + (err && err.message ? err.message : err));
        }
      });
    }, 30);
  };
  aplicarOcultar();

  window.disenoEditor = function () { return JSON.parse(JSON.stringify(E)); };
  refrescarBandas();
  buildMarkers();
  elegir("puntos");
})();
