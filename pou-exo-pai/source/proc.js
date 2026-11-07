/* Επεξεργασία του Google Maps Timeline.json (semanticSegments) σε δεδομένα για το dashboard.
   Τρέχει σε Web Worker (ή σε Node για δοκιμές). Είσοδος: κείμενο JSON, πόλεις (cities), onProgress. */
function processTimeline(text, cities, outline, prog) {
  'use strict';
  prog = prog || function () {};
  var D2R = Math.PI / 180;
  function ll(s) { if (s && typeof s === 'object') s = s.latLng; var a = String(s).replace(/°/g, '').replace('geo:', '').split(','); return [parseFloat(a[0]), parseFloat(a[1])]; }
  function ymd(t) { return [+t.slice(0, 4), +t.slice(5, 7), +t.slice(8, 10)]; }
  function ordinal(t) { var p = ymd(t); return Math.round(Date.UTC(p[0], p[1] - 1, p[2]) / 864e5) + 719163; }
  function iso(ord) { return new Date((ord - 719163) * 864e5).toISOString().slice(0, 10); }
  function hav(a, b, c, e) { var x = Math.sin((c - a) * D2R / 2) ** 2 + Math.cos(a * D2R) * Math.cos(c * D2R) * Math.sin((e - b) * D2R / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); }
  function median(a) { a = a.slice().sort(function (x, y) { return x - y; }); var n = a.length; return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2; }
  prog(.02, 'Ανάγνωση αρχείου…');
  var d = JSON.parse(text); text = null;
  var S = Array.isArray(d) ? d : d.semanticSegments;
  if (!Array.isArray(d) && d.locations && !S) throw new Error('Αυτό είναι το παλιό αρχείο «Records.json» (από το Google Takeout). Δεν το υποστηρίζω. Χρειάζομαι το αρχείο που βγάζει το ΚΙΝΗΤΟ από το Χρονολόγιο: Timeline.json.');
  if (!S || !S.length) throw new Error('Το αρχείο διαβάστηκε, αλλά δεν βρήκα μέσα το Χρονολόγιό σου. Βεβαιώσου ότι διάλεξες το Timeline.json που βγάζει το κινητό από το «Εξαγωγή δεδομένων Χρονολογίου».');
  prog(.15, 'Εύρεση επισκέψεων και μετακινήσεων…');
  var visits = [], acts = [], paths = [];
  S.forEach(function (s) {
    if (s.visit) {
      var v = s.visit.topCandidate; if (!v || !v.placeLocation || !s.startTime || !s.endTime) return; var p = ll(v.placeLocation);
      if (isNaN(p[0]) || isNaN(p[1])) return;
      visits.push({ la: p[0], lo: p[1], st: s.startTime, en: s.endTime, type: String(v.semanticType || '').toUpperCase() });
    } else if (s.activity) {
      var a = s.activity, t = String(a.topCandidate && a.topCandidate.type || 'UNKNOWN_ACTIVITY_TYPE').toUpperCase().replace(/ /g, '_');
      if (!a.start || !a.end || !s.startTime || !s.endTime) return;
      acts.push({ t: t, km: parseFloat(a.distanceMeters || 0) / 1000, st: s.startTime, en: s.endTime, a: ll(a.start), b: ll(a.end) });
    } else if (s.timelinePath && s.timelinePath.length) { paths.push(s); }
  });
  d = null; S = null;
  if (!visits.length) throw new Error('Το αρχείο διαβάστηκε, αλλά δεν βρήκα επισκέψεις σε μέρη. Μάλλον το Χρονολόγιο ήταν κλειστό ή άδειο στο κινητό από το οποίο το έβγαλες.');
  /* πόλεις: όνομα, περιοχή, χώρα (πλησιέστερη από τη βάση GeoNames cities1000) */
  prog(.3, 'Ονόματα τοποθεσιών…');
  var CN = cities.n, CLA = cities.la, CLO = cities.lo, CAD = cities.ad, CCC = cities.cc, CAT = cities.admins, CCT = cities.ccs;
  function near(la, lo) {
    var k = Math.cos(la * D2R), best = 1e18, bi = 0;
    for (var i = 0; i < CLA.length; i++) { var dy = CLA[i] - la; if (dy > 1.5 || dy < -1.5) continue; var dx = (CLO[i] - lo) * k, dd = dx * dx + dy * dy; if (dd < best) { best = dd; bi = i; } }
    return bi;
  }
  var pk = {}, places = [], names = [], nid = {}, pidx = [];
  visits.forEach(function (v) {
    var key = Math.round(v.la * 1000) + ',' + Math.round(v.lo * 1000);
    if (!(key in pk)) {
      var c = near(v.la, v.lo), nm = CN[c], ad = CAT[CAD[c]], cc = CCT[CCC[c]], nk = nm + '|' + ad + '|' + cc;
      if (!(nk in nid)) { nid[nk] = names.length; names.push([nm, ad, cc]); }
      pk[key] = places.length; places.push({ la: Math.round(v.la * 1000) / 1000, lo: Math.round(v.lo * 1000) / 1000, n: nid[nk] });
    }
    pidx.push(pk[key]);
  });
  var vrec = visits.map(function (v, i) {
    var y = ymd(v.st); return { p: pidx[i], y: y[0], m: y[1], h: Math.round(Math.max(0, (Date.parse(v.en) - Date.parse(v.st)) / 36e5) * 100) / 100, d: ordinal(v.st) };
  });
  /* μετακινήσεις */
  prog(.45, 'Μετακινήσεις…');
  var MODE = { IN_PASSENGER_VEHICLE: 'car', MOTORCYCLING: 'moto', RUNNING: 'walk', SAILING: 'ferry', WALKING: 'walk', CYCLING: 'bike', FLYING: 'fly', IN_FERRY: 'ferry', BOATING: 'ferry', IN_BUS: 'transit', IN_SUBWAY: 'transit', IN_TRAIN: 'transit', IN_TRAM: 'transit', IN_TAXI: 'car', UNKNOWN_ACTIVITY_TYPE: 'other' };
  var stats = {}, al = acts.map(function (a) { return { t0: Date.parse(a.st), t1: Date.parse(a.en), m: MODE[a.t] || 'other', a: a.a, b: a.b, km: a.km, y: +a.st.slice(0, 4), ord: ordinal(a.st) }; });
  al.sort(function (x, y) { return x.t0 - y.t0; });
  al.forEach(function (a) { var k = a.y + '|' + a.m, s = stats[k] || (stats[k] = [a.y, a.m, 0, 0]); s[2]++; s[3] += a.km; });
  var starts = al.map(function (a) { return a.t0; });
  function bis(t) { var lo = 0, hi = starts.length; while (lo < hi) { var m = (lo + hi) >> 1; if (starts[m] <= t) lo = m + 1; else hi = m; } return lo - 1; }
  /* διαδρομές */
  prog(.55, 'Διαδρομές στον χάρτη…');
  function dp(pts, tol) {
    var n = pts.length; if (n < 3) return pts; var keep = new Uint8Array(n); keep[0] = keep[n - 1] = 1; var st = [[0, n - 1]];
    while (st.length) {
      var r = st.pop(), a = r[0], b = r[1], ax = pts[a][1], ay = pts[a][0], bx = pts[b][1], by = pts[b][0], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, md = 0, mi = -1;
      for (var i = a + 1; i < b; i++) {
        var px = pts[i][1], py = pts[i][0], dd;
        if (L === 0) dd = Math.hypot(px - ax, py - ay); else { var u = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)); dd = Math.hypot(px - (ax + u * dx), py - (ay + u * dy)); }
        if (dd > md) { md = dd; mi = i; }
      }
      if (md > tol && mi > 0) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
    }
    return pts.filter(function (_, i) { return keep[i]; });
  }
  var routes = {};
  paths.forEach(function (s) {
    var t = Date.parse(s.startTime), pts = [];
    s.timelinePath.forEach(function (x) { var p = ll(x.point); if (isNaN(p[0]) || isNaN(p[1])) return; var l = pts[pts.length - 1]; if (!l || l[0] !== p[0] || l[1] !== p[1]) pts.push(p); });
    if (pts.length < 2) return;
    var i = bis(t), m = 'other';
    for (var j = i; j <= i + 1; j++) if (j >= 0 && j < al.length) { var a = al[j]; if (a.t0 <= t + 12e4 && a.t1 >= t - 12e4) { m = a.m; break; } }
    var q = dp(pts, 0.0004).map(function (p) { return [Math.round(p[0] * 1e4) / 1e4, Math.round(p[1] * 1e4) / 1e4]; });
    var k = (+s.startTime.slice(0, 4)) + '|' + m; (routes[k] || (routes[k] = [])).push(q);
  });
  al.forEach(function (a) { if ((a.m === 'fly' || a.m === 'ferry') && a.km > 30) { var k = a.y + '|' + a.m + '_l'; (routes[k] || (routes[k] = [])).push([[Math.round(a.a[0] * 1e4) / 1e4, Math.round(a.a[1] * 1e4) / 1e4], [Math.round(a.b[0] * 1e4) / 1e4, Math.round(a.b[1] * 1e4) / 1e4]]); } });
  /* έδρα: μέσος όρος ανά μήνα των επισκέψεων τύπου HOME, αλλιώς το μέρος με τις περισσότερες ώρες */
  prog(.8, 'Έδρα και ταξίδια…');
  var hm = {};
  visits.forEach(function (v) { if (v.type === 'HOME' || v.type === 'INFERRED_HOME') { var k = v.st.slice(0, 4) * 100 + +v.st.slice(5, 7); (hm[k] || (hm[k] = [])).push([v.la, v.lo]); } });
  var hmed = {}, keys = [];
  Object.keys(hm).forEach(function (k) { var l = hm[k]; if (l.length >= 3) { hmed[k] = [median(l.map(function (x) { return x[0]; })), median(l.map(function (x) { return x[1]; }))]; } });
  keys = Object.keys(hmed).map(Number).sort(function (a, b) { return a - b; });
  if (!keys.length) {
    var hrs = {}; vrec.forEach(function (r) { hrs[r.p] = (hrs[r.p] || 0) + r.h; });
    var top = Object.keys(hrs).sort(function (a, b) { return hrs[b] - hrs[a]; })[0]; hmed[0] = [places[top].la, places[top].lo]; keys = [0];
  }
  function home(st) { var k = +st.slice(0, 4) * 100 + +st.slice(5, 7), lo = 0, hi = keys.length; while (lo < hi) { var m = (lo + hi) >> 1; if (keys[m] <= k) lo = m + 1; else hi = m; } return hmed[keys[Math.max(lo - 1, 0)]]; }
  var dayinfo = {};
  visits.forEach(function (v, i) { var h = home(v.st), dist = hav(v.la, v.lo, h[0], h[1]); if (dist > 80) { var o = vrec[i].d; (dayinfo[o] || (dayinfo[o] = [])).push([pidx[i], dist, vrec[i].h]); } });
  var days = Object.keys(dayinfo).map(Number).sort(function (a, b) { return a - b; }), trips = [], cur = [];
  days.forEach(function (dd) { if (cur.length && dd - cur[cur.length - 1] > 2) { trips.push(cur); cur = []; } cur.push(dd); });
  if (cur.length) trips.push(cur);
  var T = trips.map(function (tr) {
    var cities = {}, far = 0, ccs = {}, ps = {};
    tr.forEach(function (dd) { dayinfo[dd].forEach(function (x) { var n = names[places[x[0]].n]; cities[n[0]] = (cities[n[0]] || 0) + Math.max(x[2], .05); far = Math.max(far, x[1]); ccs[n[2]] = 1; ps[x[0]] = 1; }); });
    var moto = 0, all = 0; al.forEach(function (a) { if (a.ord >= tr[0] && a.ord <= tr[tr.length - 1]) { all += a.km; if (a.m === 'moto') moto += a.km; } });
    var top5 = Object.keys(cities).sort(function (a, b) { return cities[b] - cities[a]; }).slice(0, 5);
    return { start: iso(tr[0]), end: iso(tr[tr.length - 1]), days: tr.length, places: top5.join(', '), countries: Object.keys(ccs).sort().join(', '), far_km: Math.round(far), moto_km: Math.round(moto), total_km: Math.round(all), n_places: Object.keys(ps).length };
  });
  prog(.95, 'Σύνθεση…');
  var cur0 = home(visits[visits.length - 1].st), hc = near(cur0[0], cur0[1]);
  var out = {
    places: places.map(function (p, i) { var n = names[p.n]; return { i: i, lat: p.la, lon: p.lo, name: n[0] + ', ' + n[1], city: n[0], region: n[1], cc: n[2] }; }),
    visits: vrec,
    acts: Object.keys(stats).map(function (k) { var s = stats[k]; return { year: s[0], mode: s[1], n: s[2], km: Math.round(s[3]) }; }).sort(function (a, b) { return a.year - b.year || (a.mode < b.mode ? -1 : 1); }),
    trips: T,
    routes: Object.keys(routes).map(function (k) { var p = k.split('|'); return { year: +p[0], mode: p[1], lines: routes[k].map(function (l) { return l.map(function (q) { return q[0] + ',' + q[1]; }).join(';'); }).join('|') }; }),
    outline: outline,
    meta: { home: cur0, homeName: CN[hc], segments: visits.length + al.length }
  };
  return out;
}
if (typeof module !== 'undefined') module.exports = processTimeline;
