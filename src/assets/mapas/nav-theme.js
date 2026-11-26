(function () {
  "use strict";
  var NSV = "http://www.w3.org/2000/svg";
  var mk = function (t, a) { var e = document.createElementNS(NSV, t); for (var k in a) e.setAttribute(k, a[k]); return e; };
  var byId = function (id) { return document.getElementById(id); };
  var svgEl = byId("map"), floorG = byId("floorG");
  var M = SCALE_M;
  var u = function (m) { return m / M; };

  var defs = mk("defs", {});
  var t = u(1.2);
  var tile = mk("pattern", { id: "ntTile", patternUnits: "userSpaceOnUse", width: t, height: t });
  tile.appendChild(mk("rect", { width: t, height: t, fill: "var(--floor)" }));
  tile.appendChild(mk("path", { d: "M0 0H" + t + "M0 0V" + t, stroke: "var(--tile)", "stroke-width": t * 0.05, fill: "none" }));
  defs.appendChild(tile);
  var h = u(2.4);
  var hatch = mk("pattern", { id: "ntHatch", patternUnits: "userSpaceOnUse", width: h, height: h, patternTransform: "rotate(45)" });
  hatch.appendChild(mk("rect", { width: h, height: h, fill: "var(--bg)" }));
  hatch.appendChild(mk("line", { x1: 0, y1: 0, x2: 0, y2: h, stroke: "var(--hatch)", "stroke-width": h * 0.18 }));
  defs.appendChild(hatch);
  var water = mk("linearGradient", { id: "ntWater", x1: 0, y1: 0, x2: 1, y2: 1 });
  water.appendChild(mk("stop", { offset: "0", "stop-color": "#8FD3F4" }));
  water.appendChild(mk("stop", { offset: "1", "stop-color": "#3FA6DE" }));
  defs.appendChild(water);
  svgEl.insertBefore(defs, svgEl.firstChild);
  var bgRect = byId("bgRect");
  if (bgRect) {
    bgRect.setAttribute("x", -60000); bgRect.setAttribute("y", -60000);
    bgRect.setAttribute("width", 150000); bgRect.setAttribute("height", 150000);
    bgRect.setAttribute("fill", "url(#ntHatch)");
  }

  var curbG = mk("g", { id: "ntCurbG", "aria-hidden": "true" });
  floorG.parentNode.insertBefore(curbG, floorG);
  function buildCurbs() {
    curbG.innerHTML = "";
    floorG.querySelectorAll(".floorband").forEach(function (pl) {
      var sw = parseFloat(getComputedStyle(pl).strokeWidth) || 44;
      curbG.appendChild(mk("polyline", { "class": "nt-curb", points: pl.getAttribute("points"), "stroke-width": sw + u(0.9) }));
    });
    floorG.querySelectorAll(".floorpoly").forEach(function (p) {
      curbG.appendChild(mk("path", { "class": "nt-curbpoly", d: p.getAttribute("d"), stroke: "var(--curb)", "stroke-width": u(0.9) }));
    });
  }
  buildCurbs();

  var sky = document.createElement("div");
  sky.id = "ntSky";
  byId("stage").appendChild(sky);

  function fab(id, label, html) {
    var b = document.createElement("button");
    b.className = "fab"; b.id = id; b.setAttribute("aria-label", label); b.innerHTML = html;
    document.body.appendChild(b); return b;
  }
  var zIn = fab("ntZoomIn", "Acercar", "+");
  var zOut = fab("ntZoomOut", "Alejar", "−");
  var comp = fab("ntCompass", "Norte arriba",
    '<svg viewBox="-15 -15 30 30" aria-hidden="true"><path d="M0 -12 L5 0 L-5 0Z" fill="#E5484D"/><path d="M0 12 L5 0 L-5 0Z" fill="#9AA6B2"/></svg>');
  var needle = comp.querySelector("svg");
  var legBtn = fab("ntLegendBtn", "Leyenda del plano", "ⓘ");
  var leg = document.createElement("div");
  leg.id = "ntLegend"; leg.setAttribute("role", "dialog"); leg.setAttribute("aria-label", "Leyenda");
  leg.innerHTML = "<b>Leyenda</b>" +
    '<div><span class="dot" style="background:#fff;border:2.5px solid var(--poi)"></span>Punto de interés (toca para ver fotos)</div>' +
    '<div><span class="dot" style="background:var(--here);box-shadow:0 0 0 4px rgba(43,139,255,.25)"></span>Salida de ascensores</div>' +
    '<div><i style="background:var(--floor);border:1.5px solid var(--curb)"></i>Pasillo / zona caminable</div>' +
    '<div><i style="background:repeating-linear-gradient(45deg,var(--hatch) 0 3px,var(--bg) 3px 7px);border:1px solid var(--line)"></i>Exterior del edificio</div>';
  document.body.appendChild(leg);
  legBtn.onclick = function () { leg.classList.toggle("on"); };

  var navZoom = 1;
  window.ntNavMeters = function () {
    var w = byId("stage").getBoundingClientRect().width || 400;
    var base = Math.min(Math.max(w / 13, 24), 40);
    return base * navZoom;
  };
  function isNav() { return document.body.classList.contains("nav"); }
  function zoom(f) {
    if (isNav()) { navZoom = Math.min(Math.max(navZoom * f, 0.5), 2.5); renderNav(); return; }
    animTo({ cx: V.cx, cy: V.cy, w: Math.min(Math.max(V.w * f, 160), 6000), rot: V.rot }, 250);
  }
  zIn.onclick = function () { zoom(1 / 1.4); };
  zOut.onclick = function () { zoom(1.4); };
  comp.onclick = function () { if (!isNav()) animTo({ cx: V.cx, cy: V.cy, w: V.w, rot: 0 }, 350); };

  var _apply = apply;
  apply = function () {
    _apply();
    needle.style.transform = "rotate(" + V.rot + "deg)";
    var txt = byId("scaleTxt"), m = parseFloat(txt.textContent);
    if (m) txt.innerHTML = m + " m<span class=\"nt-steps\">· " + Math.max(1, Math.round(m / 0.7)) + " pasos</span>";
  };

  var _drawRoute = drawRoute;
  drawRoute = function () {
    _drawRoute();
    var cs = byId("routeG").querySelector(".r-case");
    if (cs) byId("routeG").insertBefore(mk("path", { "class": "r-glow", d: cs.getAttribute("d"), "data-w": 30 }), cs);
    var pin = byId("mkG").querySelector(".pin");
    if (pin) pin.insertBefore(mk("circle", { "class": "nt-pulse", r: 14 }), pin.firstChild);
    apply();
  };

  var _startNav = startNav;
  startNav = function () {
    navZoom = 1;
    _startNav();
    var me = byId("mkG").querySelector(".me");
    if (me) {
      me.insertBefore(mk("circle", { "class": "nt-halo", r: 32 }), me.firstChild);
      var ar = me.querySelector(".arrow");
      if (ar) ar.setAttribute("d", "M0 -22 L16 17 L0 8 L-16 17 Z");
    }
    leg.classList.remove("on");
  };

  var _openPlace = openPlace, _dijkstra = dijkstra;
  openPlace = function (n) {
    dijkstra = function () { return null; };
    try { _openPlace(n); } finally { dijkstra = _dijkstra; }
    route = null;
    document.body.classList.remove("routing");
    drawRoute();
    var c = byId("card");
    c.querySelectorAll(".seg").forEach(function (e) { e.remove(); });
    ["orig", "startNav"].forEach(function (id) { var e = byId(id); if (e && e.closest(".row")) e.closest(".row").remove(); });
    Array.prototype.slice.call(c.children).forEach(function (e) {
      if (e.matches(".eta, p.sub") || (e.tagName === "DIV" && !e.className && !e.querySelector("img,button,h2"))) e.remove();
    });
    var p = PL[n];
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      apply();
      if (p) animTo({ cx: p.tag.x, cy: p.tag.y + sheetH() * 0.5 * (V.w / byId("stage").getBoundingClientRect().width), w: V.w, rot: 0 });
    }); });
  };

  if (typeof refreshFloor === "function") {
    var _refresh = refreshFloor;
    refreshFloor = function () { _refresh(); buildCurbs(); };
  }

})();
