"use strict";
/* Veagle Eye: δέχεται τα ζωντανά δεδομένα από τον τοπικό πράκτορα και τα δείχνει.
   Δεν στέλνει τίποτα πουθενά: ο μόνος δικτυακός κώδικας είναι το EventSource προς τον ίδιο υπολογιστή. */
(function () {
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const HIST = 120;
  const MODE_VIEWS = ["world", "cyber", "orbit", "mindmap"];
  const ORDER = ["dash", "world", "cyber", "orbit", "wall", "mindmap"];
  const PAGES = ["dash", "procs", "net", "sys", "about"];

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  function fmtBytes(n) {
    n = Math.max(0, n || 0); const u = ["B", "KB", "MB", "GB", "TB"]; let i = 0;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return (i === 0 ? Math.round(n) : n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2)) + " " + u[i];
  }
  const fmtRate = (n) => fmtBytes(n) + "/s";
  window.Modes.fmtRate = fmtRate;
  function fmtDur(s) {
    s = Math.max(0, Math.floor(s)); const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
    return (d ? d + " " + t("dur.d") + " " : "") + (h || d ? h + " " + t("dur.h") + " " : "") + m + " " + t("dur.m");
  }
  const rateLevel = (r) => (r < 10240 ? 1 : r < 1048576 ? 2 : 3);

  /* ---------- κατάσταση ---------- */
  let d = null, seq = 0, paused = false, view = "dash", sortKey = "cpu", sortDir = -1, connFilter = "all", lastGood = 0;
  const hist = { cpu: [], mem: [], nd: [], nu: [] };
  const S = { cpu: 0, mem: 0, cores: [], nd: 0, nu: 0, nrate: 0, drate: 0 };
  const T = { cpu: 0, mem: 0, cores: [], nd: 0, nu: 0, nrate: 0, drate: 0 };
  let G = [];
  const C = {};
  function readColors() {
    const cs = getComputedStyle(document.documentElement), g = (n, f) => (cs.getPropertyValue(n).trim() || f);
    C.acc = g("--accent", "#ff1e38"); C.acc2 = g("--accent2", "#ff6b78"); C.ok = g("--ok", "#2ee6a6"); C.warn = g("--warn", "#ffb703");
    C.text = g("--text", "#eef1f5"); C.dim = g("--dim", "#8b95a3"); C.line2 = g("--line2", "#222a33");
  }
  readColors();

  /* ---------- canvas ---------- */
  function fit(cv) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return null;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0); return { c, w, h };
  }
  function rgba(hex, a) {
    hex = hex.trim(); if (hex[0] !== "#") return hex; if (hex.length === 4) hex = "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    const n = parseInt(hex.slice(1), 16); return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")";
  }
  function lineChart(cv, series, fixedMax, fmt) {
    const f = fit(cv); if (!f) return; const { c, w, h } = f; c.clearRect(0, 0, w, h);
    let max = fixedMax; if (!max) { max = 1024; series.forEach((s) => s.data.forEach((v) => { if (v > max) max = v; })); max *= 1.15; }
    const pl = 0, pb = 4, pt = 14, H = h - pb - pt, px = (i) => pl + (w - pl) * i / (HIST - 1), py = (v) => pt + H * (1 - clamp(v / max, 0, 1));
    c.strokeStyle = rgba(C.line2, 0.9); c.lineWidth = 1; c.font = "11px " + getComputedStyle(document.body).getPropertyValue("--mono");
    c.fillStyle = C.dim; c.textAlign = "right";
    for (let i = 0; i <= 4; i++) { const y = pt + H * i / 4; c.beginPath(); c.moveTo(0, y + .5); c.lineTo(w, y + .5); c.stroke(); }
    c.fillText(fmt ? fmt(max) : Math.round(max) + "%", w - 4, pt - 3);
    series.forEach((s) => {
      const n = s.data.length; if (n < 2) return; const off = HIST - n;
      c.beginPath(); s.data.forEach((v, i) => { const x = px(i + off), y = py(v); i ? c.lineTo(x, y) : c.moveTo(x, y); });
      c.strokeStyle = s.color; c.lineWidth = s.w || 2; c.lineJoin = "round"; c.stroke();
      if (s.fill) { c.lineTo(px(n - 1 + off), pt + H); c.lineTo(px(off), pt + H); c.closePath(); const g = c.createLinearGradient(0, pt, 0, pt + H); g.addColorStop(0, rgba(s.color, 0.32)); g.addColorStop(1, rgba(s.color, 0)); c.fillStyle = g; c.fill(); }
    });
  }

  /* ---------- επεξεργασία δεδομένων ---------- */
  function push(a, v) { a.push(v); if (a.length > HIST) a.shift(); }
  function ingest(s) {
    d = s; seq++; lastGood = performance.now();
    T.cpu = s.cpu.total; T.mem = s.mem.percent; T.cores = s.cpu.cores.slice(); T.nd = s.net.down; T.nu = s.net.up;
    T.nrate = clamp(Math.log10(1 + Math.max(s.net.down, s.net.up)) / 8, 0, 1);
    T.drate = clamp(Math.log10(1 + s.disk_io.read + s.disk_io.write) / 9, 0, 1);
    push(hist.cpu, s.cpu.total); push(hist.mem, s.mem.percent); push(hist.nd, s.net.down); push(hist.nu, s.net.up);
    const map = new Map();
    s.procs.forEach((p) => {
      if (/^system idle process$/i.test(p.name)) return;
      let g = map.get(p.name); if (!g) { g = { name: p.name, cpu: 0, mem: 0, n: 0, threads: 0 }; map.set(p.name, g); }
      g.cpu += p.cpu; g.mem += p.mem; g.n++; g.threads += p.threads || 0;
    });
    G = [...map.values()].sort((a, b) => (b.cpu - a.cpu) || (b.mem - a.mem));
    if (!S.cores.length) { S.cpu = T.cpu; S.mem = T.mem; S.cores = T.cores.slice(); S.nd = T.nd; S.nu = T.nu; }
    render();
  }
  function smooth(dt) {
    const k = 1 - Math.pow(0.0015, dt);
    S.cpu += (T.cpu - S.cpu) * k; S.mem += (T.mem - S.mem) * k; S.nd += (T.nd - S.nd) * k; S.nu += (T.nu - S.nu) * k;
    S.nrate += (T.nrate - S.nrate) * k; S.drate += (T.drate - S.drate) * k;
    T.cores.forEach((v, i) => { S.cores[i] = S.cores[i] == null ? v : S.cores[i] + (v - S.cores[i]) * k; }); S.cores.length = T.cores.length;
  }

  /* ---------- εμφάνιση ---------- */
  function setRing(id, pct, sub) {
    const el = $(id), r = 50, L = TAU * r; pct = clamp(pct, 0, 100);
    el.querySelector(".rp").setAttribute("stroke-dasharray", (L * pct / 100).toFixed(1) + " " + L.toFixed(1));
    el.querySelector("text").textContent = Math.round(pct) + "%";
    el.classList.toggle("warn", pct >= 70 && pct < 90); el.classList.toggle("ok", false);
    el.querySelector(".rp").style.stroke = pct >= 90 ? "var(--accent)" : pct >= 70 ? "var(--warn)" : "";
  }
  function kvHTML(rows) { return rows.map((r) => "<dt>" + esc(r[0]) + "</dt><dd title=\"" + esc(r[1]) + "\">" + esc(r[1]) + "</dd>").join(""); }
  function sysRows() {
    const i = d.info;
    return [[t("sys.os"), i.os + " " + (i.os_version || "")], [t("sys.host"), i.hostname], [t("sys.cpu"), (i.processor || i.machine || "").slice(0, 60)],
      [t("sys.cores"), t("sys.cores.v", { p: i.cores_physical || "?", l: i.cores_logical || "?" })], [t("sys.ram"), fmtBytes(d.mem.total)],
      [t("sys.up"), fmtDur(d.uptime)], [t("sys.procs"), d.proc_count]];
  }
  function renderDash() {
    const s = d, cpu = s.cpu.total, mem = s.mem.percent;
    setRing("ring-cpu", cpu); $("cpu-sub").textContent = t("cores.n", { n: s.info.cores_logical || s.cpu.cores.length }) + (s.cpu.mhz ? " · " + Math.round(s.cpu.mhz) + " MHz" : "");
    $("cpu-say").textContent = t("cpu.say" + (cpu < 15 ? 1 : cpu < 60 ? 2 : cpu < 85 ? 3 : 4));
    setRing("ring-mem", mem); $("mem-sub").textContent = t("of", { a: fmtBytes(s.mem.used), b: fmtBytes(s.mem.total) });
    $("mem-say").textContent = t("mem.say" + (mem < 70 ? 1 : mem < 90 ? 2 : 3));
    const dk = s.disks.slice().sort((a, b) => b.percent - a.percent)[0];
    if (dk) {
      setRing("ring-disk", dk.percent); $("disk-title").textContent = t("disk") + " " + dk.mount.replace(/[\\/]$/, "");
      $("disk-sub").textContent = t("disks.line", { p: Math.round(dk.percent), f: fmtBytes(dk.total - dk.used) });
      const io = s.disk_io.read + s.disk_io.write;
      $("disk-say").textContent = dk.percent >= 90 ? t("disk.full") : t("disk.say" + (io < 5242880 ? 1 : io < 52428800 ? 2 : 3));
    } else { setRing("ring-disk", 0); $("disk-sub").textContent = t("disks.none"); $("disk-say").textContent = ""; }
    lineChart($("ch-cpu"), [{ data: hist.mem, color: C.text, w: 1.6 }, { data: hist.cpu, color: C.acc, fill: true }], 100);
    lineChart($("ch-net"), [{ data: hist.nu, color: C.text, w: 1.6 }, { data: hist.nd, color: C.acc, fill: true }], 0, fmtRate);
    $("net-read").innerHTML = "↓ " + fmtRate(s.net.down) + " &nbsp; ↑ " + fmtRate(s.net.up);
    $("net-say").textContent = t("net.say" + rateLevel(Math.max(s.net.down, s.net.up)));
    const cb = $("coresbar"); const n = s.cpu.cores.length;
    if (cb.children.length !== n) cb.innerHTML = s.cpu.cores.map(() => "<div><i></i></div>").join("");
    s.cpu.cores.forEach((v, i) => { cb.children[i].firstChild.style.height = clamp(v, 1, 100) + "%"; });
    $("cores-sub").textContent = t("cores.n", { n });
    // κατάσταση
    const issues = [], watch = [];
    if (cpu >= 90) issues.push(t("iss.cpu90")); else if (cpu >= 70) watch.push(t("iss.cpu70"));
    if (mem >= 90) issues.push(t("iss.mem90")); else if (mem >= 70) watch.push(t("iss.mem70"));
    s.disks.forEach((x) => { if (x.percent >= 90) issues.push(t("iss.disk90", { x: x.mount.replace(/[\\/]$/, "") })); });
    const box = $("status"); box.className = "card statusc" + (issues.length ? " bad" : watch.length ? " warn" : "");
    $("st-t").textContent = t(issues.length ? "st.bad" : watch.length ? "st.watch" : "st.ok");
    $("st-p").textContent = issues.length ? t("st.bad.p", { x: issues.join(", ") }) : watch.length ? t("st.watch.p", { x: watch.join(", ") }) : t("st.ok.p");
    $("kv").innerHTML = kvHTML(sysRows().slice(0, 6));
    const mx = Math.max(1, ...G.slice(0, 5).map((g) => g.cpu), 5);
    $("toplist").innerHTML = G.slice(0, 5).map((g) => "<span title=\"" + esc(g.name) + "\">" + esc(g.name) + "</span><span class=\"mini\"><i style=\"width:" + clamp(g.cpu / mx * 100, 2, 100) + "%\"></i></span><span style=\"text-align:right;color:var(--dim)\">" + g.cpu.toFixed(1) + "%</span>").join("");
    renderDConn();
  }
  /* ---------- χώρες (από αρχείο μέσα στο πρόγραμμα, χωρίς ερώτημα στο διαδίκτυο) ---------- */
  window.WORLD = null;
  fetch("data/world.json").then((r) => r.json()).then((j) => { window.WORLD = j; if (d) render(); }).catch(() => {});
  const dn = {};
  function country(cc) {
    const w = window.WORLD; if (!cc) return "";
    try { dn[LANG] = dn[LANG] || new Intl.DisplayNames([LANG === "el" ? "el" : "en"], { type: "region" }); const n = dn[LANG].of(cc); if (n && n !== cc) return n; } catch (_) {}
    return w && w.c[cc] ? w.c[cc][2] : cc;
  }
  window.countryName = country;
  let detail = false, openProg = new Set();
  try { detail = localStorage.getItem("veagleeye.detail") === "1"; } catch (_) {}
  function renderDConn() {
    $("dconn").parentNode.parentNode.classList.toggle("detail", detail);
    $("d-toggle").textContent = t(detail ? "d.detail" : "d.compact");
    const list = d.conns.filter((c) => c.scope !== "local");
    $("d-n").textContent = new Set(list.map((c) => c.name)).size + " · " + list.length;
    let html;
    if (detail) {
      html = "<table><thead><tr><th>" + esc(t("n.col.prog")) + "</th><th>" + esc(t("n.col.to")) + "</th><th>" + esc(t("n.col.what")) + "</th><th>" + esc(t("n.col.where")) + "</th><th>" + esc(t("n.col.type")) + "</th><th>" + esc(t("n.col.state")) + "</th></tr></thead><tbody>" +
        d.conns.map((c) => "<tr><td>" + esc(c.name) + (c.count > 1 ? " <span style=\"color:var(--dim)\">×" + c.count + "</span>" : "") + "</td><td style=\"font-family:var(--mono)\">" + esc(c.raddr) + ":" + c.rport + "</td><td>" + esc(c.what || "") + "</td><td>" + esc(country(c.cc)) + "</td><td><span class=\"tag " + esc(c.scope) + "\">" + esc(t("n.scope." + c.scope)) + "</span></td><td>" + esc(c.status === "ESTABLISHED" ? t("n.st.ESTABLISHED") : /SYN/.test(c.status || "") ? t("n.st.starting") : t("n.st.closing")) + "</td></tr>").join("") + "</tbody></table>";
    } else {
      const g = new Map();
      list.forEach((c) => { let e = g.get(c.name); if (!e) { e = { name: c.name, n: 0, inet: 0, dests: [] }; g.set(c.name, e); } e.n += c.count || 1; if (c.scope === "internet") e.inet += c.count || 1; e.dests.push(c); });
      const rows = [...g.values()].sort((a, b) => (b.inet - a.inet) || (b.n - a.n));
      const dl = (c) => "<b>" + esc(c.raddr) + "</b>" + (c.cc ? " " + esc(c.cc) : c.scope === "lan" ? " LAN" : "");
      html = "<table><thead><tr><th>" + esc(t("n.col.prog")) + "</th><th class=\"n\">#</th><th>" + esc(t("d.dests")) + "</th></tr></thead><tbody>" + rows.map((r) => {
        const open = openProg.has(r.name), first = r.dests.slice(0, 3).map(dl).join(" · "), more = r.dests.length > 3 ? " <span>" + esc(t("d.more", { n: r.dests.length - 3 })) + "</span>" : "";
        let h = "<tr class=\"pr\" data-p=\"" + esc(r.name) + "\"><td><span class=\"caret\">" + (open ? "▾" : "▸") + "</span>" + esc(r.name) + "</td><td class=\"n\">" + r.n + "</td><td class=\"dest\">" + (open ? "" : first + more) + "</td></tr>";
        if (open) h += r.dests.map((c) => "<tr class=\"sub\"><td colspan=\"3\" class=\"dest\"><b>" + esc(c.raddr) + ":" + c.rport + "</b> &nbsp;" + esc(c.what || "") + " &nbsp;" + esc(country(c.cc)) + " &nbsp;<span class=\"tag " + esc(c.scope) + "\">" + esc(t("n.scope." + c.scope)) + "</span></td></tr>").join("");
        return h;
      }).join("") + "</tbody></table>";
    }
    $("dconn").innerHTML = html;
  }
  $("dconn").addEventListener("click", (e) => { const tr = e.target.closest && e.target.closest("tr.pr"); if (!tr) return; const n = tr.dataset.p; openProg.has(n) ? openProg.delete(n) : openProg.add(n); if (d) renderDConn(); });
  $("d-toggle").addEventListener("click", () => { detail = !detail; try { localStorage.setItem("veagleeye.detail", detail ? "1" : "0"); } catch (_) {} if (d) renderDConn(); });

  function renderProcs() {
    const cols = [["name", "p.col.name", false], ["n", "p.col.inst", true], ["cpu", "p.col.cpu", true], ["mem", "p.col.mem", true], ["threads", "p.col.thr", true]];
    $("p-head").innerHTML = cols.map((c) => "<th class=\"s" + (c[2] ? " n" : "") + (sortKey === c[0] ? " on" : "") + "\" data-k=\"" + c[0] + "\">" + esc(t(c[1])) + (sortKey === c[0] ? (sortDir < 0 ? " ↓" : " ↑") : "") + "</th>").join("");
    const q = $("p-q").value.trim().toLowerCase(), grouped = $("p-group").checked;
    let rows = grouped ? G.slice() : d.procs.map((p) => ({ name: p.name, cpu: p.cpu, mem: p.mem, n: 1, threads: p.threads || 0 }));
    if (q) rows = rows.filter((r) => r.name.toLowerCase().includes(q));
    rows.sort((a, b) => (sortKey === "name" ? a.name.localeCompare(b.name) : a[sortKey] - b[sortKey]) * sortDir);
    const total = rows.length; rows = rows.slice(0, 200);
    $("p-count").textContent = t("p.count", { a: rows.length, b: d.proc_count });
    $("p-body").innerHTML = rows.length ? rows.map((r) => "<tr><td>" + esc(r.name) + "</td><td class=\"n\">" + r.n + "</td><td class=\"n\"><span class=\"pbar\"><i style=\"width:" + clamp(r.cpu, 1, 100) + "%\"></i></span>" + r.cpu.toFixed(1) + "%</td><td class=\"n\">" + fmtBytes(r.mem) + "</td><td class=\"n\">" + r.threads + "</td></tr>").join("")
      : "<tr><td colspan=\"5\" style=\"color:var(--dim)\">" + esc(t("p.none")) + "</td></tr>";
  }
  function renderNet() {
    const nics = d.net.nics || [];
    $("nics").innerHTML = nics.length ? nics.map((n) => "<div class=\"card\"><h3><span>" + esc(n.name) + "</span><span>" + (n.speed_mbps ? n.speed_mbps + " Mbps" : "") + "</span></h3><div class=\"big\">↓ " + esc(fmtRate(n.down)) + "</div><div style=\"color:var(--dim);margin-top:.3rem\">↑ " + esc(fmtRate(n.up)) + "</div></div>").join("") : "<div class=\"card\">" + esc(t("n.nonic")) + "</div>";
    const q = $("c-q").value.trim().toLowerCase();
    let rows = d.conns.filter((c) => connFilter === "all" || c.scope === connFilter);
    if (q) rows = rows.filter((c) => (c.name + " " + c.raddr + " " + (c.what || "")).toLowerCase().includes(q));
    $("c-count").textContent = t("n.count", { n: rows.length });
    $("c-body").innerHTML = rows.length ? rows.map((c) => {
      const st = c.status === "ESTABLISHED" ? t("n.st.ESTABLISHED") : /SYN/.test(c.status || "") ? t("n.st.starting") : t("n.st.closing");
      return "<tr><td>" + esc(c.name) + (c.count > 1 ? " <span style=\"color:var(--dim)\">×" + c.count + "</span>" : "") + "</td><td style=\"font-family:var(--mono)\">" + esc(c.raddr) + ":" + c.rport + "</td><td>" + esc(c.what || "") + "</td><td>" + esc(country(c.cc)) + "</td><td><span class=\"tag " + esc(c.scope) + "\">" + esc(t("n.scope." + c.scope)) + "</span></td><td>" + esc(st) + "</td></tr>";
    }).join("") : "<tr><td colspan=\"6\" style=\"color:var(--dim)\">" + esc(t("n.none")) + "</td></tr>";
    $("c-note").textContent = d.conn_note === "denied" ? t("n.denied") : d.conn_note ? t("n.error") : "";
  }
  function renderSys() {
    $("disks").innerHTML = d.disks.length ? d.disks.map((x) => "<div style=\"margin:.7rem 0\"><div style=\"display:flex;justify-content:space-between\"><b>" + esc(x.mount) + "</b><span style=\"color:var(--dim)\">" + esc(t("of", { a: fmtBytes(x.used), b: fmtBytes(x.total) })) + "</span></div><div class=\"bar2" + (x.percent >= 90 ? " bad" : x.percent >= 75 ? " warn" : "") + "\"><i style=\"width:" + x.percent + "%\"></i></div><div style=\"color:var(--dim);font-size:.85rem\">" + esc(t("disks.line", { p: Math.round(x.percent), f: fmtBytes(x.total - x.used) })) + "</div></div>").join("") : esc(t("disks.none"));
    $("info").innerHTML = kvHTML(sysRows());
    const b = d.battery;
    $("bat").innerHTML = !b ? "<p style=\"color:var(--dim)\">" + esc(t("bat.none")) + "</p>"
      : "<div class=\"big\">" + Math.round(b.percent) + "%</div><div class=\"bar2" + (b.percent < 20 && !b.plugged ? " bad" : "") + "\" style=\"margin:.5rem 0\"><i style=\"width:" + b.percent + "%\"></i></div><p>" + esc(b.plugged ? t("bat.plug") : t("bat.on") + (b.secs_left > 0 ? t("bat.left", { x: fmtDur(b.secs_left) }) : ".")) + "</p>";
  }
  function renderWall() {
    const top = G[0], ic = d.conns.find((c) => c.scope === "internet"), inet = new Set(d.conns.filter((c) => c.scope === "internet").map((c) => c.raddr)).size;
    const dk = d.disks.slice().sort((a, b) => b.percent - a.percent)[0];
    const tiles = [
      [t("cpu"), Math.round(S.cpu), "%", t("cores.n", { n: d.cpu.cores.length })], [t("mem"), Math.round(S.mem), "%", t("of", { a: fmtBytes(d.mem.used), b: fmtBytes(d.mem.total) })],
      [t("download"), fmtBytes(S.nd).split(" ")[0], fmtBytes(S.nd).split(" ")[1] + "/s", ""], [t("upload"), fmtBytes(S.nu).split(" ")[0], fmtBytes(S.nu).split(" ")[1] + "/s", ""],
      [t("disk"), dk ? Math.round(dk.percent) : "–", "%", dk ? dk.mount : ""], [t("reads"), fmtBytes(d.disk_io.read).split(" ")[0], fmtBytes(d.disk_io.read).split(" ")[1] + "/s", ""],
      [t("writes"), fmtBytes(d.disk_io.write).split(" ")[0], fmtBytes(d.disk_io.write).split(" ")[1] + "/s", ""], [t("w.procs"), d.proc_count, "", ""],
      [t("w.top"), top ? top.cpu.toFixed(1) : "–", "%", top ? top.name : ""], [t("w.ncon"), inet, "", ""],
      [t("w.topc"), ic ? esc(ic.name.replace(/\.exe$/i, "")) : "–", "", ic ? ic.raddr : ""], [t("w.up"), Math.floor(d.uptime / 3600), "h", fmtDur(d.uptime)]
    ];
    const w = $("wall");
    if (w.children.length !== tiles.length) w.innerHTML = tiles.map(() => "<div class=\"card\"><div class=\"wl\"></div><div class=\"wv\"></div><div class=\"wt\"></div></div>").join("");
    tiles.forEach((x, i) => { const c = w.children[i]; c.children[0].textContent = x[0]; c.children[1].innerHTML = x[1] + (x[2] ? "<small>" + esc(x[2]) + "</small>" : ""); c.children[2].textContent = x[3]; });
  }
  function render() {
    if (paused || !d) return;
    $("host").textContent = d.info.hostname;
    if (view === "dash") renderDash(); else if (view === "procs") renderProcs(); else if (view === "net") renderNet();
    else if (view === "sys") renderSys(); else if (view === "wall") renderWall();
  }

  /* ---------- όψεις (canvas) ---------- */
  const mcv = $("mode"), MS = {}; let lastT = performance.now(), T0 = lastT;
  function modeFrame(now) {
    const dt = clamp((now - lastT) / 1000, 0.001, 0.1); lastT = now;
    smooth(dt);
    if (MODE_VIEWS.includes(view) && d) {
      const f = fit(mcv);
      if (f) {
        const { c, w, h } = f; c.clearRect(0, 0, w, h);
        const M = window.Modes[view]; if (!MS[view]) { MS[view] = {}; if (M.init) M.init(MS[view]); }
        const P = { c, w, h, t: (now - T0) / 1000, dt: paused ? 0 : dt, u: clamp(Math.min(w, h) / 90, 7, 16), S, d, G, C, st: MS[view], seq };
        try { M.frame(P); } catch (e) { console.error(view, e); }
        mcv._P = P;
      }
    } else if (view === "wall" && d && !paused) renderWall();
    requestAnimationFrame(modeFrame);
  }
  function pointer(type, e) {
    const M = window.Modes[view]; if (!M || !M.pointer || !mcv._P) return;
    const r = mcv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const dx = x - (mcv._lx == null ? x : mcv._lx), dy = y - (mcv._ly == null ? y : mcv._ly); mcv._lx = x; mcv._ly = y;
    M.pointer(type, x, y, dx, dy, mcv._P);
  }
  mcv.addEventListener("pointerdown", (e) => { mcv.setPointerCapture(e.pointerId); mcv.classList.add("drag"); mcv._lx = mcv._ly = null; pointer("down", e); });
  mcv.addEventListener("pointermove", (e) => pointer("move", e));
  mcv.addEventListener("pointerup", (e) => { mcv.classList.remove("drag"); pointer("up", e); });
  mcv.addEventListener("pointercancel", (e) => { mcv.classList.remove("drag"); pointer("up", e); });

  /* ---------- πλοήγηση ---------- */
  function modeTexts() {
    if (!MODE_VIEWS.includes(view)) return;
    const b = document.querySelector("#modes button[data-view=\"" + view + "\"]");
    $("mode-name").textContent = b ? b.textContent : view; $("mode-info").textContent = t("m." + view);
  }
  function go(v, noHash) {
    if (!ORDER.includes(v) && !PAGES.includes(v)) v = "dash";
    view = v;
    document.querySelectorAll(".view").forEach((s) => s.classList.add("hide"));
    $(MODE_VIEWS.includes(v) ? "v-mode" : "v-" + v).classList.remove("hide");
    document.querySelectorAll("[data-view]").forEach((b) => b.classList.toggle("on", b.dataset.view === v));
    if (!noHash) { try { history.replaceState(null, "", location.search + "#" + v); } catch (_) {} }
    modeTexts(); render(); if (v === "wall" && d) renderWall();
  }
  document.querySelectorAll("button[data-view]").forEach((b) => b.addEventListener("click", () => go(b.dataset.view)));
  $("p-head").addEventListener("click", (e) => { const k = e.target.dataset && e.target.dataset.k; if (!k) return; if (sortKey === k) sortDir = -sortDir; else { sortKey = k; sortDir = k === "name" ? 1 : -1; } renderProcs(); });
  $("p-q").addEventListener("input", () => d && renderProcs()); $("p-group").addEventListener("change", () => d && renderProcs());
  $("c-q").addEventListener("input", () => d && renderNet());
  document.querySelectorAll(".chip[data-f]").forEach((b) => b.addEventListener("click", () => { connFilter = b.dataset.f; document.querySelectorAll(".chip[data-f]").forEach((x) => x.classList.toggle("on", x === b)); if (d) renderNet(); }));

  function applyLang(l) {
    setLang(l); $("lang").textContent = t("lang.switch");
    document.querySelectorAll("#modes button:not([data-i18n])").forEach((b) => { /* ονόματα όψεων: ίδια σε όλες τις γλώσσες */ });
    setLiveState(); modeTexts(); if (d) { lastPaintLang = l; render(); if (view === "wall") renderWall(); }
  }
  let lastPaintLang = "";
  $("lang").addEventListener("click", () => applyLang(LANG === "el" ? "en" : "el"));

  function setPaused(p) {
    paused = p; $("pause-ic").innerHTML = p ? "<path d=\"M7 4l13 8-13 8z\"/>" : "<path d=\"M8 5v14M16 5v14\"/>";
    const b = $("b-pause"); b.dataset.i18nTip = p ? "dock.resume" : "dock.pause"; b.dataset.tip = t(b.dataset.i18nTip); setLiveState();
  }
  $("b-pause").addEventListener("click", () => setPaused(!paused));
  function setLiveState(state) {
    state = state || setLiveState.s || "conn"; setLiveState.s = state;
    const el = $("live"); el.className = "live" + (state === "on" && !paused ? " on" : state === "err" ? " err" : "");
    $("livetxt").textContent = t(paused ? "live.pause" : state === "on" ? "live.on" : state === "err" ? "live.err" : "live.conn");
  }
  function toggleFull() { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {}); }
  $("b-full").addEventListener("click", toggleFull);
  let idleT = 0;
  function wake() { $("os").classList.remove("idle"); clearTimeout(idleT); if (document.fullscreenElement) idleT = setTimeout(() => $("os").classList.add("idle"), 4000); }
  ["mousemove", "mousedown", "keydown", "touchstart"].forEach((ev) => document.addEventListener(ev, wake, { passive: true }));
  document.addEventListener("fullscreenchange", wake);
  document.addEventListener("keydown", (e) => {
    if (e.target && /input|textarea/i.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === "f") toggleFull(); else if (k === " ") { e.preventDefault(); setPaused(!paused); } else if (k === "l" || k === "λ") applyLang(LANG === "el" ? "en" : "el");
    else if (/^[1-6]$/.test(k)) go(ORDER[+k - 1]);
  });
  window.addEventListener("hashchange", () => go(location.hash.slice(1), true));

  /* ---------- ζωντανή σύνδεση ---------- */
  function connect() {
    const es = new EventSource("stream");
    es.onopen = () => setLiveState("on");
    es.onmessage = (e) => { if (paused) { lastGood = performance.now(); return; } try { ingest(JSON.parse(e.data)); setLiveState("on"); } catch (err) { console.error(err); } };
    es.onerror = () => setLiveState("err");
  }
  setInterval(() => { $("clk").textContent = new Date().toLocaleTimeString(LANG === "el" ? "el-GR" : "en-GB", { hour12: false }); if (lastGood && performance.now() - lastGood > 5000) setLiveState("err"); }, 1000);

  /* ---------- φόντο δικτύου ---------- */
  (function netbg() {
    const cv = $("netbg"), pts = Array.from({ length: 64 }, () => ({ x: Math.random(), y: Math.random(), vx: (Math.random() - .5) * .00006, vy: (Math.random() - .5) * .00006 }));
    function tick() {
      const f = fit(cv); if (f) {
        const { c, w, h } = f; c.clearRect(0, 0, w, h); const L = Math.min(w, h) * 0.2;
        pts.forEach((p) => { p.x += p.vx * 16; p.y += p.vy * 16; if (p.x < 0 || p.x > 1) p.vx *= -1; if (p.y < 0 || p.y > 1) p.vy *= -1; });
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i]; c.fillStyle = "rgba(255,30,56,.35)"; c.fillRect(a.x * w - 1, a.y * h - 1, 2, 2);
          for (let j = i + 1; j < pts.length; j++) { const b = pts[j], dd = Math.hypot((a.x - b.x) * w, (a.y - b.y) * h); if (dd < L) { c.strokeStyle = "rgba(255,30,56," + (0.12 * (1 - dd / L)).toFixed(3) + ")"; c.beginPath(); c.moveTo(a.x * w, a.y * h); c.lineTo(b.x * w, b.y * h); c.stroke(); } }
        }
      }
      setTimeout(() => requestAnimationFrame(tick), 33);
    }
    tick();
  })();

  /* ---------- εκκίνηση ---------- */
  function boot() {
    const lines = ["VEAGLE EYE", "agent  <span>127.0.0.1</span>", "stream <span>sse</span>", "privacy <span>0 bytes out</span>"], pre = $("bootlog"); let i = 0;
    (function step() { if (i < lines.length) { pre.innerHTML += lines[i++] + "\n"; setTimeout(step, 180); } else setTimeout(() => $("boot").classList.add("off"), 350); })();
  }
  setLang(LANG); applyLang(LANG);
  setLiveState("conn");
  boot();
  go(location.hash.slice(1) || "dash", true);
  connect();
  requestAnimationFrame(modeFrame);
  window.addEventListener("resize", () => { if (d) render(); });
})();
