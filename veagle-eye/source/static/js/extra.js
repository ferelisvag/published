"use strict";
/* Veagle Eye: οι νέες οθόνες (Ασφάλεια, Ζωντανά, Το δίκτυό μου, Υλικό, Εργαλεία, Οδηγός).
   Διαβάζει ΜΟΝΟ από τον τοπικό πράκτορα (127.0.0.1). Ό,τι είναι προαιρετικό τρέχει μόνο όταν το πατήσεις εσύ. */
(function () {
  const VERSION = "2211 2205";
  const REPO = "https://github.com/ferelisvag/published/tree/main/veagle-eye";
  const SITE = "https://ferelis.gr";
  const PCCHECK = "https://ferelisvag.github.io/published/veagle-pc-check/";
  const VIEWS = ["home", "sec", "live", "lan", "hw", "tools", "guide"];
  const $ = (id) => document.getElementById(id);
  const V = () => window.VE;
  const esc = (s) => V().esc(s);
  const x = (k, v) => t(k, v);
  const L = () => (LANG === "el" ? 0 : 1);

  /* ---------- κατάσταση ---------- */
  const S = {
    ex: {}, hist: [], names: false, rdns: {}, rdnsBusy: false, scan: null, scanBusy: false, ping: null, pingBusy: false,
    soundConn: false, soundCpu: false, openPath: {}, snapA: null, snapB: null, lastEv: 0, cpuHi: 0, lastBeep: 0, lastCpuBeep: 0,
    ticks: 0, pip: null, quiz: null, dictQ: "", cache: {}, ac: null, tickHist: 0, tickEx: 0,
    prefs: { big: false, simple: false, hide: [], adv: false }
  };
  try { const p = JSON.parse(localStorage.getItem("veagleeye.prefs") || "{}"); if (p && typeof p === "object") S.prefs = Object.assign(S.prefs, p); } catch (_) {}
  function savePrefs() { try { localStorage.setItem("veagleeye.prefs", JSON.stringify(S.prefs)); } catch (_) {} }

  /* ---------- λεξικό θυρών (#11) ---------- */
  const PORTDICT = {
    20: ["FTP (δεδομένα)", "FTP (data)"], 21: ["Μεταφορά αρχείων FTP", "File transfer FTP"], 22: ["Ασφαλής απομακρυσμένη πρόσβαση SSH", "Secure remote access SSH"], 23: ["Telnet (παλιό, ανασφαλές)", "Telnet (old, insecure)"],
    25: ["Αποστολή email (SMTP)", "Sending email (SMTP)"], 53: ["DNS: ονόματα → διευθύνσεις", "DNS: names → addresses"], 67: ["DHCP: δίνει διευθύνσεις στο δίκτυο", "DHCP: hands out addresses"], 80: ["Ιστοσελίδες (HTTP)", "Web pages (HTTP)"],
    110: ["Λήψη email (POP3)", "Receiving email (POP3)"], 123: ["Ρολόι/ώρα του διαδικτύου (NTP)", "Internet time (NTP)"], 135: ["Windows RPC (εσωτερική υπηρεσία)", "Windows RPC (internal service)"], 137: ["NetBIOS (παλιά κοινή χρήση)", "NetBIOS (old sharing)"],
    139: ["Κοινή χρήση αρχείων (παλιά)", "File sharing (old)"], 143: ["Email (IMAP)", "Email (IMAP)"], 161: ["SNMP (διαχείριση συσκευών)", "SNMP (device management)"], 389: ["LDAP (κατάλογος χρηστών)", "LDAP (user directory)"],
    443: ["Ασφαλείς ιστοσελίδες (HTTPS)", "Secure web pages (HTTPS)"], 445: ["Κοινή χρήση αρχείων Windows (SMB)", "Windows file sharing (SMB)"], 465: ["Ασφαλής αποστολή email", "Secure email sending"], 587: ["Αποστολή email (submission)", "Email sending (submission)"],
    993: ["Ασφαλές email (IMAPS)", "Secure email (IMAPS)"], 995: ["Ασφαλές email (POP3S)", "Secure email (POP3S)"], 1433: ["Βάση δεδομένων SQL Server", "SQL Server database"], 3306: ["Βάση δεδομένων MySQL", "MySQL database"],
    3389: ["Απομακρυσμένο Γραφείο (Remote Desktop)", "Remote Desktop"], 5040: ["Windows (υπηρεσία συσκευών)", "Windows (device service)"], 5357: ["Windows ανακάλυψη δικτύου", "Windows network discovery"], 5432: ["Βάση δεδομένων PostgreSQL", "PostgreSQL database"],
    5900: ["VNC απομακρυσμένη οθόνη", "VNC remote screen"], 8080: ["Εναλλακτικές ιστοσελίδες / proxy", "Alternative web / proxy"], 27015: ["Steam και παιχνίδια", "Steam and games"], 6881: ["Torrent", "Torrent"]
  };
  const COMMON_OK = new Set([53, 80, 123, 143, 443, 465, 587, 853, 993, 995, 5228, 8443, 22, 110]);
  const portText = (p, fallback) => (PORTDICT[p] ? PORTDICT[p][L()] : fallback || "");

  /* ---------- βοηθητικά ---------- */
  const tag = (cls, txt) => "<span class=\"tag " + cls + "\">" + esc(txt) + "</span>";
  function setHTML(id, html) { const e = $(id); if (!e) return; if (S.cache[id] === html) return; S.cache[id] = html; const sc = e.scrollTop; e.innerHTML = html; e.scrollTop = sc; }
  function table(head, rows) { return "<div class=\"tw2\"><table><thead><tr>" + head.map((h) => "<th>" + esc(h) + "</th>").join("") + "</tr></thead><tbody>" + rows.join("") + "</tbody></table></div>"; }
  const none = (k) => "<p class=\"muted\">" + esc(x(k || "none")) + "</p>";
  const fmtTime = (ts) => new Date(ts * 1000).toLocaleTimeString(LANG === "el" ? "el-GR" : "en-GB", { hour12: false });
  const pathBtn = (key, exe) => (exe ? " <button class=\"lnk\" type=\"button\" data-path=\"" + esc(key) + "\">" + esc(S.openPath[key] ? x("hidepath") : x("path")) + "</button>" + (S.openPath[key] ? "<div class=\"pth\">" + esc(exe) + "</div>" : "") : "");
  const inetConns = () => (V().d ? V().d.conns.filter((c) => c.scope === "internet") : []);

  function card(id, titleKey, helpKey, ctl, wide) {
    return "<div class=\"card xc" + (wide ? " wide" : "") + "\" id=\"c-" + id + "\"><h3><span>" + esc(x(titleKey)) + "</span>" +
      (helpKey ? "<button class=\"qm\" type=\"button\" data-help=\"" + esc(helpKey) + "\" aria-label=\"" + esc(x("help")) + "\">?</button>" : "") + "</h3>" +
      (helpKey ? "<div class=\"helpbox hide\" id=\"hb-" + id + "\">" + x(helpKey) + "</div>" : "") + (ctl || "") + "<div class=\"xb\" id=\"b-" + id + "\"></div></div>";
  }

  /* ---------- δομή οθονών ---------- */
  function buildViews() {
    S.cache = {};
    const demo = S.ex.demo ? "<div class=\"say warn demo\">" + esc(x("demo.note")) + "</div>" : "";
    $("x-sec").innerHTML = "<div class=\"xgrid\">" +
      card("ports", "sec.ports", "sec.ports.h", "", true) + card("risk", "sec.risk", "sec.risk.h", "", true) + card("prot", "sec.prot", "sec.prot.h") + card("states", "sec.states", "sec.states.h") +
      card("scan", "sec.scan", "sec.scan.h", "<div class=\"tools\"><button class=\"chip\" type=\"button\" data-scan=\"quick\">" + esc(x("sec.scan.b1")) + "</button><button class=\"chip\" type=\"button\" data-scan=\"full\">" + esc(x("sec.scan.b2")) + "</button></div>") +
      card("dnsn", "sec.dnsn", "sec.dnsn.h", "<label class=\"chk\"><input type=\"checkbox\" id=\"cb-names\"" + (S.names ? " checked" : "") + "><span>" + esc(x("sec.dnsn.cb")) + "</span></label>") +
      card("dict", "sec.dict", "sec.dict.h", "<input type=\"search\" id=\"dq\" placeholder=\"" + esc(x("sec.dict.q")) + "\" value=\"" + esc(S.dictQ) + "\">", true) + "</div>";
    $("x-live").innerHTML = demo + "<div class=\"xgrid\">" +
      card("why1", "hw.why", "hw.why.h") + card("top3", "live.top3", "live.top3.h") + card("stream", "live.stream", "live.stream.h", "", true) + card("flow", "live.flow", "live.flow.h") + card("base", "live.base", "live.base.h") +
      card("io", "live.io", "live.io.h") + card("mem", "live.mem", "live.mem.h") +
      card("hist", "live.hist", "live.hist.h", "<div class=\"sparks\"><div><small data-k=\"cpu\"></small><canvas id=\"sp-cpu\"></canvas></div><div><small data-k=\"net\"></small><canvas id=\"sp-net\"></canvas></div><div><small data-k=\"cn\"></small><canvas id=\"sp-cn\"></canvas></div></div>", true) +
      card("ab", "live.ab", "live.ab.h", "<div class=\"tools\"><button class=\"chip\" type=\"button\" data-ab=\"a\">" + esc(x("live.ab.a")) + "</button><button class=\"chip\" type=\"button\" data-ab=\"b\">" + esc(x("live.ab.b")) + "</button><button class=\"chip\" type=\"button\" data-ab=\"x\">" + esc(x("live.ab.reset")) + "</button></div>") + "</div>";
    $("x-lan").innerHTML = demo + "<div class=\"xgrid\">" + card("devs", "lan.devs", "lan.devs.h", "", true) + card("wifi", "lan.wifi", "lan.wifi.h") +
      card("ping", "lan.ping", "lan.ping.h", "<div class=\"tools\"><button class=\"chip\" type=\"button\" data-ping=\"1\">" + esc(x("lan.ping.b")) + "</button></div>") + "</div>";
    $("x-hw").innerHTML = demo + "<div class=\"xgrid\">" + card("why2", "hw.why", "hw.why.h", "", true) + card("gpu", "hw.gpu", "hw.gpu.h") + card("temp", "hw.temp", "hw.temp.h") + card("fans", "hw.fans", "hw.fans.h") + card("bat", "hw.bat", "hw.bat.h") +
      card("disks", "hw.disks", "hw.disks.h") + card("smart", "hw.smart", "hw.smart.h") + card("start", "hw.start", "hw.start.h") + card("mon", "hw.mon", "hw.mon.h") + card("usb", "hw.usb", "hw.usb.h") + "</div>";
    buildTools(); buildGuide();
  }
  const SW = { classic: ["#050708", "#ff1e38"], hud: ["#02070d", "#19e3ff"], matrix: ["#010a04", "#2cff6a"], amber: ["#0b0602", "#ffb020"], synth: ["#0a0414", "#ff2bd6"], daylight: ["#eef2f7", "#d11a2a"], ice: ["#06121c", "#4cc9f0"], forest: ["#07100a", "#7bd88f"] };
  const CARDKEYS = ["r1", "r2", "r3", "cpu", "net", "conn", "cores", "side"];
  function buildTools() {
    const sw = Object.keys(SW).map((id) => "<button type=\"button\" class=\"sw\" data-theme=\"" + id + "\" style=\"--b:" + SW[id][0] + ";--a:" + SW[id][1] + "\"><i></i><span>" + esc(x("th." + id)) + "</span></button>").join("");
    const cards = CARDKEYS.map((k) => "<label class=\"chk\"><input type=\"checkbox\" data-card=\"" + k + "\"" + (S.prefs.hide.includes(k) ? "" : " checked") + "><span>" + esc(x("tl.card." + k)) + "</span></label>").join("");
    $("x-tools").innerHTML = "<div class=\"xgrid\">" +
      "<div class=\"card xc wide\"><h3><span>" + esc(x("tl.look")) + "</span></h3><p class=\"muted\">" + esc(x("tl.theme.h")) + "</p><div class=\"sws\">" + sw + "</div>" +
      "<label class=\"chk\"><input type=\"checkbox\" id=\"cb-big\"" + (S.prefs.big ? " checked" : "") + "><span><b>" + esc(x("tl.big")) + "</b> · " + esc(x("tl.big.h")) + "</span></label>" +
      "<h4>" + esc(x("tl.cards")) + "</h4><div class=\"chks\">" + cards + "</div><div class=\"tools\"><button class=\"chip\" type=\"button\" id=\"b-reset\">" + esc(x("tl.reset")) + "</button></div></div>" +
      "<div class=\"card xc\"><h3><span>" + esc(x("tl.kiosk")) + "</span></h3><p class=\"muted\">" + esc(x("tl.kiosk.h")) + "</p><button class=\"chip on\" type=\"button\" id=\"b-kiosk\">" + esc(x("tl.kiosk.b")) + "</button>" +
      "<h3 style=\"margin-top:1rem\"><span>" + esc(x("tl.pip")) + "</span></h3><p class=\"muted\">" + esc(x("tl.pip.h")) + "</p><button class=\"chip on\" type=\"button\" id=\"b-pip\">" + esc(x("tl.pip.b")) + "</button> <span class=\"muted\" id=\"pip-msg\"></span></div>" +
      "<div class=\"card xc\"><h3><span>" + esc(x("tl.sound")) + "</span></h3><p class=\"muted\">" + esc(x("tl.sound.h")) + "</p>" +
      "<label class=\"chk\"><input type=\"checkbox\" id=\"cb-sc\"" + (S.soundConn ? " checked" : "") + "><span>" + esc(x("tl.sound.conn")) + "</span></label>" +
      "<label class=\"chk\"><input type=\"checkbox\" id=\"cb-sp\"" + (S.soundCpu ? " checked" : "") + "><span>" + esc(x("tl.sound.cpu")) + "</span></label>" +
      "<button class=\"chip\" type=\"button\" id=\"b-beep\">" + esc(x("tl.sound.test")) + "</button></div>" +
      "<div class=\"card xc\"><h3><span>" + esc(x("tl.export")) + "</span></h3><p class=\"muted\">" + esc(x("tl.export.h")) + "</p><div class=\"tools\"><button class=\"chip on\" type=\"button\" id=\"b-csv\">" + esc(x("tl.csv")) + "</button><button class=\"chip on\" type=\"button\" id=\"b-png\">" + esc(x("tl.png")) + "</button><button class=\"chip on\" type=\"button\" id=\"b-print\">" + esc(x("tl.print")) + "</button></div></div>" +
      "<div class=\"card xc\"><h3><span>" + esc(x("tl.pc")) + "</span></h3><p class=\"muted\">" + x("tl.pc.h") + "</p><a class=\"chip on\" href=\"" + PCCHECK + "\" target=\"_blank\" rel=\"noopener\">" + esc(x("tl.pc.b")) + "</a><p class=\"muted sm\">" + esc(x("tl.open")) + "</p></div>" +
      "<div class=\"card xc wide\"><h3><span>" + esc(x("tl.brand")) + "</span></h3>" + brandHTML() + "</div></div>";
    markTheme();
  }
  function brandHTML() {
    return "<div class=\"brand\"><img src=\"eagle-white.png\" alt=\"Veagle\"><div><b>VEAGLE EYE</b><p>" + esc(x("brand.by")) + "</p><p class=\"muted\">" + esc(x("brand.lic")) + "</p>" +
      "<p><a href=\"" + SITE + "\" target=\"_blank\" rel=\"noopener\">" + esc(x("brand.site")) + "</a> · <a href=\"" + REPO + "\" target=\"_blank\" rel=\"noopener\">" + esc(x("brand.src")) + "</a></p><p class=\"muted sm\">" + esc(x("tl.open")) + "</p></div></div>";
  }
  function markTheme() { const cur = document.documentElement.getAttribute("data-theme") || "classic"; document.querySelectorAll(".sw").forEach((b) => b.classList.toggle("on", b.dataset.theme === cur)); }
  const GLKEYS = ["IP", "port", "dns", "tcp", "udp", "firewall", "vpn", "lan", "router", "mac", "ping", "ram", "cpu", "gpu", "smart", "sig", "rdp", "arp"];
  const QUIZ = [["gd.q1", true], ["gd.q2", false], ["gd.q3", true], ["gd.q4", false], ["gd.q5", true]];
  function buildGuide() {
    const gl = GLKEYS.map((k) => "<dt>" + esc(x("gl." + k)[0]) + "</dt><dd>" + esc(x("gl." + k)[1]) + "</dd>").join("");
    $("x-guide").innerHTML = "<div class=\"xgrid\"><div class=\"card xc wide\"><h3><span>" + esc(x("gd.t")) + "</span></h3><button class=\"chip on\" type=\"button\" id=\"b-tour\">" + esc(x("gd.first")) + "</button></div>" +
      "<div class=\"card xc\"><h3><span>" + esc(x("gd.quiz")) + "</span><span id=\"qscore\"></span></h3><p class=\"muted\">" + esc(x("gd.quiz.h")) + "</p><div id=\"qbox\"></div></div>" +
      "<div class=\"card xc\"><h3><span>" + esc(x("gd.gl")) + "</span></h3><dl class=\"gl\">" + gl + "</dl></div></div>";
    quizRender();
  }
  /* quiz (#53) */
  function quizRender() {
    const q = S.quiz || (S.quiz = { i: Math.floor(Math.random() * QUIZ.length), a: 0, n: 0, done: false, msg: "" });
    const it = QUIZ[q.i];
    $("qscore").textContent = x("gd.quiz.score", { a: q.a, b: q.n });
    $("qbox").innerHTML = "<div class=\"say\">" + esc(x(it[0])) + "</div>" +
      (q.done ? "<div class=\"say " + (q.msg === "ok" ? "ok" : "warn") + "\">" + esc(x(q.msg === "ok" ? "gd.quiz.right" : "gd.quiz.wrong")) + esc(x(it[0] + "e")) + "</div><button class=\"chip on\" type=\"button\" data-q=\"next\">" + esc(x("gd.quiz.next")) + "</button>" :
        "<div class=\"tools\"><button class=\"chip\" type=\"button\" data-q=\"ok\">" + esc(x("gd.quiz.ok")) + "</button><button class=\"chip\" type=\"button\" data-q=\"bad\">" + esc(x("gd.quiz.bad")) + "</button></div>");
  }

  /* ---------- περιεχόμενο καρτών ---------- */
  function whyList(d) {
    const out = [], ex = S.ex, topCpu = d.procs.slice().sort((a, b) => b.cpu - a.cpu)[0], topMem = d.procs.slice().sort((a, b) => b.mem - a.mem)[0];
    const disk = d.disks.find((k) => k.percent >= 90);
    const maxT = (ex.temps || []).reduce((m, k) => Math.max(m, k.c || 0), 0) || (ex.gpu || []).reduce((m, k) => Math.max(m, k.temp || 0), 0);
    const io = (d.disk_io.read || 0) + (d.disk_io.write || 0), net = (d.net.down || 0) + (d.net.up || 0);
    if (d.cpu.total >= 85) out.push(["why.cpu", { x: Math.round(d.cpu.total), p: topCpu ? topCpu.name : "?" }, "procs", "warn"]);
    if (d.mem.percent >= 85) out.push(["why.mem", { x: Math.round(d.mem.percent), p: topMem ? topMem.name : "?" }, "procs", "warn"]);
    if (disk) out.push(["why.full", { x: disk.mount }, "hw", "warn"]);
    if (io > 60 * 1048576) { const t0 = (d.io_top || [])[0]; out.push(["why.disk", { x: V().fmtRate(io).replace("/s", ""), p: t0 ? t0.name : "?" }, "live", "warn"]); }
    if (maxT >= 85) out.push(["why.temp", { x: Math.round(maxT) }, "hw", "warn"]);
    if (net > 8 * 1048576) out.push(["why.net", { x: V().fmtRate(net).replace("/s", "") }, "net", "warn"]);
    if ((ex.startup || []).length > 12) out.push(["why.start", { n: ex.startup.length }, "hw", "warn"]);
    return out;
  }
  function renderWhy(d) {
    const msgs = whyList(d).map((m) => x(m[0], m[1]));
    const html = msgs.length ? msgs.slice(0, 3).map((m) => "<div class=\"say warn\">" + esc(m) + "</div>").join("") : "<div class=\"say ok\">" + esc(x("why.ok")) + "</div>";
    setHTML("b-why1", html); setHTML("b-why2", html);
  }
  function riskList(d) {
    const seen = new Map();
    d.conns.filter((c) => c.scope === "internet").forEach((c) => {
      let p = 0; if (c.susp) p += 3; if (c.sig === "unsigned") p += 2; else if (c.sig === "invalid") p += 3; if (!COMMON_OK.has(c.rport)) p += 1;
      const k = c.name + "|" + c.raddr + "|" + c.rport; if (!seen.has(k)) seen.set(k, { c, p });
    });
    return [...seen.values()];
  }
  /* ---------- Σύνοψη (απλή λειτουργία): όλα στο πιάτο ---------- */
  function findings(d) {
    const f = [], ex = S.ex, ls = d.listen || [];
    whyList(d).forEach((m) => f.push({ lvl: m[3], text: x(m[0], m[1]), view: m[2] }));
    const rd = d.conns.filter((c) => c.lport === 3389 && c.status === "ESTABLISHED").map((c) => c.raddr);
    if (rd.length) f.unshift({ lvl: "bad", text: x("sec.rdp.on", { x: rd.join(", ") }), view: "sec" });
    const rk = riskList(d), red = rk.filter((r) => r.p >= 3), yel = rk.filter((r) => r.p >= 1 && r.p < 3);
    if (red.length) f.unshift({ lvl: "bad", text: x("home.f.red", { n: red.length, p: [...new Set(red.map((r) => r.c.name))].slice(0, 3).join(", ") }), view: "sec" });
    else if (yel.length) f.push({ lvl: "info", text: x("home.f.yel", { n: yel.length }), view: "sec" });
    const exp = ls.filter((k) => k.exposed);
    if (exp.length) f.push({ lvl: "info", text: x("home.f.exp", { n: exp.length }), view: "sec" });
    if ((ex.firewall || []).some((q) => !q.on)) f.push({ lvl: "warn", text: x("sec.fw.warn"), view: "sec" });
    (ex.disks_health || []).forEach((k) => { if (!/healthy/i.test(k.health || "")) f.unshift({ lvl: "bad", text: x("home.f.disk", { n: k.name }), view: "hw" }); });
    const w = ex.wifi; if (w && w.signal != null && w.signal < 40) f.push({ lvl: "warn", text: x("lan.weak"), view: "lan" });
    if (w && /open|wep/i.test(w.auth || "")) f.push({ lvl: "warn", text: x("lan.unsafe"), view: "lan" });
    const ord = { bad: 0, warn: 1, info: 2 }; f.sort((a, b) => ord[a.lvl] - ord[b.lvl]);
    return f;
  }
  function renderHome(d) {
    const f = findings(d), bad = f.filter((q) => q.lvl === "bad").length, warn = f.filter((q) => q.lvl === "warn").length;
    const st = bad ? "bad" : warn ? "warn" : "ok";
    const ex = S.ex, ls = d.listen || [], rk = riskList(d);
    const checks = [];
    if ((ex.firewall || []).length && (ex.firewall || []).every((q) => q.on)) checks.push(x("home.c.fw"));
    if (!ls.some((k) => k.exposed)) checks.push(x("home.c.ports"));
    if (!rk.some((r) => r.p >= 1)) checks.push(x("home.c.conn"));
    if (!d.disks.some((k) => k.percent >= 90)) checks.push(x("home.c.disk"));
    if (d.cpu.total < 85 && d.mem.percent < 85) checks.push(x("home.c.perf"));
    if ((ex.disks_health || []).length && (ex.disks_health || []).every((k) => /healthy/i.test(k.health || ""))) checks.push(x("home.c.smart"));
    const head = "<div class=\"hm-status " + st + "\"><span class=\"hm-led\"></span><div><b>" + esc(x("home.s." + st)) + "</b><p>" + esc(x("home.sp." + st, { n: bad + warn })) + "</p></div></div>";
    const attn = f.length ? f.slice(0, 7).map((q) => "<div class=\"hm-item " + q.lvl + "\"><i></i><p>" + esc(q.text) + "</p><button class=\"chip\" type=\"button\" data-go=\"" + q.view + "\">" + esc(x("home.more")) + "</button></div>").join("") : "<p class=\"muted\">" + esc(x("home.none")) + "</p>";
    const okl = checks.length ? "<ul class=\"hm-ok\">" + checks.map((c) => "<li>" + esc(c) + "</li>").join("") + "</ul>" : "";
    const tiles = [[x("m.cpu"), Math.round(d.cpu.total) + "%", d.cpu.total >= 85], [x("m.mem"), Math.round(d.mem.percent) + "%", d.mem.percent >= 85], [x("m.dl"), V().fmtRate(d.net.down), false], [x("m.ul"), V().fmtRate(d.net.up), false]]
      .map((q) => "<div class=\"hm-tile" + (q[2] ? " hot" : "") + "\"><small>" + esc(q[0]) + "</small><b>" + esc(q[1]) + "</b></div>").join("");
    const top = (d.top3 || []).filter((p) => p.pid).slice(0, 3);
    const talk = top.length ? top.map((p) => "<div class=\"top3\"><b>•</b><span>" + esc(p.name) + "</span><em>" + x("live.conns", { n: p.count }) + "</em></div>").join("") : "<p class=\"muted\">" + esc(x("none")) + "</p>";
    setHTML("x-home", "<div class=\"hm\"><div class=\"hm-main\">" + head + "<div class=\"card xc\"><h3><span>" + esc(x("home.attn")) + "</span></h3>" + attn + "</div>" +
      (okl ? "<div class=\"card xc\"><h3><span>" + esc(x("home.checked")) + "</span></h3>" + okl + "</div>" : "") + "</div>" +
      "<div class=\"hm-side\"><div class=\"card xc\"><h3><span>" + esc(x("home.now")) + "</span></h3><div class=\"hm-tiles\">" + tiles + "</div></div>" +
      "<div class=\"card xc\"><h3><span>" + esc(x("home.talk")) + "</span></h3>" + talk + "</div>" +
      "<div class=\"card xc hm-adv\"><p class=\"muted\">" + esc(x("home.adv.h")) + "</p><button class=\"chip on\" type=\"button\" data-mode=\"adv\">" + esc(x("mode.adv")) + "</button></div></div></div>");
  }
  function renderSec(d) {
    // θύρες (#1, #2, #11, #22, #23)
    const ls = d.listen || [], exp = ls.filter((k) => k.exposed);
    const rows = ls.slice().sort((a, b) => (b.exposed - a.exposed) || (a.port - b.port)).slice(0, 60).map((k) => {
      const key = "p" + k.proto + k.port;
      return "<tr><td><b>" + k.port + "</b> <span class=\"muted\">" + esc(k.proto) + "</span></td><td>" + esc(k.name) + pathBtn(key, k.exe) + "</td><td>" + (k.exposed ? tag("bad", x("sec.exp")) : tag("good", x("sec.loc"))) + "</td><td class=\"muted\">" + esc(portText(k.port, k.what)) + "</td></tr>";
    });
    setHTML("b-ports", (ls.length ? "<div class=\"say " + (exp.length ? "warn" : "ok") + "\">" + esc(exp.length ? x("sec.expcount", { n: exp.length }) : x("sec.noexp")) + "</div>" +
      table([x("sec.port"), x("sec.prog"), x("sec.reach"), x("sec.what")], rows) : none("sec.noports")));
    // βαθμός ανησυχίας (#12, #13)
    const seen = new Map();
    inetConns().forEach((c) => {
      const why = []; let p = 0;
      if (c.susp) { p += 3; why.push("r.susp"); }
      if (c.sig === "unsigned") { p += 2; why.push("r.unsigned"); } else if (c.sig === "invalid") { p += 3; why.push("r.invalid"); }
      if (!COMMON_OK.has(c.rport)) { p += 1; why.push("r.port"); }
      const k = c.name + "|" + c.raddr + "|" + c.rport;
      if (!seen.has(k)) seen.set(k, { c, p, why, n: 1 }); else seen.get(k).n++;
    });
    const all = [...seen.values()].sort((a, b) => b.p - a.p);
    const bad = all.filter((r) => r.p >= 1).slice(0, 14);
    const lv = (p) => (p >= 3 ? ["bad", "r.r"] : p >= 1 ? ["warn", "r.y"] : ["good", "r.g"]);
    setHTML("b-risk", bad.length ? table([x("n.col.prog"), x("n.col.to"), x("n.col.where"), "", ""], bad.map((r) => {
      const c = r.c, l = lv(r.p), nm = S.names ? (S.rdns[c.raddr] === undefined ? "…" : S.rdns[c.raddr] || x("sec.dnsn.none")) : "";
      return "<tr><td>" + esc(c.name) + pathBtn("c" + c.pid, c.exe) + "</td><td class=\"dest\"><b>" + esc(c.raddr) + "</b>:" + c.rport + (nm ? "<br>" + esc(nm) : "") + "</td><td>" + esc(c.cc || "") + "</td><td>" + tag(l[0], x(l[1])) + "</td><td class=\"muted\">" + r.why.map((w) => esc(x(w))).join("; ") + "</td></tr>";
    })) + "<p class=\"muted sm\">" + esc(x("sec.country")) + "</p>" : "<div class=\"say ok\">" + esc(x("r.none")) + "</div>");
    // προστασία (#16, #18, #19, #21)
    const ex = S.ex, rdpSess = d.conns.filter((c) => c.lport === 3389 && c.status === "ESTABLISHED").map((c) => c.raddr);
    const rdpOpen = ls.some((k) => k.port === 3389 && k.exposed);
    const fw = (ex.firewall || []), fwBad = fw.some((f) => !f.on);
    let h = "<dl class=\"kv2\">";
    h += "<dt>" + esc(x("sec.fw")) + "</dt><dd>" + (fw.length ? fw.map((f) => tag(f.on ? "good" : "warn", x("sec.fw.p", { n: f.name }) + ": " + x(f.on ? "on" : "off"))).join(" ") : esc(x("na"))) + "</dd>";
    h += "<dt>" + esc(x("sec.vpn")) + "</dt><dd>" + esc(ex.vpn && ((ex.vpn.adapters || []).length || (ex.vpn.connections || []).length) ? x("sec.vpn.on", { x: (ex.vpn.connections || []).concat(ex.vpn.adapters || []).join(", ") }) : ex.vpn ? x("sec.vpn.off") : x("na")) + "</dd>";
    h += "<dt>" + esc(x("sec.dns")) + "</dt><dd>" + ((ex.dns || []).length ? ex.dns.map((q) => esc(q.iface) + ": " + esc((q.servers || []).join(", "))).join("<br>") : esc(x("na"))) + "</dd>";
    h += "<dt>" + esc(x("sec.rdp")) + "</dt><dd>" + (rdpSess.length ? tag("bad", x("sec.rdp.on", { x: rdpSess.join(", ") })) : tag("good", x("sec.rdp.off"))) + (rdpOpen ? "<br>" + tag("warn", x("sec.rdp.open")) : "") + "</dd></dl>";
    if (fwBad) h += "<div class=\"say warn\">" + esc(x("sec.fw.warn")) + "</div>";
    setHTML("b-prot", h);
    // καταστάσεις (#5)
    const st = d.states || {}, keys = Object.keys(st).sort((a, b) => st[b] - st[a]), mx = Math.max(1, ...keys.map((k) => st[k]));
    setHTML("b-states", keys.length ? keys.map((k) => "<div class=\"bar3\"><span>" + esc(I18N[LANG]["st." + k] ? x("st." + k) : k) + " <small class=\"muted\">" + esc(k) + "</small></span><div class=\"bar2\"><i style=\"width:" + (100 * st[k] / mx).toFixed(0) + "%\"></i></div><b>" + st[k] + "</b></div>").join("") : none());
    // σάρωση (#7)
    let sh = ""; const sc = S.scan;
    if (S.scanBusy) sh = "<div class=\"say\">" + esc(x("sec.scan.run")) + "</div>";
    else if (sc) sh = "<p class=\"muted\">" + esc(x("sec.scan.res", { n: sc.tested, s: sc.secs })) + "</p>" + (sc.targets.every((tg) => !tg.open.length) ? "<div class=\"say ok\">" + esc(x("sec.scan.none")) + "</div>" :
      sc.targets.filter((tg) => tg.open.length).map((tg) => "<h4>" + esc(tg.ip) + "</h4>" + table([x("sec.port"), "", x("sec.what")], tg.open.map((o) => "<tr><td><b>" + o.port + "</b></td><td>" + tag("warn", x("sec.scan.open")) + "</td><td class=\"muted\">" + esc(portText(o.port, o.what)) + "</td></tr>"))).join(""));
    setHTML("b-scan", sh);
    setHTML("b-dnsn", S.names ? "<p class=\"muted\">" + esc(x("sec.dnsn.nm")) + ": " + Object.keys(S.rdns).length + "</p>" : "");
    renderDict();
  }
  function renderDict() {
    const q = S.dictQ.trim().toLowerCase();
    const rows = Object.keys(PORTDICT).map(Number).filter((p) => !q || String(p).includes(q) || PORTDICT[p].join(" ").toLowerCase().includes(q)).map((p) => "<tr><td><b>" + p + "</b></td><td>" + esc(PORTDICT[p][L()]) + "</td></tr>");
    setHTML("b-dict", rows.length ? table([x("sec.port"), x("sec.what")], rows) : none());
  }
  function renderLive(d) {
    renderWhy(d);
    // top3 (#3)
    setHTML("b-top3", (d.top3 || []).length ? (d.top3).map((p, i) => "<div class=\"top3\"><b>" + (i + 1) + "</b><span>" + esc(p.name) + "</span><em>" + x("live.conns", { n: p.count }) + "</em></div>").join("") : none());
    // ροή (#4)
    const ev = (d.events || []).filter((e) => e.scope !== "local").slice(-40).reverse();
    setHTML("b-stream", ev.length ? "<ul class=\"evl\">" + ev.map((e) => "<li><span class=\"muted\">" + fmtTime(e.t) + "</span> " + x("live.ev", { p: "<b>" + esc(e.name) + "</b>", a: esc(e.raddr + ":" + e.rport), w: esc(e.cc || e.scope) }) + " " + tag(e.scope === "internet" ? "internet" : "lan", e.scope === "internet" ? "INTERNET" : "LAN") + "</li>").join("") + "</ul>" : none("live.noev"));
    // διάγραμμα ροής (#14)
    const now = Date.now() / 1000, recent = (d.events || []).filter((e) => e.scope !== "local" && now - e.t <= 60);
    const prog = new Map(), dst = new Map(), link = new Map();
    recent.forEach((e) => { const dk = e.cc || e.raddr; prog.set(e.name, (prog.get(e.name) || 0) + 1); dst.set(dk, (dst.get(dk) || 0) + 1); const lk = e.name + "→" + dk; link.set(lk, (link.get(lk) || 0) + 1); });
    const P = [...prog].sort((a, b) => b[1] - a[1]).slice(0, 7).map((a) => a[0]), D = [...dst].sort((a, b) => b[1] - a[1]).slice(0, 7).map((a) => a[0]);
    if (!recent.length) setHTML("b-flow", none("live.flow.none"));
    else {
      const H = 28, h = Math.max(P.length, D.length) * H + 12; let svg = "<svg class=\"flow\" viewBox=\"0 0 400 " + h + "\" role=\"img\">";
      link.forEach((n, k) => { const [a, b] = k.split("→"), ia = P.indexOf(a), ib = D.indexOf(b); if (ia < 0 || ib < 0) return; const y1 = 14 + ia * H, y2 = 14 + ib * H; svg += "<path d=\"M130 " + y1 + " C200 " + y1 + " 200 " + y2 + " 270 " + y2 + "\" fill=\"none\" stroke=\"var(--accent)\" stroke-opacity=\".55\" stroke-width=\"" + Math.min(9, 1 + n) + "\"/>"; });
      P.forEach((p, i) => { svg += "<text x=\"126\" y=\"" + (18 + i * H) + "\" text-anchor=\"end\" fill=\"var(--text)\" font-size=\"12\">" + esc(p.length > 20 ? p.slice(0, 19) + "…" : p) + "</text>"; });
      D.forEach((p, i) => { svg += "<text x=\"274\" y=\"" + (18 + i * H) + "\" fill=\"var(--text)\" font-size=\"12\">" + esc(p.length > 22 ? p.slice(0, 21) + "…" : p) + "</text>"; });
      setHTML("b-flow", svg + "</svg>");
    }
    // βάση σύγκρισης (#15)
    const H = S.hist;
    if (H.length < 120) setHTML("b-base", "<p class=\"muted\">" + esc(x("live.base.n", { x: Math.floor(H.length / 60) })) + "</p>");
    else {
      const old = H.slice(0, -10), cur = H.slice(-5), avg = (a, k) => a.reduce((s, v) => s + v[k], 0) / a.length;
      const row = (label, k, fmt, min) => { const a = avg(old, k), c = avg(cur, k), hi = c > a * 2 && c > min, lo = c < a * 0.4 && a > min; return "<tr><td>" + esc(label) + "</td><td>" + fmt(c) + "</td><td class=\"muted\">" + fmt(a) + "</td><td>" + (hi ? tag("bad", x("live.base.high")) : lo ? tag("lan", x("live.base.low")) : tag("good", x("live.base.norm"))) + "</td></tr>"; };
      setHTML("b-base", table(["", x("live.now"), x("live.avg"), ""], [row(x("m.cpu"), "cpu", (v) => v.toFixed(0) + "%", 20), row(x("m.mem"), "mem", (v) => v.toFixed(0) + "%", 20), row(x("m.dl"), "down", V().fmtRate, 200000), row(x("m.ul"), "up", V().fmtRate, 200000), row(x("m.cn"), "conns", (v) => v.toFixed(0), 10)]));
    }
    // δίσκος ανά πρόγραμμα (#26, #8)
    const io = d.io_top || [];
    setHTML("b-io", (io.length ? table(["", x("live.read"), x("live.write")], io.slice(0, 6).map((p) => "<tr><td>" + esc(p.name) + "</td><td>" + V().fmtRate(p.rd) + "</td><td>" + V().fmtRate(p.wr) + "</td></tr>")) : none("live.io.none")) + "<p class=\"muted sm\">" + esc(x("live.netprog")) + "</p>");
    // μνήμη που μεγαλώνει (#27)
    const mt = S.ex.memtrend || {}, grow = Object.keys(mt).map((k) => { const a = mt[k]; return { k, g: a.length > 5 ? a[a.length - 1] - a[0] : 0, last: a[a.length - 1] || 1 }; }).filter((r) => r.g > 30 * 1048576 && r.g / r.last > 0.1).sort((a, b) => b.g - a.g).slice(0, 5);
    setHTML("b-mem", grow.length ? grow.map((r) => "<div class=\"top3\"><b>↑</b><span>" + esc(r.k) + "</span><em>" + esc(x("live.mem.grow", { x: V().fmtBytes(r.g) })) + "</em></div>").join("") : none("live.mem.none"));
    drawSparks();
    renderAB();
  }
  function snap() { const d = V().d; return { t: Date.now(), cpu: d.cpu.total, mem: d.mem.used, conns: d.conns.length, ports: (d.listen || []).length, progs: new Set(d.procs.map((p) => p.name)) }; }
  function renderAB() {
    const a = S.snapA, b = S.snapB; let h = "";
    if (!a || !b) h = "<p class=\"muted\">" + esc(x("live.ab.need")) + (a ? " ✔A" : "") + "</p>";
    else {
      const nw = [...b.progs].filter((p) => !a.progs.has(p)), gone = [...a.progs].filter((p) => !b.progs.has(p)), sg = (n) => (n > 0 ? "+" : "") + n;
      h = table(["", "A", "B", "Δ"], [["m.cpu", a.cpu.toFixed(0) + "%", b.cpu.toFixed(0) + "%", sg(Math.round(b.cpu - a.cpu)) + "%"], ["m.mem", V().fmtBytes(a.mem), V().fmtBytes(b.mem), (b.mem >= a.mem ? "+" : "−") + V().fmtBytes(Math.abs(b.mem - a.mem))], ["m.cn", a.conns, b.conns, sg(b.conns - a.conns)], ["m.pt", a.ports, b.ports, sg(b.ports - a.ports)]].map((r) => "<tr><td>" + esc(x(r[0])) + "</td><td>" + r[1] + "</td><td>" + r[2] + "</td><td><b>" + r[3] + "</b></td></tr>")) +
        "<p><b>" + esc(x("live.ab.new")) + ":</b> " + (nw.length ? esc(nw.slice(0, 20).join(", ")) : esc(x("live.ab.nochg"))) + "</p><p><b>" + esc(x("live.ab.gone")) + ":</b> " + (gone.length ? esc(gone.slice(0, 20).join(", ")) : esc(x("live.ab.nochg"))) + "</p>";
    }
    setHTML("b-ab", h);
  }
  function drawSparks() {
    const H = S.hist; if (!H.length) { ["cpu", "net", "cn"].forEach((k) => { const s = document.querySelector("small[data-k=" + k + "]"); if (s) s.textContent = x("live.hist.none"); }); return; }
    const cs = getComputedStyle(document.documentElement), col = (n, f) => cs.getPropertyValue(n).trim() || f;
    const draw = (id, series, max) => {
      const cv = $(id); if (!cv) return; const f = V().fit(cv); if (!f) return; const { c, w, h } = f; c.clearRect(0, 0, w, h);
      c.strokeStyle = col("--line2", "#333"); c.lineWidth = 1; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(0, h * i / 4); c.lineTo(w, h * i / 4); c.stroke(); }
      series.forEach((s) => { c.strokeStyle = s.color; c.lineWidth = 1.6; c.beginPath(); s.data.forEach((v, i) => { const px = i / Math.max(1, s.data.length - 1) * w, py = h - 2 - (h - 4) * Math.min(1, v / max); if (i) c.lineTo(px, py); else c.moveTo(px, py); }); c.stroke(); });
    };
    const acc = col("--accent", "#f33"), txt = col("--text", "#eee"), ok = col("--ok", "#2e6");
    draw("sp-cpu", [{ data: H.map((p) => p.cpu), color: acc }, { data: H.map((p) => p.mem), color: txt }], 100);
    const mxn = Math.max(1024, ...H.map((p) => Math.max(p.down, p.up))) * 1.15; draw("sp-net", [{ data: H.map((p) => p.down), color: acc }, { data: H.map((p) => p.up), color: ok }], mxn);
    draw("sp-cn", [{ data: H.map((p) => p.conns), color: txt }], Math.max(10, ...H.map((p) => p.conns)) * 1.15);
    const set = (k, s) => { const e = document.querySelector("small[data-k=" + k + "]"); if (e) e.textContent = s; };
    set("cpu", x("m.cpu") + " / " + x("m.mem") + " · " + x("live.hist.min", { n: Math.round(H.length / 60) })); set("net", x("m.dl") + " / " + x("m.ul")); set("cn", x("m.cn"));
  }
  function renderLan(d) {
    const ex = S.ex, gw = ex.gateway, lan = ex.lan || [];
    setHTML("b-devs", lan.length ? "<div class=\"say ok\">" + esc(x("lan.count", { n: lan.length })) + "</div>" + table([x("lan.ip"), x("lan.mac"), x("lan.state"), ""], lan.map((k) => "<tr><td><b>" + esc(k.ip) + "</b></td><td class=\"dest\">" + esc(k.mac) + "</td><td>" + esc(I18N[LANG]["lan." + k.state] ? x("lan." + k.state) : k.state) + "</td><td>" + (k.ip === gw ? tag("lan", x("lan.router")) : "") + "</td></tr>")) : none("lan.none"));
    const w = ex.wifi;
    if (!w) setHTML("b-wifi", none("lan.nowifi"));
    else {
      const bad = /open|wep/i.test(w.auth || ""), weak = w.signal != null && w.signal < 40;
      setHTML("b-wifi", "<dl class=\"kv2\"><dt>" + esc(x("lan.ssid")) + "</dt><dd>" + esc(w.ssid) + "</dd><dt>" + esc(x("lan.signal")) + "</dt><dd>" + (w.signal != null ? "<div class=\"bar2 " + (weak ? "warn" : "") + "\"><i style=\"width:" + w.signal + "%\"></i></div> " + w.signal + "%" : "–") + "</dd><dt>" + esc(x("lan.sec")) + "</dt><dd>" + tag(bad ? "bad" : "good", w.auth || "?") + "</dd><dt>" + esc(x("lan.ch")) + "</dt><dd>" + esc(w.channel || "–") + "</dd><dt>" + esc(x("lan.speed")) + "</dt><dd>" + esc((w.rx || "?") + " / " + (w.tx || "?") + " Mbps") + "</dd></dl>" + (weak ? "<div class=\"say warn\">" + esc(x("lan.weak")) + "</div>" : "") + (bad ? "<div class=\"say warn\">" + esc(x("lan.unsafe")) + "</div>" : ""));
    }
    let ph = ""; const p = S.ping;
    if (S.pingBusy) ph = "<div class=\"say\">" + esc(x("lan.ping.run")) + "</div>";
    else if (p) ph = p.error ? "<div class=\"say warn\">" + esc(x("lan.ping.nogw")) + "</div>" : p.times.length ? "<div class=\"say ok\">" + esc(x("lan.ping.res", { a: p.times.length, b: p.sent, m: (p.times.reduce((s, v) => s + v, 0) / p.times.length).toFixed(1) })) + " (" + esc(p.gw) + ")</div>" : "<div class=\"say warn\">" + esc(x("lan.ping.fail")) + "</div>";
    setHTML("b-ping", ph);
  }
  function renderHw(d) {
    renderWhy(d); const ex = S.ex;
    const bar = (pct) => "<div class=\"bar2 " + (pct >= 90 ? "bad" : pct >= 70 ? "warn" : "") + "\"><i style=\"width:" + Math.min(100, pct) + "%\"></i></div>";
    setHTML("b-gpu", (ex.gpu || []).length ? ex.gpu.map((g) => "<b>" + esc(g.name) + "</b><dl class=\"kv2\"><dt>" + esc(x("hw.gpu.use")) + "</dt><dd>" + bar(g.util) + g.util + "%</dd><dt>" + esc(x("hw.gpu.mem")) + "</dt><dd>" + bar(100 * g.mem_used / g.mem_total) + g.mem_used + " / " + g.mem_total + " MB</dd><dt>" + esc(x("hw.gpu.temp")) + "</dt><dd>" + g.temp + "°C</dd></dl>").join("") : none("hw.gpu.none"));
    setHTML("b-temp", (ex.temps || []).length ? "<dl class=\"kv2\">" + ex.temps.map((k) => "<dt>" + esc(k.name + " " + (k.label || "")) + "</dt><dd>" + tag(k.c >= 90 ? "bad" : k.c >= 80 ? "warn" : "good", Math.round(k.c) + "°C") + "</dd>").join("") + "</dl>" : none("hw.temp.none"));
    setHTML("b-fans", (ex.fans || []).length ? "<dl class=\"kv2\">" + ex.fans.map((k) => "<dt>" + esc(k.label) + "</dt><dd>" + k.rpm + " RPM</dd>").join("") + "</dl>" : none("hw.fans.none"));
    const b = d.battery;
    setHTML("b-bat", b ? "<div class=\"bar2" + (b.percent < 20 && !b.plugged ? " bad" : "") + "\"><i style=\"width:" + b.percent + "%\"></i></div><p><b>" + Math.round(b.percent) + "%</b> · " + esc(x(b.plugged ? "bat.plug" : "bat.on")) + (b.secs_left > 0 && !b.plugged ? " · " + esc(fmtMin(b.secs_left)) : "") + "</p>" : none("bat.none"));
    setHTML("b-disks", d.disks.length ? d.disks.map((k) => "<div class=\"dk\"><span>" + esc(k.mount) + " <small class=\"muted\">" + esc(k.fs) + "</small></span>" + bar(k.percent) + "<small class=\"muted\">" + esc(x("disks.line", { p: Math.round(k.percent), f: V().fmtBytes(k.total - k.used) })) + "</small></div>").join("") + (d.disks.some((k) => k.percent >= 90) ? "<div class=\"say warn\">" + esc(x("hw.disks.warn")) + "</div>" : "") : none("disks.none"));
    setHTML("b-smart", (ex.disks_health || []).length ? table(["", "", ""], ex.disks_health.map((k) => "<tr><td>" + esc(k.name) + "</td><td class=\"muted\">" + esc(k.media || "") + " · " + V().fmtBytes(k.size) + "</td><td>" + tag(/healthy/i.test(k.health) ? "good" : "bad", k.health || k.status || "?") + "</td></tr>")) : none("hw.smart.none"));
    const bt = d.info.boot_time ? new Date(d.info.boot_time * 1000).toLocaleString(LANG === "el" ? "el-GR" : "en-GB") : "";
    setHTML("b-start", (bt ? "<p class=\"muted\">" + esc(x("hw.boot", { x: bt, y: V().fmtDur(d.uptime) })) + "</p>" : "") + ((ex.startup || []).length ? table(["", ""], ex.startup.map((k) => "<tr><td><b>" + esc(k.name) + "</b></td><td class=\"dest\">" + esc(k.where || "") + "</td></tr>")) : none("hw.start.none")));
    setHTML("b-mon", (ex.monitors || []).length ? table(["", "", ""], ex.monitors.map((k) => "<tr><td>" + esc(k.name) + "</td><td>" + k.w + "×" + k.h + "</td><td>" + (k.hz ? k.hz + " Hz" : "") + "</td></tr>")) : none("hw.mon.none"));
    setHTML("b-usb", (ex.usb || []).length ? "<ul class=\"evl\">" + ex.usb.map((k) => "<li>" + esc(k.name) + " <span class=\"muted\">" + esc(k.cls || "") + "</span></li>").join("") + "</ul>" : none("hw.usb.none"));
  }
  function fmtMin(s) { const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return (h ? h + " " + x("dur.h") + " " : "") + m + " " + x("dur.m"); }

  /* ---------- κύκλος ζωής ---------- */
  function renderView(v) {
    const d = V().d; if (!d) return;
    if (v === "home") renderHome(d); else if (v === "sec") renderSec(d); else if (v === "live") renderLive(d); else if (v === "lan") renderLan(d); else if (v === "hw") renderHw(d);
  }
  const API = (p) => fetch(p, { cache: "no-store" }).then((r) => (r.ok ? r.json() : Promise.reject(r.status)));
  function pullExtra() { API("api/extra").then((j) => { const first = !S._init; S._init = true; S.ex = j; if (first || !!j.demo !== S._demo) { S._demo = !!j.demo; buildViews(); } if (VIEWS.includes(V().view)) renderView(V().view); }).catch(() => {}); }
  function pullHist() { API("api/history").then((j) => { S.hist = j; }).catch(() => {}); }
  function rdnsStep() {
    if (!S.names || S.rdnsBusy || !V().d) return;
    const c = inetConns().find((k) => S.rdns[k.raddr] === undefined); if (!c) return;
    S.rdnsBusy = true; API("api/rdns?ip=" + encodeURIComponent(c.raddr)).then((j) => { S.rdns[c.raddr] = j.name || ""; }).catch(() => { S.rdns[c.raddr] = ""; }).finally(() => { S.rdnsBusy = false; });
  }
  /* ήχος (#41), μόνο αν το ενεργοποιήσεις */
  function beep(f, ms) {
    try { S.ac = S.ac || new (window.AudioContext || window.webkitAudioContext)(); const o = S.ac.createOscillator(), g = S.ac.createGain(); o.frequency.value = f; g.gain.value = 0.05; o.connect(g); g.connect(S.ac.destination); o.start(); o.stop(S.ac.currentTime + ms / 1000); } catch (_) {}
  }
  function tick(d) {
    S.ticks++;
    const ev = d.events || [], last = ev.length ? ev[ev.length - 1].t : 0;
    if (S.lastEv && S.soundConn && last > S.lastEv && ev.some((e) => e.t > S.lastEv && e.scope === "internet") && Date.now() - S.lastBeep > 1500) { beep(660, 90); S.lastBeep = Date.now(); }
    if (last) S.lastEv = last; else if (!S.lastEv) S.lastEv = Date.now() / 1000;
    S.cpuHi = d.cpu.total > 90 ? S.cpuHi + 1 : 0;
    if (S.soundCpu && S.cpuHi >= 3 && Date.now() - S.lastCpuBeep > 30000) { beep(330, 250); S.lastCpuBeep = Date.now(); }
    if (S.ticks % 5 === 0) rdnsStep();
    if (S.ticks % 10 === 0) pullExtra();
    if (V().view === "live" && S.ticks % 10 === 0) pullHist();
    if (S.ticks % 60 === 3) pullHist();
    if (S.pip && !S.pip.closed) pipUpdate(d);
    if (VIEWS.includes(V().view) && S.ticks % 2 === 0 && V().view !== "tools" && V().view !== "guide") renderView(V().view);
  }
  function viewChanged(v) { if (VIEWS.includes(v)) { pullExtra(); if (v === "live") pullHist(); } }
  /* ---------- PiP (#45) ---------- */
  function pipOpen() {
    const msg = $("pip-msg");
    if (!window.documentPictureInPicture) { msg.textContent = x("tl.pip.no"); return; }
    documentPictureInPicture.requestWindow({ width: 260, height: 170 }).then((w) => {
      S.pip = w; w.document.body.style.cssText = "margin:0;padding:10px;background:#050708;color:#e7ecf3;font:14px system-ui,Segoe UI,sans-serif";
      w.document.body.innerHTML = "<div style=\"font-weight:700;letter-spacing:.12em;margin-bottom:6px\">VEAGLE <span style=\"color:#ff1e38\">EYE</span></div><div id=\"pp\"></div>";
      w.addEventListener("pagehide", () => { S.pip = null; }); if (V().d) pipUpdate(V().d);
    }).catch(() => { msg.textContent = x("tl.pip.no"); });
  }
  function pipUpdate(d) {
    const el = S.pip.document.getElementById("pp"); if (!el) return;
    const row = (a, b) => "<div style=\"display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid #1b2027\"><span style=\"color:#7c8697\">" + a + "</span><b>" + b + "</b></div>";
    el.innerHTML = row(esc(x("m.cpu")), d.cpu.total.toFixed(0) + "%") + row(esc(x("m.mem")), d.mem.percent.toFixed(0) + "%") + row(esc(x("m.dl")), V().fmtRate(d.net.down)) + row(esc(x("m.ul")), V().fmtRate(d.net.up)) + row(esc(x("m.cn")), String(d.conns.length));
  }
  /* ---------- εξαγωγές (#42, #43, #46) ---------- */
  function download(name, blob) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
  const stamp = () => { const n = new Date(), p = (v) => String(v).padStart(2, "0"); return n.getFullYear() + p(n.getMonth() + 1) + p(n.getDate()) + "-" + p(n.getHours()) + p(n.getMinutes()); };
  function exportCSV() {
    const d = V().d; if (!d) return; const q = (v) => "\"" + String(v == null ? "" : v).replace(/"/g, "\"\"") + "\"";
    const rows = [["program", "pid", "protocol", "local_port", "remote_address", "remote_port", "state", "scope", "country", "what", "path"].map(q).join(",")];
    d.conns.forEach((c) => rows.push([c.name, c.pid, c.proto, c.lport, c.raddr, c.rport, c.status, c.scope, c.cc, c.what, c.exe].map(q).join(",")));
    rows.push(q(x("ex.foot") + " · " + new Date().toLocaleString()));
    download("veagle-eye-connections-" + stamp() + ".csv", new Blob(["﻿" + rows.join("\r\n")], { type: "text/csv;charset=utf-8" }));
  }
  function exportPNG() {
    const d = V().d; if (!d) return; const cv = document.createElement("canvas"); cv.width = 1200; cv.height = 630; const c = cv.getContext("2d");
    const cs = getComputedStyle(document.documentElement), col = (n, f) => cs.getPropertyValue(n).trim() || f, light = document.documentElement.getAttribute("data-theme") === "daylight";
    const img = new Image();
    img.onload = () => {
      c.fillStyle = col("--bg", "#050708"); c.fillRect(0, 0, 1200, 630); c.strokeStyle = col("--accent", "#f33"); c.lineWidth = 6; c.strokeRect(3, 3, 1194, 624);
      if (light) c.filter = "invert(1)"; const hh = 90, ww = img.width * hh / img.height; c.drawImage(img, 50, 40, ww, hh); c.filter = "none";
      c.fillStyle = col("--text", "#eee"); c.font = "700 44px sans-serif"; c.fillText("VEAGLE EYE", 50 + ww + 24, 100); c.font = "24px sans-serif"; c.fillStyle = col("--dim", "#888"); c.fillText(d.info.hostname + " · " + new Date().toLocaleString(), 50 + ww + 24, 136);
      const items = [[x("m.cpu"), d.cpu.total.toFixed(0) + "%"], [x("m.mem"), d.mem.percent.toFixed(0) + "%"], [x("m.dl"), V().fmtRate(d.net.down)], [x("m.ul"), V().fmtRate(d.net.up)], [x("m.cn"), String(d.conns.length)], [x("m.pt"), String((d.listen || []).length)]];
      items.forEach((it, i) => { const px = 50 + (i % 3) * 380, py = 230 + Math.floor(i / 3) * 170; c.fillStyle = col("--dim", "#888"); c.font = "26px sans-serif"; c.fillText(it[0], px, py); c.fillStyle = col("--accent", "#f33"); c.font = "700 64px sans-serif"; c.fillText(it[1], px, py + 70); });
      c.fillStyle = col("--dim", "#888"); c.font = "24px sans-serif"; c.fillText(x("ex.foot"), 50, 590);
      cv.toBlob((b) => download("veagle-eye-" + stamp() + ".png", b), "image/png");
    };
    img.src = "eagle-white.png";
  }
  function printReport() {
    const d = V().d; if (!d) return; let old = $("printrep"); if (old) old.remove();
    const el = document.createElement("div"); el.id = "printrep";
    const exposed = (d.listen || []).filter((k) => k.exposed), top = (d.top3 || []);
    const conns = d.conns.filter((c) => c.scope === "internet").slice(0, 25);
    el.innerHTML = "<div class=\"pr-h\"><img src=\"eagle-white.png\" alt=\"\"><div><h1>VEAGLE EYE</h1><p>" + esc(x("ex.title")) + " · " + esc(d.info.hostname) + " · " + esc(new Date().toLocaleString()) + "</p></div></div>" +
      "<h2>" + esc(x("system")) + "</h2><table><tr><td>" + esc(x("m.cpu")) + "</td><td>" + d.cpu.total.toFixed(0) + "%</td><td>" + esc(x("m.mem")) + "</td><td>" + d.mem.percent.toFixed(0) + "%</td></tr><tr><td>" + esc(x("m.dl")) + "</td><td>" + V().fmtRate(d.net.down) + "</td><td>" + esc(x("m.ul")) + "</td><td>" + V().fmtRate(d.net.up) + "</td></tr><tr><td>" + esc(x("m.pr")) + "</td><td>" + d.proc_count + "</td><td>" + esc(x("sys.up")) + "</td><td>" + esc(V().fmtDur(d.uptime)) + "</td></tr></table>" +
      "<h2>" + esc(x("sec.ports")) + "</h2><p>" + esc(exposed.length ? x("sec.expcount", { n: exposed.length }) : x("sec.noexp")) + "</p>" + (exposed.length ? "<table>" + exposed.slice(0, 30).map((k) => "<tr><td>" + k.port + "</td><td>" + esc(k.name) + "</td><td>" + esc(portText(k.port, k.what)) + "</td></tr>").join("") + "</table>" : "") +
      "<h2>" + esc(x("live.top3")) + "</h2><table>" + top.map((p) => "<tr><td>" + esc(p.name) + "</td><td>" + x("live.conns", { n: p.count }) + "</td></tr>").join("") + "</table>" +
      "<h2>" + esc(x("conns")) + "</h2>" + (conns.length ? "<table>" + conns.map((c) => "<tr><td>" + esc(c.name) + "</td><td>" + esc(c.raddr) + ":" + c.rport + "</td><td>" + esc(c.cc || "") + "</td><td>" + esc(c.what || "") + "</td></tr>").join("") + "</table>" : "<p>" + esc(x("ex.nocon")) + "</p>") +
      "<p class=\"pr-f\">" + esc(x("ex.foot")) + "</p>";
    document.body.appendChild(el); document.body.classList.add("printing");
    const done = () => { document.body.classList.remove("printing"); el.remove(); window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done); setTimeout(() => window.print(), 50);
  }
  /* ---------- εμφάνιση / προτιμήσεις ---------- */
  function setMode(adv) {
    S.prefs.adv = !!adv; savePrefs(); applyPrefs();
    const v = V().view, simpleOk = ["home", "procs", "net", "tools", "guide", "about", "sec", "live", "lan", "hw"];
    if (!adv && !simpleOk.includes(v)) V().go("home"); else if (adv && v === "home") V().go("dash");
    if (VIEWS.includes(V().view) && V().d) renderView(V().view);
  }
  function applyPrefs() {
    document.documentElement.classList.toggle("xl", !!S.prefs.big); document.body.classList.toggle("simple", !S.prefs.adv);
    document.querySelectorAll("#modesw button").forEach((b) => b.classList.toggle("on", (b.dataset.mode === "adv") === !!S.prefs.adv));
    const dash = document.querySelector("#v-dash .dash"); if (dash) dash.dataset.hide = S.prefs.hide.join(" ");
  }
  /* ---------- οδηγός πρώτης χρήσης (#51) ---------- */
  function tour(step) {
    let ov = $("tour"); if (!ov) { ov = document.createElement("div"); ov.id = "tour"; document.body.appendChild(ov); }
    if (step > 2) { ov.remove(); try { localStorage.setItem("veagleeye.tour", "1"); } catch (_) {} return; }
    ov.innerHTML = "<div class=\"tbox\"><img src=\"eagle-white.png\" alt=\"Veagle\"><h2>" + esc(x("gd.s" + (step + 1) + "t")) + "</h2><p>" + esc(x("gd.s" + (step + 1))) + "</p><div class=\"dots\">" + [0, 1, 2].map((i) => "<i class=\"" + (i === step ? "on" : "") + "\"></i>").join("") + "</div><div class=\"tools\"><button class=\"chip on\" type=\"button\" data-tour=\"" + (step + 1) + "\">" + esc(x(step === 2 ? "gd.done" : "gd.next")) + "</button>" + (step < 2 ? "<button class=\"chip\" type=\"button\" data-tour=\"9\">" + esc(x("gd.skip")) + "</button>" : "") + "</div></div>";
  }
  /* ---------- «?» στις κάρτες του dashboard (#49) ---------- */
  const HELPS = [[".r1", "hp.cpu"], [".r2", "hp.mem"], [".r3", "hp.disk"], [".c-cpu", "hp.chcpu"], [".c-net", "hp.chnet"], [".c-conn", "hp.conn"], [".c-cores", "hp.cores"]];
  function helpPop(key, anchor) {
    let p = $("helppop"); if (p) { const same = p.dataset.k === key; p.remove(); if (same) return; }
    p = document.createElement("div"); p.id = "helppop"; p.dataset.k = key; p.setAttribute("role", "dialog");
    p.innerHTML = "<p>" + esc(x(key)) + "</p><button class=\"chip\" type=\"button\" data-closepop=\"1\">" + esc(x("close")) + "</button>"; document.body.appendChild(p);
    const r = anchor.getBoundingClientRect(); p.style.top = Math.min(window.innerHeight - p.offsetHeight - 10, r.bottom + 6) + "px"; p.style.left = Math.max(8, Math.min(window.innerWidth - p.offsetWidth - 8, r.right - p.offsetWidth)) + "px";
  }
  /* ---------- σύνδεση γεγονότων ---------- */
  function wire() {
    document.addEventListener("click", (e) => {
      const tg = e.target.closest("[data-help],[data-path],[data-scan],[data-ping],[data-ab],[data-q],.sw,[data-tour],[data-closepop],[data-dh],[data-mode],[data-go],button[id]"); if (!tg) { const p = $("helppop"); if (p && !e.target.closest("#helppop")) p.remove(); return; }
      const ds = tg.dataset;
      if (ds.help) { const hb = tg.closest(".card").querySelector(".helpbox"); if (hb) hb.classList.toggle("hide"); }
      else if (ds.dh) helpPop(ds.dh, tg);
      else if (ds.closepop) { const p = $("helppop"); if (p) p.remove(); }
      else if (ds.path) { S.openPath[ds.path] = !S.openPath[ds.path]; S.cache = {}; if (V().d) renderView(V().view); }
      else if (ds.scan) { if (S.scanBusy) return; S.scanBusy = true; S.scan = null; renderView("sec"); API("api/scan?range=" + (ds.scan === "full" ? "full" : "quick")).then((j) => { S.scan = j; }).catch(() => { S.scan = { targets: [], tested: 0, secs: 0 }; }).finally(() => { S.scanBusy = false; renderView("sec"); }); }
      else if (ds.ping) { if (S.pingBusy) return; S.pingBusy = true; renderView("lan"); API("api/ping").then((j) => { S.ping = j; }).catch(() => { S.ping = { error: "x" }; }).finally(() => { S.pingBusy = false; renderView("lan"); }); }
      else if (ds.ab) { if (ds.ab === "a") S.snapA = snap(); else if (ds.ab === "b") S.snapB = snap(); else { S.snapA = S.snapB = null; } renderAB(); }
      else if (ds.q) { const q = S.quiz, it = QUIZ[q.i]; if (ds.q === "next") { q.i = Math.floor(Math.random() * QUIZ.length); q.done = false; } else { q.n++; const ok = (ds.q === "ok") === it[1]; if (ok) q.a++; q.done = true; q.msg = ok ? "ok" : "bad"; } quizRender(); }
      else if (ds.mode) { setMode(ds.mode === "adv"); }
      else if (ds.go) { V().go(ds.go); }
      else if (ds.theme) { V().setTheme(ds.theme, true); markTheme(); }
      else if (ds.tour) tour(+ds.tour);
      else if (tg.id === "b-tour") tour(0);
      else if (tg.id === "b-kiosk") { V().go("wall"); if (!document.fullscreenElement) V().toggleFull(); }
      else if (tg.id === "b-pip") pipOpen();
      else if (tg.id === "b-beep") beep(660, 120);
      else if (tg.id === "b-csv") exportCSV(); else if (tg.id === "b-png") exportPNG(); else if (tg.id === "b-print") printReport();
      else if (tg.id === "b-reset") { S.prefs = { big: false, simple: false, hide: [], adv: false }; savePrefs(); V().setTheme("classic", true); applyPrefs(); buildTools(); }
    });
    document.addEventListener("change", (e) => {
      const el = e.target, id = el.id;
      if (id === "cb-names") { S.names = el.checked; if (!S.names) S.rdns = {}; renderView("sec"); }
      else if (id === "cb-big") { S.prefs.big = el.checked; savePrefs(); applyPrefs(); }
      else if (id === "cb-sc") { S.soundConn = el.checked; if (el.checked) beep(660, 90); }
      else if (id === "cb-sp") { S.soundCpu = el.checked; if (el.checked) beep(330, 150); }
      else if (el.dataset && el.dataset.card) { const k = el.dataset.card, i = S.prefs.hide.indexOf(k); if (!el.checked && i < 0) S.prefs.hide.push(k); if (el.checked && i >= 0) S.prefs.hide.splice(i, 1); savePrefs(); applyPrefs(); }
    });
    document.addEventListener("input", (e) => { if (e.target.id === "dq") { S.dictQ = e.target.value; renderDict(); } });
  }
  /* ---------- αρχικοποίηση ---------- */
  function init() {
    // κενές οθόνες
    const main = $("stage");
    VIEWS.forEach((v) => { if (!$("v-" + v)) { const s = document.createElement("section"); s.className = "view hide"; s.id = "v-" + v; s.innerHTML = "<div class=\"scroll xv\" id=\"x-" + v + "\"></div>"; main.appendChild(s); } });
    // κουμπιά «?» στο dashboard
    HELPS.forEach((h) => { const c = document.querySelector("#v-dash " + h[0]); if (c) { const b = document.createElement("button"); b.type = "button"; b.className = "qm abs"; b.dataset.dh = h[1]; b.textContent = "?"; b.setAttribute("aria-label", x("help")); c.appendChild(b); } });
    // υποσέλιδο με λογότυπο, ιστότοπο και έκδοση
    const f = document.createElement("div"); f.className = "app-foot"; f.id = "appfoot"; $("os").appendChild(f);
    // «Σχετικά»: λογότυπο και σύνδεσμοι
    const ab = document.querySelector("#v-about .about"); if (ab) { const bx = document.createElement("div"); bx.id = "aboutbrand"; ab.appendChild(bx); }
    buildViews(); wire(); applyPrefs(); footer();
    try { if (!localStorage.getItem("veagleeye.tour")) setTimeout(() => tour(0), 900); } catch (_) {}
    pullExtra(); pullHist();
  }
  function footer() {
    const f = $("appfoot"); if (f) f.innerHTML = "Veagle Eye · <a href=\"" + SITE + "\" target=\"_blank\" rel=\"noopener\">ferelis.gr</a> · " + esc(x("brand.foot", { v: VERSION }).replace(/^.*?(Έκδοση|Version)/, "$1"));
    const b = $("aboutbrand"); if (b) b.innerHTML = brandHTML();
  }
  function lang() { if (!$("x-sec")) return; buildViews(); footer(); if (V() && V().d && VIEWS.includes(V().view)) renderView(V().view); document.querySelectorAll(".qm.abs").forEach((b) => b.setAttribute("aria-label", x("help"))); }
  window.Extra = { has: (v) => VIEWS.includes(v), render: (v) => { if (v === "tools" || v === "guide") return; renderView(v); }, tick, viewChanged, init, lang };
})();
