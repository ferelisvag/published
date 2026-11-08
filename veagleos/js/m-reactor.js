/* Reactor: πυρήνας ενέργειας, κάθε φάκελος είναι δακτύλιος και κάθε link κόμβος πάνω του. */
(function () {
  'use strict';
  var ML = window.ML, RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cv = document.getElementById('cv'), ctx = cv.getContext('2d'), W = 0, H = 0, dpr = 1;
  var S = ML.shell({ id: 'reactor', title: 'Reactor', acc: '#ff7a3d', find: 'Αναζήτηση κόμβων' });
  var folders = ML.folders.map(function (f) { f.list = f.items.concat(f.also); return f; }).filter(function (f) { return f.items.length; });
  var iso = null, query = '', hover = null, mx = -99, my = -99, boost = 0;
  var rings = folders.map(function (f, i) {
    var n = f.items.length;
    return { f: f, i: i, rot: ML.hash(f.id) * 6.28, sp: (i % 2 ? -1 : 1) * (.16 / (1 + i * .35)), nodes: f.items.map(function (it, k) { return { it: it, a: k / n * 6.2832, x: 0, y: 0, p: Math.random() }; }) };
  });
  var dk = ML.dock(folders, function (f, b) { iso = iso === f ? null : f; Array.prototype.forEach.call(dk.children, function (x) { x.classList.toggle('on', iso && x.dataset.id === iso.id); }); });
  S.onQuery(function (q) { query = q; });
  function resize() { dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function g(p, m, s) { return Math.exp(-Math.pow(p - m, 2) / (2 * s * s)); }
  function ecg(p) { return .12 * g(p, .12, .025) - .1 * g(p, .205, .008) + g(p, .235, .009) - .22 * g(p, .265, .01) + .25 * g(p, .42, .04); }
  var t0 = performance.now(), lastBeat = -1;
  function frame(now) {
    requestAnimationFrame(frame);
    var t = (now - t0) / 1000, cx = W / 2, cy = H / 2 + 14, Rmax = Math.min(W * .46, H * .44), Rmin = Math.max(48, Rmax * .2), gap = (Rmax - Rmin) / Math.max(1, rings.length);
    var beat = (t * 1.05) % 1, pulse = Math.max(0, ecg(beat)), bn = Math.floor(t * 1.05);
    if (bn !== lastBeat) { lastBeat = bn; boost = 1; } boost *= .94;
    ctx.fillStyle = '#03050a'; ctx.fillRect(0, 0, W, H);
    var bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Rmax * 1.6); bg.addColorStop(0, 'rgba(255,110,50,' + (.14 + boost * .06) + ')'); bg.addColorStop(.5, 'rgba(120,40,20,.05)'); bg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    /* πλέγμα ακτίνων και δακτύλιοι-διακόσμηση */
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,140,80,.07)';
    for (var a = 0; a < 36; a++) { var an = a / 36 * 6.2832; ctx.beginPath(); ctx.moveTo(cx + Math.cos(an) * Rmin * .6, cy + Math.sin(an) * Rmin * .6); ctx.lineTo(cx + Math.cos(an) * Rmax * 1.12, cy + Math.sin(an) * Rmax * 1.12); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,140,80,.35)'; ctx.setLineDash([2, 6]); ctx.beginPath(); ctx.arc(cx, cy, Rmax * 1.1, 0, 6.3); ctx.stroke(); ctx.setLineDash([]);
    for (var k = 0; k < 120; k++) { var an2 = k / 120 * 6.2832 - t * .05, r1 = Rmax * 1.1, r2 = r1 + (k % 10 === 0 ? 12 : 5); ctx.strokeStyle = 'rgba(255,140,80,' + (k % 10 === 0 ? .7 : .3) + ')'; ctx.beginPath(); ctx.moveTo(cx + Math.cos(an2) * r1, cy + Math.sin(an2) * r1); ctx.lineTo(cx + Math.cos(an2) * r2, cy + Math.sin(an2) * r2); ctx.stroke(); }
    /* σάρωση */
    var sw = t * .8; if (ctx.createConicGradient) { var cg = ctx.createConicGradient(sw - 1.2, cx, cy); cg.addColorStop(0, 'rgba(255,130,60,0)'); cg.addColorStop(.19, 'rgba(255,130,60,.16)'); cg.addColorStop(.1901, 'rgba(255,130,60,0)'); ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, Rmax * 1.08, 0, 6.3); ctx.fill(); }
    /* δακτύλιοι */
    hover = null; var best = 16 * 16;
    rings.forEach(function (rg) {
      var r = Rmin + (rg.i + .5) * gap, on = !iso || iso === rg.f, al = on ? 1 : .14, col = rg.f.color;
      if (!RM) rg.rot += rg.sp * .004 * (iso === rg.f ? .3 : 1);
      ctx.globalAlpha = al; ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.3); ctx.globalAlpha = al * .35; ctx.stroke();
      ctx.globalAlpha = al * .9; ctx.lineWidth = Math.max(3, gap * .12); ctx.setLineDash([gap * .55, gap * .22 + rg.i * 2]); ctx.lineDashOffset = -rg.rot * r; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.3); ctx.globalAlpha = al * .22; ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
      rg.nodes.forEach(function (n) {
        var an = n.a + rg.rot; n.x = cx + Math.cos(an) * r; n.y = cy + Math.sin(an) * r;
        var m = ML.match(n.it, query), a2 = on ? (m ? 1 : .2) : .1;
        if (on && m) { ctx.globalAlpha = a2 * .3; ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(cx + Math.cos(an) * Rmin * .55, cy + Math.sin(an) * Rmin * .55); ctx.stroke();
          var pk = (t * .35 + n.p) % 1, px = n.x + (cx + Math.cos(an) * Rmin * .55 - n.x) * pk, py = n.y + (cy + Math.sin(an) * Rmin * .55 - n.y) * pk; ctx.globalAlpha = a2; ctx.fillStyle = '#fff'; ctx.shadowColor = col; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(px, py, 1.6, 0, 6.3); ctx.fill(); ctx.shadowBlur = 0; }
        var d = (n.x - mx) * (n.x - mx) + (n.y - my) * (n.y - my); if (on && m && d < best) { best = d; hover = n; }
        ctx.globalAlpha = a2; ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = m && on ? 14 : 0; ctx.beginPath(); ctx.arc(n.x, n.y, (m && on ? 4.4 : 2.4) * (n === hover ? 1.7 : 1), 0, 6.3); ctx.fill(); ctx.shadowBlur = 0;
        if (on && ((query && m) || n === hover || (rg.nodes.length <= 6 && iso === rg.f) || (iso === rg.f))) { ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.font = '500 12px Space Grotesk,sans-serif'; ctx.textAlign = Math.cos(an) < 0 ? 'right' : 'left'; ctx.fillText(n.it.name, n.x + (Math.cos(an) < 0 ? -10 : 10), n.y + 4); ctx.textAlign = 'left'; }
      });
      ctx.globalAlpha = 1;
      /* όνομα φακέλου στην κορυφή του δακτυλίου */
      ctx.fillStyle = col; ctx.globalAlpha = on ? .9 : .25; ctx.font = '600 10px IBM Plex Mono,monospace'; ctx.fillText(rg.f.name.toUpperCase(), cx + 8, cy - r + 3.5); ctx.globalAlpha = 1;
    });
    /* πυρήνας */
    var cr = Rmin * (.5 + pulse * .12 + boost * .05);
    var cg2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr * 2.4); cg2.addColorStop(0, 'rgba(255,240,210,.95)'); cg2.addColorStop(.25, 'rgba(255,140,60,.7)'); cg2.addColorStop(.6, 'rgba(255,60,20,.2)'); cg2.addColorStop(1, 'rgba(255,60,20,0)');
    ctx.fillStyle = cg2; ctx.beginPath(); ctx.arc(cx, cy, cr * 2.4, 0, 6.3); ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,150,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, cr, 0, 6.3); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, cr * .75, t * 2, t * 2 + 2.2); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, cr * .75, t * 2 + 3.4, t * 2 + 5.2); ctx.stroke();
    var d = new Date(); function two(n) { return (n < 10 ? '0' : '') + n; }
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '700 ' + Math.round(cr * .42) + 'px Space Grotesk,sans-serif'; ctx.fillText(two(d.getHours()) + ':' + two(d.getMinutes()), cx, cy + cr * .14); ctx.textAlign = 'left';
    cv.classList.toggle('hot', !!hover); S.tip(hover && hover.it, mx, my);
  }
  var drag = false, moved = 0;
  cv.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; });
  cv.addEventListener('pointerdown', function (e) { moved = 0; });
  cv.addEventListener('pointerup', function (e) { mx = e.clientX; my = e.clientY; if (hover) ML.open(hover.it); });
  cv.addEventListener('pointerleave', function () { mx = my = -99; });
  addEventListener('resize', resize); resize(); requestAnimationFrame(frame);
})();
