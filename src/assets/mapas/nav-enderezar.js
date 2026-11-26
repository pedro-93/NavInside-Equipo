(function () {
  "use strict";

  function rdp(pts, tol) {
    if (pts.length < 3) return pts.slice();
    var a = pts[0], b = pts[pts.length - 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1e-9;
    var maxD = -1, idx = 0;
    for (var i = 1; i < pts.length - 1; i++) {
      var d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / L;
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD <= tol) return [a, b];
    var izq = rdp(pts.slice(0, idx + 1), tol), der = rdp(pts.slice(idx), tol);
    return izq.slice(0, -1).concat(der);
  }

  window.enderezarMuros = function (elementos, huecos, opciones) {
    opciones = opciones || {};
    var c = opciones.celda || 0.5;
    var tol = opciones.tolerancia || 2.2;
    var espigaMin = opciones.espigaMin || 12;
    var world = document.getElementById("world"), inv = world.getCTM().inverse();

    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    elementos.forEach(function (el) {
      var bb = el.getBBox(), M = inv.multiply(el.getCTM());
      [[bb.x, bb.y], [bb.x + bb.width, bb.y], [bb.x, bb.y + bb.height], [bb.x + bb.width, bb.y + bb.height]].forEach(function (p) {
        var X = M.a * p[0] + M.c * p[1] + M.e, Y = M.b * p[0] + M.d * p[1] + M.f;
        x0 = Math.min(x0, X); y0 = Math.min(y0, Y); x1 = Math.max(x1, X); y1 = Math.max(y1, Y);
      });
    });
    x0 -= 4; y0 -= 4; x1 += 4; y1 += 4;
    var W = Math.ceil((x1 - x0) / c), H = Math.ceil((y1 - y0) / c);
    var cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    var ctx = cv.getContext("2d");
    var pintar = function (el, borrar) {
      var d = el.getAttribute("d"); if (!d) return;
      var M = inv.multiply(el.getCTM());
      ctx.setTransform(1 / c, 0, 0, 1 / c, -x0 / c, -y0 / c);
      ctx.transform(M.a, M.b, M.c, M.d, M.e, M.f);
      ctx.globalCompositeOperation = borrar ? "destination-out" : "source-over";
      ctx.fillStyle = "#000";
      ctx.fill(new Path2D(d), el.getAttribute("fill-rule") === "evenodd" ? "evenodd" : "nonzero");
    };
    elementos.forEach(function (el) { pintar(el, false); });
    (huecos || []).forEach(function (el) { pintar(el, true); });
    var px = ctx.getImageData(0, 0, W, H).data, n = W * H;
    var img = new Uint8Array(n);
    for (var i = 0; i < n; i++) img[i] = px[i * 4 + 3] > 100 ? 1 : 0;

    var dist = new Float32Array(n), BIG = 1e9, x, y, k, v;
    for (i = 0; i < n; i++) dist[i] = img[i] ? BIG : 0;
    for (y = 1; y < H - 1; y++) for (x = 1; x < W - 1; x++) { k = y * W + x; v = dist[k]; if (!v) continue;
      v = Math.min(v, dist[k - 1] + 1, dist[k - W] + 1, dist[k - W - 1] + 1.414, dist[k - W + 1] + 1.414); dist[k] = v; }
    for (y = H - 2; y > 0; y--) for (x = W - 2; x > 0; x--) { k = y * W + x; v = dist[k]; if (!v) continue;
      v = Math.min(v, dist[k + 1] + 1, dist[k + W] + 1, dist[k + W + 1] + 1.414, dist[k + W - 1] + 1.414); dist[k] = v; }

    var cambio = true, borrar = [];
    while (cambio) {
      cambio = false;
      for (var paso = 0; paso < 2; paso++) {
        borrar.length = 0;
        for (y = 1; y < H - 1; y++) for (x = 1; x < W - 1; x++) {
          k = y * W + x; if (!img[k]) continue;
          var p2 = img[k - W], p3 = img[k - W + 1], p4 = img[k + 1], p5 = img[k + W + 1], p6 = img[k + W], p7 = img[k + W - 1], p8 = img[k - 1], p9 = img[k - W - 1];
          var B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9; if (B < 2 || B > 6) continue;
          var A = (!p2 && p3) + (!p3 && p4) + (!p4 && p5) + (!p5 && p6) + (!p6 && p7) + (!p7 && p8) + (!p8 && p9) + (!p9 && p2);
          if (A !== 1) continue;
          if (paso === 0 ? (p2 * p4 * p6 || p4 * p6 * p8) : (p2 * p4 * p8 || p2 * p6 * p8)) continue;
          borrar.push(k);
        }
        if (borrar.length) { cambio = true; for (i = 0; i < borrar.length; i++) img[borrar[i]] = 0; }
      }
    }

    var VEC = [-W - 1, -W, -W + 1, -1, 1, W - 1, W, W + 1];
    var grado = function (q) { var s = 0; for (var j = 0; j < 8; j++) s += img[q + VEC[j]]; return s; };
    var aPunto = function (q) { return [x0 + (q % W) * c, y0 + Math.floor(q / W) * c]; };
    var grupoDe = new Int32Array(n).fill(-1), grupos = [];
    for (y = 1; y < H - 1; y++) for (x = 1; x < W - 1; x++) {
      k = y * W + x;
      if (!img[k] || grado(k) === 2 || grupoDe[k] >= 0) continue;
      var pila = [k], miembros = [], gid = grupos.length; grupoDe[k] = gid;
      while (pila.length) {
        var u = pila.pop(); miembros.push(u);
        for (var j = 0; j < 8; j++) { var w2 = u + VEC[j]; if (img[w2] && grupoDe[w2] < 0 && grado(w2) !== 2) { grupoDe[w2] = gid; pila.push(w2); } }
      }
      var sx = 0, sy = 0; miembros.forEach(function (m) { var p = aPunto(m); sx += p[0]; sy += p[1]; });
      grupos.push({ pix: miembros, centro: [sx / miembros.length, sy / miembros.length], ext: miembros.length === 1 && grado(miembros[0]) === 1 });
    }
    var usado = new Uint8Array(n), aristas = [];
    function recorrer(gIni, desde, sig) {
      var pix = [sig], prev = desde, cur = sig; usado[sig] = 1;
      for (;;) {
        var nxt = -1, gFin = -1;
        for (var j = 0; j < 8; j++) {
          var q = cur + VEC[j]; if (!img[q] || q === prev) continue;
          if (grupoDe[q] >= 0 && !(grupoDe[q] === gIni && pix.length < 2)) { gFin = grupoDe[q]; break; }
          if (grupoDe[q] < 0 && !usado[q]) { nxt = q; }
        }
        if (gFin >= 0) return { a: gIni, b: gFin, pix: pix };
        if (nxt < 0) return { a: gIni, b: -1, pix: pix };
        usado[nxt] = 1; prev = cur; cur = nxt; pix.push(cur);
      }
    }
    grupos.forEach(function (g, gi) {
      g.pix.forEach(function (u) {
        for (var j = 0; j < 8; j++) { var q = u + VEC[j]; if (img[q] && grupoDe[q] < 0 && !usado[q]) aristas.push(recorrer(gi, u, q)); }
      });
    });
    for (k = 0; k < n; k++) if (img[k] && grupoDe[k] < 0 && !usado[k]) {
      var gl = grupos.length; grupos.push({ pix: [k], centro: aPunto(k), ext: false }); grupoDe[k] = gl; usado[k] = 1;
      for (var jj = 0; jj < 8; jj++) { var qq = k + VEC[jj]; if (img[qq] && !usado[qq] && grupoDe[qq] < 0) { aristas.push(recorrer(gl, k, qq)); break; } }
    }
    var largoPix = function (pix) { var L = 0; for (var t = 1; t < pix.length; t++) { var a = aPunto(pix[t - 1]), b = aPunto(pix[t]); L += Math.hypot(b[0] - a[0], b[1] - a[1]); } return L + c; };
    aristas.forEach(function (e) { e.L = largoPix(e.pix); e.vivo = true; if (e.b < 0) e.b = e.a; });

    var gradoGrupo = function () {
      var d = new Int32Array(grupos.length);
      aristas.forEach(function (e) { if (e.vivo) { d[e.a]++; d[e.b]++; } });
      return d;
    };
    for (var vuelta = 0; vuelta < 4; vuelta++) {
      var dg = gradoGrupo(), poda = false;
      aristas.forEach(function (e) {
        if (!e.vivo || e.a === e.b) return;
        if ((dg[e.a] === 1 || dg[e.b] === 1) && e.L < espigaMin && !(dg[e.a] === 1 && dg[e.b] === 1 && e.L >= 2)) { e.vivo = false; poda = true; }
      });
      if (!poda) break;
    }
    aristas.forEach(function (e) { if (e.vivo && e.a !== e.b && e.L < 1.5 && gradoGrupo()[e.a] > 1) e.vivo = false; });

    var polis = aristas.filter(function (e) { return e.vivo; }).map(function (e) {
      var pts = [grupos[e.a].centro].concat(e.pix.map(aPunto)).concat([grupos[e.b].centro]);
      var g = 0; e.pix.forEach(function (q) { g += dist[q]; });
      return { a: e.a, b: e.b, pts: pts, gSum: g, gN: e.pix.length };
    });
    var cambioUnion = true;
    while (cambioUnion) {
      cambioUnion = false;
      var porGrupo = {};
      polis.forEach(function (p, i) { if (!p) return; (porGrupo[p.a] = porGrupo[p.a] || []).push(i); if (p.b !== p.a) (porGrupo[p.b] = porGrupo[p.b] || []).push(i); });
      for (var gk in porGrupo) {
        var lst = porGrupo[gk]; if (lst.length !== 2 || lst[0] === lst[1]) continue;
        var P = polis[lst[0]], Q = polis[lst[1]], G = +gk;
        if (!P || !Q || P.a === P.b || Q.a === Q.b) continue;
        var pp = P.b === G ? P.pts : P.pts.slice().reverse(), pa = P.b === G ? P.a : P.b;
        var qq2 = Q.a === G ? Q.pts : Q.pts.slice().reverse(), qb = Q.a === G ? Q.b : Q.a;
        polis[lst[0]] = { a: pa, b: qb, pts: pp.concat(qq2.slice(1)), gSum: P.gSum + Q.gSum, gN: P.gN + Q.gN };
        polis[lst[1]] = null; cambioUnion = true; break;
      }
    }

    var red = function (v) { return Math.round(v * 10) / 10; };
    var centroRed = grupos.map(function (g) { return [red(g.centro[0]), red(g.centro[1])]; });
    return polis.filter(Boolean).map(function (p) {
      var pts = rdp(p.pts, tol).map(function (q) { return [red(q[0]), red(q[1])]; });
      pts[0] = centroRed[p.a].slice(); pts[pts.length - 1] = centroRed[p.b].slice();
      var gMedido = (2 * p.gSum / Math.max(1, p.gN)) * c;
      var grosor = gMedido < 3 ? 2.4 : gMedido < 5.5 ? 3.6 : 6;
      return { p: pts, g: grosor };
    }).filter(function (m) {
      var L = 0; for (var t = 1; t < m.p.length; t++) L += Math.hypot(m.p[t][0] - m.p[t - 1][0], m.p[t][1] - m.p[t - 1][1]);
      return L >= 1.5;
    });
  };
})();
