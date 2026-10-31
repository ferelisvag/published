/* VEAGLE PC Check - core: helpers, data access, rules engine */

/* The pristine page (taken before anything is rendered) is kept so a "share-safe copy" can be rebuilt from it. */
var PAGE = (function () {
  var cs = document.currentScript;
  var out = { code: cs ? cs.textContent : '', head: document.head.innerHTML, body: '' };
  try {
    var sk = document.body.cloneNode(true);
    Array.prototype.slice.call(sk.querySelectorAll('script')).forEach(function (n) { n.parentNode.removeChild(n); });
    out.body = sk.innerHTML;
  } catch (e) { }
  return out;
})();

function Engine(RAW) {
  'use strict';
  var D = RAW || {};

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function arr(x) { return Array.isArray(x) ? x : (x == null ? [] : [x]); }
  function num(x, d) { var n = Number(x); return isFinite(n) ? n : (d == null ? 0 : d); }
  function g(o, path, d) {
    var cur = o;
    var parts = path.split('.');
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return d;
      cur = cur[parts[i]];
    }
    return cur == null ? d : cur;
  }
  function sum(a, f) { var s = 0; arr(a).forEach(function (x) { s += num(f ? f(x) : x); }); return s; }
  function fmtNum(n, dec) { return num(n).toLocaleString('en-US', { maximumFractionDigits: dec == null ? 0 : dec }); }
  function fmtGB(gb) {
    var n = num(gb, NaN);
    if (!isFinite(n)) return '-';
    if (n >= 1000) return fmtNum(n / 1024, 2) + ' TB';
    return fmtNum(n, n < 10 ? 1 : 0) + ' GB';
  }
  function fmtDate(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function fmtDT(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  function fmtUptime(h) {
    var n = num(h, NaN);
    if (!isFinite(n)) return '-';
    if (n < 1) return Math.round(n * 60) + ' min';
    if (n < 48) return fmtNum(n, 1) + ' h';
    return fmtNum(n / 24, 1) + ' days';
  }
  function ageDays(iso) {
    if (!iso) return null;
    var d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  }
  function uniq(a) { var seen = {}; return arr(a).filter(function (x) { var k = String(x).toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; }); }
  function words(a, max) { a = arr(a); var s = a.slice(0, max || 6).join(', '); return a.length > (max || 6) ? s + ' and ' + (a.length - (max || 6)) + ' more' : s; }

  /* ---------------- event helpers ---------------- */
  function evGroups(log) { return arr(g(D, 'events.' + log + '.groups', [])); }
  function evCount(log, provRe, ids, level) {
    var n = 0;
    evGroups(log).forEach(function (x) {
      if (provRe && !provRe.test(x.provider || '')) return;
      if (ids && ids.indexOf(Number(x.id)) < 0) return;
      if (level && x.level !== level) return;
      n += num(x.count);
    });
    return n;
  }
  function lastAge(log, provRe, ids) {
    var best = null;
    evGroups(log).forEach(function (x) {
      if (provRe && !provRe.test(x.provider || '')) return;
      if (ids && ids.indexOf(Number(x.id)) < 0) return;
      var a = ageDays(x.lastSeen);
      if (a != null && (best == null || a < best)) best = a;
    });
    return best;
  }
  function down(sev) { return sev === 'high' ? 'medium' : 'low'; }
  function evSample(log, provRe, ids) {
    var best = null;
    evGroups(log).forEach(function (x) {
      if (provRe && !provRe.test(x.provider || '')) return;
      if (ids && ids.indexOf(Number(x.id)) < 0) return;
      if (!best || x.count > best.count) best = x;
    });
    return best ? (best.provider + ' ' + best.id + ': ' + (best.sample || '(no message text)')) : '';
  }

  /* ---------------- regex tables ---------------- */
  var RE = {
    emulator: /memu|bluestacks|nox\s?player|ldplayer|genymotion|msi app player/i,
    remote: /anydesk|teamviewer|rustdesk|ultraviewer|splashtop|logmein|realvnc|tightvnc|ultravnc|chrome remote|supremo|ammyy|radmin|dwservice|parsec|agent dvr/i,
    remoteTools: /anydesk|teamviewer|rustdesk|ultraviewer|splashtop|logmein|vnc|chrome remote|supremo|ammyy|radmin|dwservice/i,
    vpn: /nordvpn|openvpn|wireguard|expressvpn|surfshark|protonvpn|cyberghost|mullvad|windscribe|private internet access|bitdefender vpn|smart vpn|anyconnect|forticlient|globalprotect|pulse secure|hotspot shield|hide\.me|tunnelbear/i,
    optimizer: /ccleaner|driver booster|iobit|advanced systemcare|pc optimizer|driver easy|driverpack|reimage|mackeeper|avast cleanup|registry cleaner|slimcleaner|wise care|pc cleaner|speedupmypc|driver updater|toolbar/i,
    secApp: /anydesk|teamviewer|rustdesk|winrar|7-zip|7zip|chrome|firefox|edge|zoom|openvpn|java|adobe|acrobat|vlc|notepad\+\+|putty|filezilla|git\b|python|node\.?js|docker|vmware|virtualbox|openssh|wireshark|office|teams|outlook|nordvpn|windows terminal|powershell|webview|brave|opera|thunderbird|ledger|steam|discord|winscp|handbrake/i,
    launcher: /discord|steam|epic|ea app|ea desktop|origin|gog|ubisoft|battle\.net|wargaming|rockstar|spotify|teams|onedrive|dropbox|google drive|adobe|creative cloud|acrobat|skype|ccleaner|itunes|filmora|wondershare|insta360|acdsee|brave|edge|nvidia broadcast|razer|logitech|corsair|steelseries|msi|asus|armoury|gigabyte|anydesk|viber|telegram|whatsapp|zoom/i
  };

  /* ---------------- finding builder ---------------- */
  var SEV_ORDER = { high: 0, medium: 1, low: 2, info: 3 };
  var PEN = { high: 8, medium: 3, low: 0.8, info: 0 };
  var AREAS = ['Stability', 'Storage', 'Security', 'Network', 'Backup', 'Performance', 'Updates', 'Software'];
  function F(id, area, sev, title, why, steps, evidence) {
    return { id: id, area: area, sev: sev, title: title, why: why, steps: arr(steps), evidence: evidence || '' };
  }
  function S(t, cmd) { return { t: t, cmd: cmd || '' }; }

  /* ---------------- plain-language helpers (v0.3) ---------------- */
  function bugKey(c) { var n = parseInt(String(c).replace(/^0x/i, ''), 16); return isFinite(n) ? '0x' + n.toString(16) : String(c).toLowerCase(); }
  var BUGCODES = {
    '0x1a': ['MEMORY_MANAGEMENT', 'Windows found a problem with memory (RAM). Often bad RAM or a driver.'],
    '0x19': ['BAD_POOL_HEADER', 'A driver or bad RAM damaged Windows memory.'],
    '0xa': ['IRQL_NOT_LESS_OR_EQUAL', 'A driver touched memory it should not. Usually a faulty driver, sometimes RAM.'],
    '0xd1': ['DRIVER_IRQL_NOT_LESS_OR_EQUAL', 'A driver misbehaved, often network or Wi-Fi.'],
    '0x1e': ['KMODE_EXCEPTION_NOT_HANDLED', 'A program running deep inside Windows (usually a driver) crashed.'],
    '0x24': ['NTFS_FILE_SYSTEM', 'A problem reading the drive. Check the drive health.'],
    '0x3b': ['SYSTEM_SERVICE_EXCEPTION', 'A driver or security program clashed with Windows.'],
    '0x4e': ['PFN_LIST_CORRUPT', 'Bad RAM or a driver.'],
    '0x50': ['PAGE_FAULT_IN_NONPAGED_AREA', 'Windows asked for memory that was not there. Bad RAM or driver.'],
    '0x7a': ['KERNEL_DATA_INPAGE_ERROR', 'Windows could not read something from the drive. Failing drive, loose cable or bad RAM.'],
    '0x7e': ['SYSTEM_THREAD_EXCEPTION_NOT_HANDLED', 'A driver crashed.'],
    '0x7f': ['UNEXPECTED_KERNEL_MODE_TRAP', 'Hardware trouble: RAM, an overclock or overheating.'],
    '0x9f': ['DRIVER_POWER_STATE_FAILURE', 'A device did not wake up or go to sleep correctly. Often a laptop sleep or USB driver problem.'],
    '0xbe': ['ATTEMPTED_WRITE_TO_READONLY_MEMORY', 'A driver tried to write where it must not.'],
    '0xc2': ['BAD_POOL_CALLER', 'A driver asked for memory in a wrong way.'],
    '0xc5': ['DRIVER_CORRUPTED_EXPOOL', 'A driver damaged memory.'],
    '0xea': ['THREAD_STUCK_IN_DEVICE_DRIVER', 'The graphics driver got stuck.'],
    '0xef': ['CRITICAL_PROCESS_DIED', 'An essential part of Windows stopped. Damaged system files, a bad update or a failing drive.'],
    '0xf4': ['CRITICAL_OBJECT_TERMINATION', 'An essential process died, often because the drive stopped answering.'],
    '0x101': ['CLOCK_WATCHDOG_TIMEOUT', 'A CPU core stopped responding. Overclock, BIOS settings or a hot CPU.'],
    '0x109': ['CRITICAL_STRUCTURE_CORRUPTION', 'Memory was changed where it must not be. Driver or bad RAM.'],
    '0x116': ['VIDEO_TDR_FAILURE', 'The graphics card or its driver stopped answering.'],
    '0x117': ['VIDEO_TDR_TIMEOUT_DETECTED', 'The graphics card took too long to answer.'],
    '0x119': ['VIDEO_SCHEDULER_INTERNAL_ERROR', 'The graphics driver or card has an internal problem.'],
    '0x124': ['WHEA_UNCORRECTABLE_ERROR', 'The hardware itself reported a fatal error: CPU, RAM, or a device on the motherboard. Often an overclock or unstable memory settings.'],
    '0x133': ['DPC_WATCHDOG_VIOLATION', 'A driver or an SSD got stuck and froze Windows. Update the SSD firmware and drivers.'],
    '0x139': ['KERNEL_SECURITY_CHECK_FAILURE', 'Windows found damaged data. A driver or bad RAM.'],
    '0x154': ['UNEXPECTED_STORE_EXCEPTION', 'The drive (often an SSD) stopped answering.']
  };
  var NOISE = {
    'Microsoft-Windows-DistributedCOM|10016': 'A harmless permission message. Windows prints it very often. Safe to ignore.',
    'Microsoft-Windows-DistributedCOM|10010': 'A background program was slow to start. Usually harmless, ignore unless something really does not work.',
    'Microsoft-Windows-DistributedCOM|10005': 'A Windows service could not start. Harmless if the related app (for example Xbox or Gaming Services) is not needed.',
    'Service Control Manager|7000': 'A service could not start. Matters only if the named service is something you use.',
    'Service Control Manager|7001': 'A service did not start because another one it needs did not start.',
    'Service Control Manager|7009': 'A service was too slow to start. Often seen after a slow boot. Usually harmless.',
    'Service Control Manager|7023': 'A service stopped with an error. Check the name: if it is a program you no longer use, ignore it.',
    'Service Control Manager|7031': 'A service crashed and Windows restarted it. A few are normal, many from the same name mean a broken program.',
    'Service Control Manager|7034': 'A service crashed by itself. Many times from the same name means a broken or incompatible program.',
    'Microsoft-Windows-Kernel-PnP|219': 'A driver could not load. Usually an old or unused device. Harmless unless a device really does not work.',
    'Microsoft-Windows-Kernel-Power|41': 'The PC restarted without a clean shutdown (power cut, crash or holding the power button). Not harmless if it repeats.',
    'Microsoft-Windows-WHEA-Logger|17': 'The hardware reported a small error it could fix. A few are normal. Many in a row can mean overclock or a failing part.',
    'Microsoft-Windows-WHEA-Logger|18': 'The hardware reported a serious error. Not harmless, see the stability findings.',
    'Microsoft-Windows-WHEA-Logger|19': 'The hardware reported a corrected error. A few are normal.',
    'Schannel|36887': 'A secure connection was refused by the other side. Harmless noise from browsers and programs.',
    'Schannel|36874': 'A program tried an old secure connection type that is no longer accepted. Harmless noise.',
    'Microsoft-Windows-GroupPolicy|1129': 'The PC could not reach a company network to read its rules. Normal at home.',
    'Microsoft-Windows-DNS-Client|1014': 'A website name took too long to be looked up. A few are normal on slow or busy networks.',
    'Microsoft-Windows-Time-Service|134': 'The clock could not sync with the internet time server for a moment. Harmless if rare.',
    'Microsoft-Windows-Time-Service|36': 'The clock has not synced for a while. Check the time sync finding.',
    'Microsoft-Windows-CAPI2|4176': 'A certificate file could not be read. Usually harmless background noise.',
    'Microsoft-Windows-CAPI2|513': 'The certificate service could not make a backup copy of a system file. Usually harmless.',
    'Microsoft-Windows-Diagnostics-Performance|100': 'Windows noted a slow start. See the boot time finding.',
    'Microsoft-Windows-Diagnostics-Performance|101': 'A program slowed down the start of Windows.',
    'Microsoft-Windows-WindowsUpdateClient|20': 'An update failed to install. Vendor driver extensions failing is usually harmless.',
    'Microsoft-Windows-WindowsUpdateClient|25': 'Windows could not check for updates this time. Try again later.',
    'Microsoft-Windows-FilterManager|3': 'Windows could not attach a file filter to a drive. Usually a USB drive. Harmless.',
    'Ntfs|55': 'Windows found a problem in the file system of a drive. Back up and run a drive check.',
    'Volsnap|36': 'The space reserved for restore points is full. See the System Restore finding.',
    'disk|7': 'Windows found a bad block on a drive. Not harmless: back up and check the drive health.',
    'disk|11': 'A drive did not answer correctly. Check the cable and the drive health.',
    'disk|51': 'A drive had a read or write error. Check the drive health.',
    'disk|153': 'Windows had to retry a read or write on a drive. A few are normal, many point to a failing drive or cable.',
    'nvlddmkm|153': 'The NVIDIA graphics driver restarted. A burst in a game is common. Many over time means a driver or heat problem.',
    'Display|4101': 'The graphics driver stopped responding and recovered. A few are normal, many mean a driver or heat problem.',
    'Application Error|1000': 'A program crashed. See which one in the crash list.',
    'Application Hang|1002': 'A program stopped responding and was closed.',
    'Microsoft-Windows-Search|10024': 'The Windows search indexer was closed. See the Windows Search finding.',
    'Tcpip|4266': 'Windows ran out of free network ports for a moment. See the network ports finding.',
    'Microsoft-Windows-BitLocker-Driver|24641': 'A BitLocker message during restart. Usually harmless if BitLocker works.'
  };
  function noiseFor(provider, id) { return NOISE[provider + '|' + id] || ''; }

  var META = {
    'stab-shutdown': [10, 'Easy', 'Safe'], 'stab-bsod': [20, 'Medium', 'Safe'], 'stab-bsod-codes': [5, 'Easy', 'Safe'], 'stab-whea': [30, 'Ask a pro', 'Careful'], 'stab-gpu': [10, 'Easy', 'Safe'],
    'stab-disk': [20, 'Medium', 'Back up first'], 'stab-dism': [60, 'Medium', 'Safe'], 'stab-crashes': [10, 'Easy', 'Safe'], 'stab-crashes-gone': [2, 'Easy', 'Safe'], 'stab-services': [10, 'Easy', 'Safe'], 'stab-ports': [15, 'Ask a pro', 'Safe'],
    'stab-hangs': [5, 'Easy', 'Safe'], 'stab-search': [10, 'Easy', 'Safe'], 'stab-vss': [5, 'Medium', 'Safe'], 'stab-wu': [10, 'Easy', 'Safe'], 'stab-pending': [2, 'Easy', 'Safe'], 'stab-uptime': [2, 'Easy', 'Safe'], 'stab-index': [10, 'Easy', 'Safe'],
    'sto-health': [5, 'Ask a pro', 'Back up first'], 'sto-smart': [5, 'Ask a pro', 'Back up first'], 'sto-space': [15, 'Easy', 'Safe'], 'sto-trim': [5, 'Medium', 'Safe'], 'sto-hdd': [60, 'Medium', 'Back up first'], 'sto-temp': [10, 'Easy', 'Safe'],
    'sec-av': [10, 'Easy', 'Safe'], 'sec-av2': [15, 'Medium', 'Safe'], 'sec-avold': [5, 'Easy', 'Safe'], 'sec-fw': [2, 'Easy', 'Safe'], 'sec-uac': [2, 'Easy', 'Safe'], 'sec-sb': [15, 'Ask a pro', 'Careful'], 'sec-tpm': [15, 'Ask a pro', 'Careful'], 'sec-tpm2': [5, 'Medium', 'Safe'],
    'sec-legacy': [5, 'Medium', 'Safe'], 'sec-rdp': [3, 'Easy', 'Safe'], 'sec-remote': [10, 'Easy', 'Safe'], 'soft-vpn': [5, 'Easy', 'Safe'], 'sec-admins': [10, 'Medium', 'Safe'], 'sec-mi': [10, 'Medium', 'Safe'], 'sec-bl': [5, 'Easy', 'Safe'],
    'sec-def-sigs': [5, 'Easy', 'Safe'], 'sec-def-threats': [30, 'Medium', 'Safe'], 'sec-def-tamper': [2, 'Easy', 'Safe'], 'sec-def-scan': [5, 'Easy', 'Safe'], 'sec-rdp-nla': [3, 'Easy', 'Safe'], 'sec-autologon': [3, 'Easy', 'Safe'], 'sec-uac-level': [3, 'Easy', 'Safe'],
    'sec-smb1': [5, 'Medium', 'Safe'], 'sec-shares': [10, 'Medium', 'Safe'], 'sec-ports': [15, 'Ask a pro', 'Safe'], 'sec-activation': [10, 'Medium', 'Safe'], 'sec-unsigned': [20, 'Medium', 'Safe'],
    'net-link': [5, 'Easy', 'Safe'], 'net-gw': [10, 'Easy', 'Safe'], 'net-dns': [5, 'Easy', 'Safe'], 'net-time': [2, 'Easy', 'Safe'], 'net-wifi': [10, 'Easy', 'Safe'], 'net-proxy': [3, 'Easy', 'Safe'], 'net-hosts': [10, 'Medium', 'Safe'],
    'bak-none': [20, 'Easy', 'Safe'], 'bak-restore': [5, 'Easy', 'Safe'], 'bak-winre': [3, 'Medium', 'Safe'],
    'upd-patch': [15, 'Easy', 'Safe'], 'upd-apps': [15, 'Easy', 'Safe'], 'upd-bios': [30, 'Ask a pro', 'Careful'], 'upd-gpu': [10, 'Easy', 'Safe'], 'upd-devices': [10, 'Medium', 'Safe'], 'drv-bios-age': [10, 'Medium', 'Safe'],
    'perf-boot': [15, 'Easy', 'Safe'], 'perf-startup': [10, 'Easy', 'Safe'], 'perf-ram': [5, 'Easy', 'Safe'], 'perf-ramfull': [15, 'Medium', 'Safe'], 'perf-xmp': [15, 'Ask a pro', 'Careful'], 'perf-dual': [20, 'Medium', 'Safe'],
    'perf-fast': [60, 'Medium', 'Back up first'], 'perf-power': [2, 'Easy', 'Safe'], 'perf-services': [10, 'Medium', 'Safe'], 'soft-emu': [10, 'Easy', 'Safe'], 'soft-xtu': [10, 'Easy', 'Safe'], 'soft-opt': [10, 'Medium', 'Safe'],
    'sto-where': [5, 'Easy', 'Safe'], 'sto-installers': [10, 'Easy', 'Safe'], 'sto-winold': [10, 'Easy', 'Safe'], 'sto-wucache': [5, 'Easy', 'Safe'], 'sto-recycle': [3, 'Easy', 'Safe'], 'sto-bigfiles': [10, 'Easy', 'Safe'],
    'soft-pup': [15, 'Medium', 'Safe'], 'soft-avmany': [10, 'Medium', 'Safe'], 'gam-mode': [2, 'Easy', 'Safe'], 'gam-hags': [5, 'Easy', 'Safe'], 'gam-dvr': [2, 'Easy', 'Safe'],
    'cor-start': [20, 'Medium', 'Back up first'], 'cor-wake': [20, 'Medium', 'Safe'], 'cor-disk': [30, 'Ask a pro', 'Back up first'], 'cor-gpu': [15, 'Medium', 'Safe'], 'cor-hours': [10, 'Easy', 'Safe'], 'cor-boot': [10, 'Easy', 'Safe'], 'cor-power': [5, 'Easy', 'Safe'], 'cor-burst': [3, 'Easy', 'Safe'],
    'win-eol': [60, 'Medium', 'Back up first'], 'bat-wear': [10, 'Easy', 'Safe'], 'scan-quick': [5, 'Easy', 'Safe']
  };
  var PROFILES = {
    home: { label: 'Home PC', note: 'Balanced advice for a normal home computer.' },
    work: { label: 'Work or clinic PC', note: 'Security, backups and time sync count one level more.', areas: ['Security', 'Backup'], ids: ['net-time', 'sec-def-sigs'] },
    gaming: { label: 'Gaming PC', note: 'Graphics, memory speed and storage speed count one level more.', ids: ['gam-mode', 'gam-hags', 'gam-dvr', 'perf-xmp', 'stab-gpu', 'perf-power', 'upd-gpu', 'perf-dual', 'perf-fast', 'perf-boot', 'sto-hdd', 'sto-temp'] }
  };
  function bump(sev) { return sev === 'info' ? 'low' : (sev === 'low' ? 'medium' : 'high'); }
  function withProfile(base, key) {
    var p = PROFILES[key] || PROFILES.home;
    var out = base.map(function (f) {
      var hit = (p.areas && p.areas.indexOf(f.area) >= 0) || (p.ids && p.ids.indexOf(f.id) >= 0);
      if (!hit || f.sev === 'high') return f;
      var c = {}; Object.keys(f).forEach(function (k) { c[k] = f[k]; }); c.sev = bump(f.sev); c.raised = true; return c;
    });
    out.sort(function (a, b) { return SEV_ORDER[a.sev] - SEV_ORDER[b.sev]; });
    return out;
  }

  /* ---------------- rules ---------------- */
  function runRules() {
    var out = [];
    var days = num(g(D, 'events.days', 30), 30);
    function add(f) { if (f) out.push(f); }
    function R(fn) { try { add(fn()); } catch (e) { out.push(F('rule-error', 'Software', 'info', 'A check could not run', String(e && e.message || e), [], '')); } }

    var apps = arr(g(D, 'apps.list', []));
    var appNames = apps.map(function (a) { return a.name || ''; });
    function appsMatching(re) { return uniq(appNames.filter(function (n) { return re.test(n); })); }
    var outdated = arr(g(D, 'apps.outdated', []));
    var disks = arr(D.disks);
    var vols = arr(D.volumes).filter(function (v) { return !v.driveType || /fixed/i.test(v.driveType); });
    var crashApps = arr(g(D, 'events.appCrashes', []));
    var crashEmitted = false;

    /* --- stability --- */
    R(function () {
      var kp = evCount('system', /Kernel-Power/, [41]);
      var sd = evCount('system', /^EventLog$/, [6008]);
      var n = Math.max(kp, sd);
      if (n < 1) return null;
      var age = lastAge('system', /Kernel-Power|^EventLog$/, [41, 6008]);
      var sev = n >= 3 ? 'high' : 'medium';
      if (age != null && age > 14) sev = down(sev);
      return F('stab-shutdown', 'Stability', sev,
        'Unexpected shutdowns or restarts (' + n + ' in ' + days + ' days' + (age != null && age > 14 ? ', last ' + age + ' days ago' : '') + ')',
        'Windows recorded that it was not shut down cleanly. Common causes are power cuts, holding the power button, overheating, a weak power supply, unstable RAM or an overclock, and driver crashes.',
        [S('Think about whether these were intentional (power cut, forced power-off). If yes, you can ignore this.'),
         S('Check CPU and GPU temperatures under load with HWiNFO or Task Manager.'),
         S('Run the Windows memory test. The PC restarts and checks RAM.', 'mdsched.exe'),
         S('If it keeps happening, use the AI help tab and tell the assistant when it happens (idle, gaming, at startup).')],
        evSample('system', /Kernel-Power|EventLog/, [41, 6008]));
    });
    R(function () {
      var bs = evCount('system', /WER-SystemErrorReporting/, [1001]);
      var dumps = num(g(D, 'crashDumps.dumps', 0));
      var n = Math.max(bs, dumps);
      if (n < 1) return null;
      return F('stab-bsod', 'Stability', 'high', 'Blue screen crashes (' + n + ')',
        'Windows stopped with a blue screen. Almost always a driver, faulty RAM, or failing hardware.',
        [S('Update the graphics driver and the chipset driver from the manufacturer.'),
         S('Repair system files.', 'sfc /scannow'),
         S('Test the memory.', 'mdsched.exe'),
         S('Dump files are in C:\\Windows\\Minidump. Share the scan with an AI assistant (AI help tab) and mention the blue screen text.')],
        evSample('system', /WER-SystemErrorReporting/, [1001]) + (dumps ? ' | dump files found: ' + dumps : ''));
    });
    R(function () {
      var n = evCount('system', /WHEA-Logger/);
      if (n < 1) return null;
      return F('stab-whea', 'Stability', 'high', 'Hardware error reports (WHEA): ' + n,
        'The CPU, RAM, a PCIe device or a drive reported an error at hardware level. Often caused by an overclock, unstable XMP/EXPO memory, or a failing component.',
        [S('Remove any CPU/GPU overclock and test with default BIOS settings.'),
         S('Turn XMP/EXPO off temporarily and see if the errors stop.'),
         S('Update the BIOS if a newer stable version exists.'),
         S('Run the memory test.', 'mdsched.exe')],
        evSample('system', /WHEA-Logger/));
    });
    R(function () {
      var n = evCount('system', /^(nvlddmkm|amdkmdag|amdwddmg|atikmpag|igfx.*|Display)$/i, [13, 14, 141, 153, 4101]);
      if (n < 5) return null;
      var age = lastAge('system', /^(nvlddmkm|amdkmdag|amdwddmg|atikmpag|igfx.*|Display)$/i, [13, 14, 141, 153, 4101]);
      var sev = n >= 20 ? 'medium' : 'low';
      if (age != null && age > 14) sev = 'low';
      return F('stab-gpu', 'Stability', sev, 'Graphics driver errors or resets (' + n + (age != null && age > 14 ? ', last ' + age + ' days ago' : '') + ')',
        'The display driver reported errors or recovered from a freeze. They sometimes come in one short burst (for example during a game) and are harmless afterwards.',
        [S('Check whether you saw black screens, freezes or flicker. If not, this was probably a one-time burst.'),
         S('If it repeats, do a clean driver install (DDU in Safe Mode) of the latest stable driver.'),
         S('Check GPU temperature and power cables.')],
        evSample('system', /^(nvlddmkm|amdkmdag|amdwddmg|atikmpag|igfx.*|Display)$/i));
    });
    R(function () {
      var n = evCount('system', /^(disk|Ntfs|stornvme|storahci|volmgr|iaStor.*|nvme)$/i, [7, 11, 15, 51, 55, 98, 129, 153, 157]);
      if (n < 1) return null;
      var age = lastAge('system', /^(disk|Ntfs|stornvme|storahci|volmgr|iaStor.*|nvme)$/i, [7, 11, 15, 51, 55, 98, 129, 153, 157]);
      var sev = n >= 10 ? 'high' : (n >= 3 ? 'medium' : 'low');
      if (age != null && age > 14) sev = down(sev);
      return F('stab-disk', 'Stability', sev, 'Drive or file system errors (' + n + (age != null && age > 14 ? ', last ' + age + ' days ago' : '') + ')',
        'Windows logged read/write retries or file system problems. A few can come from a USB or virtual disk; many point to a failing drive or cable.',
        [S('Back up important data first.'),
         S('Run an online scan of the system drive (read-only).', 'chkdsk C: /scan'),
         S('Check the SMART data in the Hardware tab (wear, temperature, errors).'),
         S('For SATA drives, reseat the data cable.')],
        evSample('system', /^(disk|Ntfs|stornvme|storahci|volmgr|iaStor.*|nvme)$/i, [7, 11, 15, 51, 55, 98, 129, 153, 157]));
    });
    R(function () {
      var st = g(D, 'dism.state', '');
      if (st !== 'repairable' && st !== 'corrupt') return null;
      return F('stab-dism', 'Stability', 'high', 'Windows component store ' + (st === 'corrupt' ? 'is damaged' : 'needs repair'),
        'DISM reports damage in the Windows component store. Updates and system repair can fail until it is fixed.',
        [S('Open PowerShell as administrator (press the Windows key, type PowerShell, right-click it, choose Run as administrator). Paste this and press Enter. It needs internet and takes 20 to 60 minutes on some PCs. The percentage often looks frozen at 20, 40 or 62 percent: that is normal, wait at least an hour before you worry. Do not switch the PC off.', 'DISM /Online /Cleanup-Image /RestoreHealth'),
         S('Then check system files.', 'sfc /scannow'),
         S('Restart, then run Windows Update again.')],
        g(D, 'dism.text', ''));
    });
    R(function () {
      var top = crashApps[0];
      if (!top || num(top.count) < 5) return null;
      var stem = String(top.app).replace(/\.exe$/i, '').replace(/(service|svc|helper|updater|launcher)$/i, '').toLowerCase();
      var stillThere = stem.length >= 4 ? appsMatching(new RegExp(stem.replace(/[^a-z0-9]/g, '.?').slice(0, 14), 'i')).length > 0 : true;
      var gone = top.exists === false || (top.exists == null && !stillThere && arr(D.apps && D.apps.list).length > 20);
      if (gone) {
        return F('stab-crashes-gone', 'Stability', 'info', top.app + ' crashed ' + top.count + ' times in ' + days + ' days, but it is no longer installed',
          'Windows remembers errors for 30 days. This program is not on your PC any more (you probably removed it), so there is nothing to fix. The old entries disappear by themselves.',
          [S('Nothing to do. If you removed it on purpose, you are done.'), S('If something odd still happens, look at the finding about services that are not running: leftovers of removed programs are the usual cause.')],
          crashApps.slice(0, 6).map(function (c) { return c.app + ' x' + c.count + (c.exists === false ? ' (file not found)' : ''); }).join(', '));
      }
      var isEmu = RE.emulator.test(top.app);
      crashEmitted = isEmu;
      var total = sum(crashApps, function (c) { return c.count; });
      var steps = [S('Update the program to the latest version, or reinstall it.')];
      if (isEmu) steps.push(S('Android emulators often conflict with Hyper-V and Memory Integrity. Use the emulator\'s Hyper-V compatible mode, or uninstall it if you no longer use it.'));
      steps.push(S('If it is a game or app you use, check its overlays (Discord, GeForce, Steam) and disable them for a test.'));
      return F('stab-crashes', 'Stability', top.count >= 20 ? 'medium' : 'low', top.app + ' crashed ' + top.count + ' times in ' + days + ' days',
        'Repeated crashes of the same program usually mean a broken installation, a driver or overlay conflict, or an incompatibility with this Windows setup.',
        steps, crashApps.slice(0, 6).map(function (c) { return c.app + ' x' + c.count; }).join(', ') + ' (total ' + total + ' crashes)');
    });
    R(function () {
      var f = arr(g(D, 'startup.failedAutoServices', []));
      if (f.length < 2) return null;
      return F('stab-services', 'Stability', 'low', f.length + ' automatic services are not running',
        'These services are set to start automatically but are stopped with an error code. Some are normal (Xbox, vendor updaters). The others may point to broken software.',
        [S('Open the services list (Win+R, services.msc) and check the ones you recognise.', 'services.msc'),
         S('Uninstall software you no longer use; its leftover services are the usual cause.')],
        f.slice(0, 10).map(function (s) { return s.name + ' (code ' + s.exitCode + ')'; }).join(', '));
    });
    R(function () {
      var n = evCount('system', /Tcpip/, [4266, 4231]);
      if (n < 1) return null;
      var age = lastAge('system', /Tcpip/, [4266, 4231]);
      var sev = n >= 10 ? 'medium' : 'low';
      if (age != null && age > 14) sev = 'low';
      return F('stab-ports', 'Stability', sev, 'Network ports ran out (' + n + ' events' + (age != null && age > 14 ? ', last ' + age + ' days ago' : '') + ')',
        'Windows reported that every free dynamic port was in use. A program or VM is leaking connections. It can cause random connection failures.',
        [S('See which process holds the most connections (run in PowerShell).', 'Get-NetTCPConnection | Group-Object OwningProcess | Sort-Object Count -Descending | Select-Object -First 5 Count, @{n=\'Process\';e={(Get-Process -Id $_.Name -ErrorAction SilentlyContinue).ProcessName}}'),
         S('Update or restart that program. Check VPN clients and virtual machines first.')],
        evSample('system', /Tcpip/, [4266, 4231]));
    });
    R(function () {
      var n = num(g(D, 'events.appHangs', 0));
      if (n < 10) return null;
      return F('stab-hangs', 'Stability', 'low', 'Programs stopped responding ' + n + ' times',
        'Windows closed unresponsive programs. Often caused by slow storage, add-ins or an overloaded system.',
        [S('Note which programs hang (Events tab) and update them.')], '');
    });
    R(function () {
      var n = evCount('application', /Microsoft-Windows-Search/, [10024]);
      if (n < 10) return null;
      return F('stab-search', 'Stability', 'low', 'Windows Search indexer is repeatedly killed (' + n + ')',
        'The search filter host stops responding and is terminated. The indexer then burns CPU and search results get slow.',
        [S('Open Indexing Options, click Advanced, then Rebuild.', 'control.exe srchadmin.dll'),
         S('Remove big folders you do not search (game libraries, VM disks) from the index.')],
        evSample('application', /Microsoft-Windows-Search/, [10024]));
    });
    R(function () {
      var n = evCount('system', /Volsnap/, [36]);
      if (n < 1) return null;
      return F('stab-vss', 'Stability', 'low', 'System Restore storage limit is too small',
        'Shadow copies were aborted because the storage reserved for restore points hit its limit.',
        [S('Check the current limit.', 'vssadmin list shadowstorage'),
         S('Raise it (example: 10 percent of C:), as Administrator.', 'vssadmin resize shadowstorage /for=C: /on=C: /maxsize=10%')],
        evSample('system', /Volsnap/, [36]));
    });
    R(function () {
      var n = evCount('system', /WindowsUpdateClient/, null, 'Error');
      if (n < 1) return null;
      return F('stab-wu', 'Updates', 'low', 'Windows Update reported failed installs (' + n + ')',
        'One or more updates (often drivers or vendor extensions) failed to install.',
        [S('Open Settings, Windows Update, Update history and look at the failed items.'),
         S('Failed vendor extensions are usually harmless. Failed cumulative updates are not: repair the image (see DISM above) and retry.')],
        evSample('system', /WindowsUpdateClient/));
    });
    R(function () {
      if (g(D, 'security.pendingReboot', false) !== true) return null;
      return F('stab-pending', 'Updates', 'low', 'A restart is pending',
        'Windows has installed something that needs a restart to finish.', [S('Restart Windows (Start, Power, Restart).')], '');
    });
    R(function () {
      var h = num(g(D, 'system.os.uptimeHours', 0));
      if (h < 24 * 14) return null;
      return F('stab-uptime', 'Updates', 'low', 'No full restart for ' + Math.round(h / 24) + ' days',
        'With Fast Startup, "Shut down" does not restart Windows, so the counter keeps running and updates or drivers can stay half-applied.',
        [S('Use Start, Power, Restart (not Shut down) once to start fresh.')], '');
    });

    /* --- storage --- */
    R(function () {
      var bad = disks.filter(function (d) { return d.health && !/healthy/i.test(d.health); });
      if (!bad.length) return null;
      return F('sto-health', 'Storage', 'high', 'A drive reports a health problem',
        'Windows reports that a drive is not healthy. This is the most serious storage warning.',
        [S('Back up your data now, before anything else.'), S('Run the manufacturer\'s drive tool (Samsung Magician, Kingston SSD Manager, WD Dashboard) and check the drive.')],
        bad.map(function (d) { return d.name + ': ' + d.health + ' / ' + d.status; }).join('; '));
    });
    R(function () {
      var bits = []; var sev = 'low';
      disks.forEach(function (d) {
        var r = d.reliability; if (!r) return;
        if (num(r.wearPercent) >= 80) { bits.push(d.name + ': wear ' + r.wearPercent + '%'); sev = 'high'; }
        else if (num(r.wearPercent) >= 60) { bits.push(d.name + ': wear ' + r.wearPercent + '%'); if (sev !== 'high') sev = 'medium'; }
        if (num(r.temperatureC) >= 70) { bits.push(d.name + ': ' + r.temperatureC + ' C'); if (sev === 'low') sev = 'medium'; }
        if (num(r.readErrors) > 0 || num(r.writeErrors) > 0) { bits.push(d.name + ': ' + num(r.readErrors) + ' read / ' + num(r.writeErrors) + ' write errors'); if (sev === 'low') sev = 'medium'; }
      });
      if (!bits.length) return null;
      return F('sto-smart', 'Storage', sev, 'SSD/HDD wear, heat or error counters need a look',
        'The drives report high wear, high temperature or error counts in their SMART data.',
        [S('Back up important data.'), S('Improve airflow around M.2/SATA drives if temperatures are high.'), S('Plan a replacement if wear is above 80 percent.')], bits.join('; '));
    });
    R(function () {
      var bits = []; var sev = null;
      vols.forEach(function (v) {
        var size = num(v.sizeGB), free = num(v.freeGB);
        if (!size) return;
        var pct = free / size;
        var isC = /^C:/i.test(v.letter);
        var s = null;
        if (free < 15 || (pct < 0.10 && free < 100)) s = isC ? 'high' : 'medium';
        else if (pct < 0.2 && free < 60 && isC) s = 'medium';
        else if (pct < 0.05) s = 'low';
        if (s) {
          bits.push(v.letter + ' ' + fmtGB(free) + ' free of ' + fmtGB(size) + ' (' + Math.round(pct * 100) + '%)');
          if (!sev || SEV_ORDER[s] < SEV_ORDER[sev]) sev = s;
        }
      });
      if (!bits.length) return null;
      return F('sto-space', 'Storage', sev, 'Low free disk space', 'Windows and SSDs need free space to run well. Below about 10 to 15 percent, updates fail and performance drops.',
        [S('Find what takes the space with WinDirStat or TreeSize.'), S('Open Settings, System, Storage and run the cleanup recommendations.'), S('Move games, videos and photos to another drive.')], bits.join('; '));
    });
    R(function () {
      var hasSSD = disks.some(function (d) { return /ssd|nvme/i.test(d.mediaType + ' ' + d.busType); });
      if (g(D, 'settings.trim', null) !== false || !hasSSD) return null;
      return F('sto-trim', 'Storage', 'medium', 'TRIM is turned off for SSDs',
        'Without TRIM an SSD slows down over time.', [S('Enable TRIM (as Administrator).', 'fsutil behavior set DisableDeleteNotify 0')], '');
    });
    R(function () {
      if (!disks.length) return null;
      var anyFast = disks.some(function (d) { return /ssd|nvme|scm/i.test(d.mediaType + ' ' + d.busType); });
      var anyHdd = disks.some(function (d) { return /hdd/i.test(d.mediaType); });
      if (anyFast || !anyHdd) return null;
      return F('sto-hdd', 'Storage', 'high', 'Only hard drives were found',
        'Windows 11 on a spinning hard drive is very slow. An SSD is the biggest single speed upgrade for such a PC.',
        [S('Replace or add an SSD (SATA SSDs are cheap) and move Windows to it.')], disks.map(function (d) { return d.name + ' (' + d.mediaType + ')'; }).join('; '));
    });
    R(function () {
      var u = num(g(D, 'settings.tempMB.user', 0)) + num(g(D, 'settings.tempMB.windows', 0));
      if (u < 3000) return null;
      return F('sto-temp', 'Storage', 'low', 'Temporary files use ' + fmtGB(u / 1024),
        'Old temporary files pile up and are safe to delete.', [S('Open Settings, System, Storage, Temporary files and remove them.')], '');
    });

    /* --- security --- */
    R(function () {
      var av = arr(g(D, 'security.antivirus', []));
      var def = g(D, 'security.defender', null);
      var third = av.filter(function (a) { return !/windows defender|microsoft defender/i.test(a.name || ''); });
      var active = av.filter(function (a) { return a.enabled; });
      var defOn = def && def.realTime;
      if (!active.length && !defOn && (av.length || def)) {
        return F('sec-av', 'Security', 'high', 'No active antivirus protection',
          'No antivirus product reports real-time protection as on.',
          [S('Open Windows Security, Virus and threat protection, and turn real-time protection on.'), S('If you use another antivirus, open it and check why it is off or expired.')],
          av.map(function (a) { return a.name + (a.enabled ? ' (on)' : ' (off)'); }).join(', '));
      }
      var activeThird = third.filter(function (a) { return a.enabled; });
      if (activeThird.length >= 2) {
        return F('sec-av2', 'Security', 'medium', 'Two antivirus products are active',
          'Running two real-time antivirus products slows the PC and they can fight each other.',
          [S('Keep one and uninstall the other with its vendor removal tool.')], activeThird.map(function (a) { return a.name; }).join(', '));
      }
      var old = active.filter(function (a) { return a.upToDate === false; });
      if (old.length) {
        return F('sec-avold', 'Security', 'medium', 'Antivirus definitions are out of date', 'The active antivirus reports old definitions.',
          [S('Open the antivirus and run its update.')], old.map(function (a) { return a.name; }).join(', '));
      }
      return null;
    });
    R(function () {
      var fw = g(D, 'security.firewall', null); if (!fw) return null;
      var off = ['domain', 'private', 'public'].filter(function (k) { return fw[k] === false; });
      if (!off.length) return null;
      return F('sec-fw', 'Security', 'high', 'Windows Firewall is off (' + off.join(', ') + ')', 'The firewall blocks unwanted connections.',
        [S('Turn it back on (as Administrator).', 'netsh advfirewall set allprofiles state on')], '');
    });
    R(function () {
      if (g(D, 'security.uac', null) !== false) return null;
      return F('sec-uac', 'Security', 'high', 'User Account Control (UAC) is off', 'UAC asks before programs change the system.',
        [S('Turn it on in Control Panel, User Accounts, Change User Account Control settings.')], '');
    });
    R(function () {
      if (g(D, 'security.secureBoot', null) !== false) return null;
      return F('sec-sb', 'Security', 'medium', 'Secure Boot is off', 'Secure Boot protects the start of Windows from boot-level malware, and Windows 11 expects it.',
        [S('Enable it in the BIOS/UEFI (Boot or Security section). The disk must use GPT.')], '');
    });
    R(function () {
      var t = g(D, 'security.tpm', null); if (!t) return null;
      if (!t.present) return F('sec-tpm', 'Security', 'medium', 'No TPM found', 'Windows 11, BitLocker and Windows Hello use the TPM.', [S('Enable fTPM / PTT in the BIOS.')], '');
      if (!t.ready) return F('sec-tpm2', 'Security', 'low', 'TPM is present but not ready', 'The TPM is not initialised.', [S('Open tpm.msc and check the status.', 'tpm.msc')], '');
      return null;
    });
    R(function () {
      var f = arr(g(D, 'security.optionalFeatures', [])).filter(function (x) { return /SMB1|Telnet|TFTP/i.test(x); });
      if (!f.length) return null;
      return F('sec-legacy', 'Security', 'high', 'Obsolete Windows features are enabled: ' + f.join(', '), 'SMB1 and Telnet are old, insecure protocols.',
        [S('Disable SMB1 (as Administrator).', 'Disable-WindowsOptionalFeature -Online -FeatureName SMB1Protocol -NoRestart')], f.join(', '));
    });
    R(function () {
      if (g(D, 'security.rdpEnabled', null) !== true) return null;
      return F('sec-rdp', 'Security', 'medium', 'Remote Desktop is enabled', 'If this PC is reachable from the internet, Remote Desktop is a common attack target.',
        [S('If you do not use it, turn it off in Settings, System, Remote Desktop.'), S('If you need it, keep Network Level Authentication on and use a strong password.')], '');
    });
    R(function () {
      var r = appsMatching(RE.remoteTools);
      if (!r.length) return null;
      return F('sec-remote', 'Security', r.length >= 3 ? 'medium' : 'low', r.length + ' remote-access tool' + (r.length > 1 ? 's' : '') + ' installed',
        'Remote-access tools are convenient and also popular with attackers and scammers. Each one that runs as a service gives a way into this PC.',
        [S('Uninstall the ones you do not use.'), S('For the ones you keep, set a strong unattended-access password and keep them updated.')], r.join(', '));
    });
    R(function () {
      var v = appsMatching(RE.vpn);
      if (v.length < 3) return null;
      return F('soft-vpn', 'Software', 'low', v.length + ' VPN clients are installed',
        'Each VPN adds virtual network adapters, drivers and background services. They can conflict.', [S('Keep one or two and uninstall the rest.')], v.join(', '));
    });
    R(function () {
      var n = g(D, 'security.localAdmins', null);
      if (n == null || n <= 2) return null;
      return F('sec-admins', 'Security', 'low', n + ' accounts are local administrators', 'Fewer admin accounts mean less risk.',
        [S('Review them.', 'Get-LocalGroupMember -SID S-1-5-32-544'), S('Use a standard account for daily work.')], arr(g(D, 'extras.securityMore.adminNames', [])).join(', '));
    });
    R(function () {
      if (g(D, 'security.memoryIntegrity', null) !== false) return null;
      return F('sec-mi', 'Security', 'info', 'Memory integrity (core isolation) is off', 'It blocks vulnerable drivers. It stays off if an installed driver is not compatible.',
        [S('Open Windows Security, Device security, Core isolation and try to turn it on.')], '');
    });
    R(function () {
      var v = arr(D.volumes).filter(function (x) { return x.bitlocker && /on|1/i.test(String(x.bitlocker.protection)); });
      if (!v.length) return null;
      return F('sec-bl', 'Security', 'info', 'BitLocker is on (' + v.map(function (x) { return x.letter; }).join(', ') + '): keep your recovery key safe',
        'If the TPM or BIOS changes, Windows asks for the recovery key. Without it, the data is gone.',
        [S('Check where your key is saved: account.microsoft.com/devices/recoverykey, a printout, or a USB stick.'), S('List the key protectors of C: (as Administrator).', 'manage-bde -protectors -get C:')], '');
    });

    /* --- updates --- */
    R(function () {
      var d = g(D, 'updates.lastPatchDaysAgo', null);
      if (d == null || d < 60) return null;
      return F('upd-patch', 'Updates', d > 120 ? 'high' : 'medium', 'Windows has not installed an update for ' + d + ' days',
        'Security updates come out monthly. Long gaps usually mean updating is blocked or paused.',
        [S('Open Settings, Windows Update and check for updates.'), S('If it fails, repair the image: DISM /Online /Cleanup-Image /RestoreHealth')], '');
    });
    R(function () {
      if (!outdated.length) return null;
      var sec = outdated.filter(function (o) { return RE.secApp.test(o.name); });
      var remote = outdated.filter(function (o) { return RE.remoteTools.test(o.name); });
      var sev = remote.length ? 'high' : ((outdated.length >= 25 || sec.length >= 4) ? 'medium' : 'low');
      var steps = [];
      (remote.concat(sec.filter(function (x) { return remote.indexOf(x) < 0; }))).slice(0, 5).forEach(function (o) {
        steps.push(S('Update ' + o.name + ' (' + o.version + ' to ' + o.available + ').', 'winget upgrade --id ' + o.id + (o.source === 'msstore' ? ' --source msstore' : '')));
      });
      steps.push(S('To update everything (read the list first, some updates change behaviour).', 'winget upgrade --all'));
      return F('upd-apps', 'Updates', sev, outdated.length + ' installed apps have updates (' + sec.length + ' security-relevant)',
        'Old versions of browsers, remote tools, archivers and runtimes are where most real-world attacks start.',
        steps, outdated.slice(0, 12).map(function (o) { return o.name + ' ' + o.version + ' -> ' + o.available; }).join('; '));
    });
    R(function () {
      var b = outdated.filter(function (o) { return /bios/i.test(o.name + ' ' + o.id); })[0];
      var age = ageDays(g(D, 'system.bios.date', null));
      if (b) return F('upd-bios', 'Updates', 'low', 'A newer BIOS is available for this motherboard (' + b.version + ' to ' + b.available + ')',
        'BIOS updates add CPU microcode fixes, stability and security patches. They are also the one update that can brick a board if the power fails.',
        [S('Read the release notes on the board maker\'s website first.'), S('Flash only on stable power (laptop: plugged in) and with nothing else running. If everything works fine, waiting is okay.')], 'Installed BIOS date: ' + fmtDate(g(D, 'system.bios.date', null)));
      if (age != null && age > 730) return F('upd-bios', 'Updates', 'info', 'The BIOS is ' + Math.round(age / 365) + ' years old',
        'Check whether the maker released fixes.', [S('Look up your board model on the manufacturer\'s support page and read the release notes.')], 'Version ' + g(D, 'system.bios.version', '?') + ', ' + fmtDate(g(D, 'system.bios.date', null)));
      return null;
    });
    R(function () {
      var gp = arr(D.gpus)[0]; if (!gp) return null;
      var age = ageDays(gp.driverDate);
      if (age == null || age < 365) return null;
      return F('upd-gpu', 'Updates', 'low', 'Graphics driver is ' + Math.round(age / 30) + ' months old', 'New games and Windows builds often need a newer driver.',
        [S('Update from the NVIDIA App, AMD Software or Intel Driver and Support Assistant.')], gp.name + ' driver ' + (gp.driverFriendly || gp.driverVersion) + ' (' + fmtDate(gp.driverDate) + ')');
    });
    R(function () {
      var p = arr(g(D, 'drivers.problemDevices', []));
      var errs = p.filter(function (x) { return !x.disabled && /error|unknown/i.test(x.status); });
      var deg = p.filter(function (x) { return !x.disabled && /degraded/i.test(x.status); });
      if (!errs.length && !deg.length) return null;
      var pool = errs.length ? errs : deg;
      var count = {}; pool.forEach(function (x) { count[x.name] = (count[x.name] || 0) + 1; });
      var ev = Object.keys(count).map(function (k) { return k + (count[k] > 1 ? ' x' + count[k] : '') + ' (' + pool.filter(function (x) { return x.name === k; })[0].status + ')'; }).join('; ');
      return F('upd-devices', 'Updates', errs.length ? 'medium' : 'low', pool.length + ' device entr' + (pool.length > 1 ? 'ies report' : 'y reports') + ' a problem',
        'Device Manager shows devices with errors or a degraded state. Often a missing or incompatible driver, or leftover entries from removed software.',
        [S('Open Device Manager and look for yellow marks.', 'devmgmt.msc'), S('Update the driver from the manufacturer, or uninstall the entry if the hardware is gone.')], ev);
    });

    /* --- performance --- */
    R(function () {
      var h = arr(g(D, 'boot.history', [])).slice(0, 5);
      if (!h.length) return null;
      var avg = sum(h, function (x) { return x.seconds; }) / h.length;
      if (avg < 60) return null;
      var slow = arr(g(D, 'boot.slowStarters', [])).slice(0, 8).map(function (s) { return s.name + ' x' + s.times; });
      return F('perf-boot', 'Performance', avg >= 90 ? 'medium' : 'low', 'Windows takes about ' + Math.round(avg) + ' seconds to start',
        'Windows measures every boot. On an SSD PC under 40 seconds is typical. Slow boots are mostly caused by programs that start with Windows.',
        [S('Disable startup programs you do not need (see the next finding and the Software tab).'), S('Programs that slowed recent boots are listed below as evidence.')],
        (slow.length ? 'Slowed boots: ' + slow.join(', ') : 'Last boots (s): ' + h.map(function (x) { return x.seconds; }).join(', ')));
    });
    R(function () {
      var items = uniq(arr(g(D, 'startup.items', [])).map(function (s) { return s.name; }));
      var n = items.length;
      if (n < 15) return null;
      var heavy = items.filter(function (x) { return RE.launcher.test(x); });
      return F('perf-startup', 'Performance', n >= 25 ? 'medium' : 'low', n + ' programs start with Windows',
        'Each one uses memory, CPU and disk during startup, and most keep running in the background.',
        [S('Open Task Manager, Startup apps (Ctrl+Shift+Esc) and disable what you do not need at login: game launchers, updaters and chat apps are the usual suspects.', 'taskmgr.exe /0 /startup'),
         S('Programs still work. They simply do not start before you open them.')],
        'Candidates: ' + words(heavy.length ? heavy : items, 14));
    });
    R(function () {
      var t = num(g(D, 'system.ram.totalGB', 0)); if (!t) return null;
      if (t < 6) return F('perf-ram', 'Performance', 'high', 'Very little memory (' + fmtGB(t) + ')', 'Windows 11 and modern browsers need much more.', [S('Add RAM. Aim for 16 GB.')], '');
      if (t < 12) return F('perf-ram', 'Performance', 'medium', 'Limited memory (' + fmtGB(t) + ')', 'With 8 GB, browser tabs and apps push Windows to the disk.', [S('Consider 16 GB if the PC feels slow.')], '');
      var free = num(g(D, 'system.ram.freeGB', 0));
      if (free / t < 0.08) return F('perf-ramfull', 'Performance', 'low', 'Memory was almost full during the scan', 'Only ' + fmtGB(free) + ' of ' + fmtGB(t) + ' were free.', [S('Check the biggest memory users in the Software tab.')], '');
      return null;
    });
    R(function () {
      var mods = arr(g(D, 'system.ram.modules', []));
      var slow = mods.filter(function (m) { return num(m.speedMHz) - num(m.configuredMHz) >= 200 && num(m.configuredMHz) > 0; });
      if (slow.length) return F('perf-xmp', 'Performance', 'low', 'RAM runs slower than its rating (' + slow[0].configuredMHz + ' of ' + slow[0].speedMHz + ' MT/s)',
        'The modules support a higher speed, but XMP/EXPO/DOCP is not turned on in the BIOS.', [S('Enter the BIOS and enable the XMP (Intel) or EXPO/DOCP (AMD) profile.')], '');
      var slots = num(g(D, 'system.ram.slots', 0));
      if (mods.length === 1 && slots >= 2) return F('perf-dual', 'Performance', 'low', 'Memory runs in single channel',
        'Only one RAM module is installed. A second matching module doubles memory bandwidth, which helps games and integrated graphics.',
        [S('Add a matching second module in the correct slots (see the board manual).')], '');
      return null;
    });
    R(function () {
      if (g(D, 'settings.fastStartup', null) !== true) return null;
      var bl = arr(D.volumes).some(function (x) { return x.bitlocker && /on|1/i.test(String(x.bitlocker.protection)); });
      return F('perf-fast', 'Performance', 'low', 'Fast Startup is on', 'Shutting down does not fully restart Windows, so drivers and updates can stay half-applied, shutdowns can lag' + (bl ? ', and it can trigger BitLocker key errors at boot' : '') + '.',
        [S('Control Panel, Power Options, Choose what the power buttons do, untick Turn on fast startup. Or use this command (as Administrator).', 'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power" /v HiberbootEnabled /t REG_DWORD /d 0 /f')],
        bl ? 'BitLocker volumes found, and event 24641 may appear in your System log.' : '');
    });
    R(function () {
      var pk = g(D, 'settings.powerPlanKind', ''); if (!(pk === 'saver' || (!pk && /saver/i.test(g(D, 'settings.powerPlan', '')))) || g(D, 'settings.hasBattery', false)) return null;
      return F('perf-power', 'Performance', 'low', 'Power plan is Power saver on a desktop PC', 'Power saver limits CPU speed.', [S('Switch to Balanced or High performance.', 'powercfg /setactive SCHEME_BALANCED')], '');
    });
    R(function () {
      var n = arr(g(D, 'startup.thirdPartyServices', [])).length;
      if (n < 25) return null;
      return F('perf-services', 'Performance', 'low', n + ' third-party services start automatically', 'Services from vendor tools and updaters run all the time.',
        [S('Uninstall tools you no longer use. Do not disable Windows services.')], words(arr(D.startup.thirdPartyServices).map(function (s) { return s.display || s.name; }), 10));
    });
    R(function () {
      if (g(D, 'security.hypervisorPresent', false) !== true || crashEmitted) return null;
      var e = appsMatching(RE.emulator);
      if (!e.length) return null;
      return F('soft-emu', 'Software', 'low', 'An Android emulator is installed next to Hyper-V', 'Emulators often misbehave while Hyper-V or Memory integrity is active.',
        [S('Use the emulator\'s Hyper-V compatible mode, or uninstall it if unused.')], e.join(', '));
    });
    R(function () {
      if (!appsMatching(/extreme tuning utility/i).length || num(g(D, 'security.vbsStatus', 0)) !== 2) return null;
      return F('soft-xtu', 'Software', 'low', 'Intel XTU cannot work while virtualization security is on', 'XTU needs virtualization-based security off, so its components show as degraded.',
        [S('Uninstall Intel XTU if you do not overclock. (Settings, Apps, Installed apps)')], '');
    });
    R(function () {
      var o = appsMatching(RE.optimizer);
      if (!o.length) return null;
      return F('soft-opt', 'Software', 'low', 'PC optimizer or cleaner tools installed', 'Registry cleaners and driver updaters rarely help and sometimes break things.',
        [S('Uninstall them unless you know why you need them.')], o.join(', '));
    });

    R(function () {
      var build = num(g(D, 'system.os.build', 0));
      if (!build || build >= 22000) return null;
      var r = readiness();
      var can = r.level === 'pass' || r.level === 'warn';
      var steps = [S('Open the Software tab or the Hardware tab and look at "Windows 11 readiness".')];
      if (can) steps.push(S('This PC looks able to run Windows 11. Open Settings, Update, and look for the upgrade offer, or use Microsoft\'s PC Health Check and the Windows 11 Installation Assistant. Back up first.'));
      else steps.push(S('This PC does not meet every Windows 11 requirement (see the readiness list). Options: fix the settings that can be fixed (TPM, Secure Boot), enrol in Microsoft\'s Extended Security Updates programme if you are eligible, or plan a replacement.'));
      steps.push(S('Until then: keep the browser and antivirus updated and avoid risky downloads.'));
      return F('win-eol', 'Updates', 'high', 'Windows 10 is no longer supported by Microsoft',
        'Regular support for Windows 10 ended on 14 October 2025. Without security updates, new vulnerabilities stay open. Extended Security Updates exist for eligible PCs, with their own terms.',
        steps, 'Windows build ' + build + '. Windows 11 readiness: ' + r.verdict + '.');
    });
    R(function () {
      var b = g(D, 'battery', null);
      if (!b || b.wearPercent == null) return null;
      var w = num(b.wearPercent);
      if (w < 25) return null;
      return F('bat-wear', 'Performance', w >= 40 ? 'medium' : 'low', 'The battery has lost ' + w + '% of its capacity',
        'Batteries wear out with charge cycles and heat. At this level you get noticeably less time away from the charger.',
        [S('Avoid keeping the laptop at 100 percent plugged in for months. If your maker has a battery-care mode (80 percent limit), turn it on.'), S('If the run time is too short for you, a replacement battery from the maker is the real fix.')],
        'Design capacity ' + fmtNum(num(b.designMWh) / 1000, 1) + ' Wh, full-charge capacity ' + fmtNum(num(b.fullChargeMWh) / 1000, 1) + ' Wh' + (b.cycleCount ? ', ' + b.cycleCount + ' cycles' : '') + '.');
    });
    R(function () {
      if (g(D, 'meta.mode', 'full') !== 'quick') return null;
      return F('scan-quick', 'Software', 'info', 'This was a quick scan: some checks were skipped',
        'The quick scan leaves out the slow checks: the Windows image check (DISM), app update list (winget), full msinfo32 export, optional features, old drivers and temp-folder sizes.',
        [S('Run VEAGLE-PC-Check.bat (the full scan) when you have 3 to 8 minutes.')], '');
    });

    /* ================= v0.3: reliability, security details, network, backups ================= */
    function ids2(id) { return out.some(function (f) { return f.id === id; }); }
    var EX = g(D, 'extras', null) || {};
    var ADMINHOW = 'Press the Windows key, type PowerShell, right-click "Windows PowerShell" and choose "Run as administrator". Click Yes.';
    var SEC = EX.securityMore || {}, NT = EX.networkTest || {}, BK = EX.backup || {}, REL = EX.reliability || {};

    R(function () {
      var codes = arr(REL.bugchecks).filter(function (b) { return b.code; });
      if (!codes.length) codes = arr(EX.dumps).filter(function (b) { return b.code; });
      if (!codes.length) return null;
      var seen = {}, lines = [];
      codes.forEach(function (b) {
        var k = bugKey(b.code); if (seen[k]) { seen[k].n++; return; }
        seen[k] = { n: 1 }; lines.push({ k: k, code: b.code });
      });
      var plain = lines.map(function (l) { var d = BUGCODES[l.k]; return l.code + (seen[l.k].n > 1 ? ' (x' + seen[l.k].n + ')' : '') + ': ' + (d ? d[0] + '. ' + d[1] : 'Windows did not record a name for this code, search the code on the internet.'); });
      return F('stab-bsod-codes', 'Stability', 'info', 'What your blue screens meant',
        'Every blue screen has a code. The code is a clue to what went wrong. Here is what yours say in plain words.',
        [S('Read the list under "Evidence" below. The part after the code is the likely cause.'),
         S('Start with the first fix of the matching finding above (drivers first, then memory test).'),
         S('If the same code keeps coming back, copy it into the AI help tab and ask.')],
        plain.join('\n'));
    });
    R(function () {
      var idx = REL.stabilityIndex; if (idx == null) return null;
      if (idx >= 5) return null;
      return F('stab-index', 'Stability', idx < 3 ? 'medium' : 'low', 'Windows gives its own reliability a low mark (' + idx + ' out of 10)',
        'Windows keeps a score of how stable it has been over the last week. 10 means no problems, 1 means a lot of crashes and errors. Yours is low.',
        [S('Open Reliability Monitor. It shows a calendar with a red X on each day something failed.', 'perfmon /rel'),
         S('Click a red day and read what failed. Often it is one program or one driver.'),
         S('Fix the matching finding from this report, then check again in a week.')],
        'Average this week ' + idx + ', latest ' + (REL.stabilityLatest != null ? REL.stabilityLatest : '?') + ' (10 is best).');
    });

    R(function () {
      var d = SEC.defender; if (!d || !d.realTimeOn && g(D, 'security.defender.realTime', false) !== true) return null;
      if (d.signatureAgeDays == null || d.signatureAgeDays >= 9999 || d.signatureAgeDays < 7) return null;
      var onlyWD = arr(g(D, 'security.antivirus', [])).filter(function (a) { return a.enabled && !/windows defender|microsoft defender/i.test(a.name || ''); }).length === 0;
      if (!onlyWD) return null;
      return F('sec-def-sigs', 'Security', d.signatureAgeDays >= 14 ? 'high' : 'medium', 'Your antivirus does not know the newest viruses (' + d.signatureAgeDays + ' days old)',
        'An antivirus compares files against a list of known viruses. The list is updated almost every day. Yours is ' + d.signatureAgeDays + ' days old, so new viruses can slip through.',
        [S('Open Start, type "Windows Security" and open it.'), S('Click "Virus & threat protection". Under "Protection updates" click "Check for updates", then "Check for updates" again.'),
         S('If it fails, run Windows Update (Settings, Windows Update, Check for updates) and restart.')],
        'Definitions are ' + d.signatureAgeDays + ' days old.');
    });
    R(function () {
      var d = SEC.defender; if (!d || d.threats30d == null || d.threats30d < 1) return null;
      return F('sec-def-threats', 'Security', 'high', 'Windows Security found ' + d.threats30d + ' threat' + (d.threats30d > 1 ? 's' : '') + ' in the last 30 days',
        'The built-in antivirus caught something dangerous. Most of the time it already removed or blocked it. Still, you should look at what it was and make sure it is really gone.',
        [S('Open Start, type "Windows Security" and open it. Click "Virus & threat protection", then "Protection history".'),
         S('Read each entry. If it says "Removed" or "Quarantined", it is handled. If it says "Action needed", click it and choose Remove.'),
         S('Run a full scan: in "Virus & threat protection" click "Scan options", choose "Full scan", click "Scan now". It can take an hour. You can keep working.'),
         S('If threats keep coming back, change your important passwords from a different, clean device.')],
        'Last detection: ' + (d.lastThreat ? fmtDT(d.lastThreat) : 'unknown'));
    });
    R(function () {
      var d = SEC.defender; if (!d || d.tamperProtected !== false || g(D, 'security.defender.realTime', false) !== true) return null;
      return F('sec-def-tamper', 'Security', 'low', 'Tamper protection is off',
        'Tamper protection stops viruses from switching your antivirus off. It should be on.',
        [S('Open Windows Security, "Virus & threat protection", then "Manage settings".'), S('Scroll down and turn "Tamper Protection" on.')], '');
    });
    R(function () {
      var d = SEC.defender; if (!d || g(D, 'security.defender.realTime', false) !== true) return null;
      var q = d.quickScanAgeDays, f = d.fullScanAgeDays;
      if (q == null && f == null) return null;
      var age = Math.min(q == null ? 9999 : q, f == null ? 9999 : f);
      if (age < 30) return null;
      return F('sec-def-scan', 'Security', 'low', 'No antivirus scan for ' + (age === 9999 ? 'a long time' : age + ' days'),
        'Windows Security normally scans by itself when the PC is idle. Long gaps usually mean the PC is always busy or switched off at night.',
        [S('Open Windows Security, "Virus & threat protection", click "Quick scan".'), S('Leave the PC switched on and plugged in some night so it can scan.')], '');
    });
    R(function () {
      if (g(D, 'security.rdpEnabled', null) !== true || SEC.nlaRequired !== false) return null;
      return F('sec-rdp-nla', 'Security', 'high', 'Remote Desktop is on and does not ask for a login first',
        'Remote Desktop lets other people use this PC over the network. "Network Level Authentication" makes them prove who they are before they even see the login screen. It is off here, which is the setting attackers hope for.',
        [S('Best: switch Remote Desktop off if you do not use it. Settings, System, Remote Desktop, switch it off.'),
         S('If you need it: in the same page click "Remote Desktop" arrow, and turn on "Require devices to use Network Level Authentication".')], '');
    });
    R(function () {
      if (SEC.autoLogon !== true) return null;
      return F('sec-autologon', 'Security', 'medium', 'Windows logs in by itself without a password',
        'Anyone who switches this PC on gets straight into your files and saved passwords. On a laptop that is stolen, that is very bad.',
        [S('Press Windows key + R, type netplwiz and press Enter.', 'netplwiz'),
         S('Tick "Users must enter a user name and password to use this computer", click OK and type your password if asked.')], '');
    });
    R(function () {
      if (SEC.uacPromptLevel !== 0 || g(D, 'security.uac', null) === false) return null;
      return F('sec-uac-level', 'Security', 'high', 'Windows never asks before programs change the system',
        'User Account Control is the box that asks "Do you want to allow this app to make changes?". It is set to "never ask", so a virus can change the system silently.',
        [S('Press the Windows key, type "Change User Account Control settings" and open it.'), S('Move the slider up to the second position from the top (the default) and click OK.')], '');
    });
    R(function () {
      if (SEC.smb1Enabled !== true || ids2('sec-legacy')) return null;
      return F('sec-smb1', 'Security', 'high', 'An old and unsafe file-sharing protocol (SMBv1) is on',
        'SMBv1 is about 30 years old and was used by famous viruses like WannaCry. Nothing modern needs it.',
        [S('Open PowerShell as administrator. ' + ADMINHOW), S('Paste this and press Enter.', 'Set-SmbServerConfiguration -EnableSMB1Protocol $false -Force'), S('Restart the PC.')], '');
    });
    R(function () {
      var s = arr(SEC.shares); if (!s.length) return null;
      return F('sec-shares', 'Security', 'low', s.length + ' folder' + (s.length > 1 ? 's are' : ' is') + ' shared on your network',
        'These folders can be opened by other computers on your network. That is fine at home if you did it on purpose. At work or on public Wi-Fi it can leak files.',
        [S('See the list under "Evidence". Do you recognise every folder and do you need it?'),
         S('To stop sharing, open File Explorer, right-click the folder, choose Properties, then the Sharing tab, then "Advanced Sharing" and untick "Share this folder".')],
        s.map(function (x) { return x.name + ' -> ' + x.path; }).join('\n'));
    });
    R(function () {
      var risky = { 21: 'FTP (old file transfer)', 23: 'Telnet (old remote login, no encryption)', 3389: 'Remote Desktop', 5900: 'VNC remote screen', 5985: 'Windows remote management', 1433: 'SQL Server database', 3306: 'MySQL database', 5432: 'PostgreSQL database', 27017: 'MongoDB database', 6379: 'Redis database' };
      var hits = arr(SEC.listening).filter(function (p) { return p.allInterfaces && risky[p.port]; });
      if (!hits.length) return null;
      return F('sec-ports', 'Security', 'medium', hits.length + ' risky network door' + (hits.length > 1 ? 's are' : ' is') + ' open',
        'A program on this PC is waiting for connections from the network on a "port" (think of a door). These doors are common targets for attackers. If you set them up on purpose, fine. If not, close them.',
        [S('Look at the list under "Evidence". For each line decide: do I use this?'),
         S('If not, uninstall the program named in the line (Settings, Apps, Installed apps).'),
         S('Make sure the Windows Firewall is on (see the Firewall check) so the internet cannot reach these doors.')],
        hits.map(function (p) { return 'port ' + p.port + ' - ' + risky[p.port] + ' - program: ' + (p.process || 'unknown'); }).join('\n'));
    });
    R(function () {
      var a = SEC.activation; if (a == null || a === 1) return null;
      return F('sec-activation', 'Security', 'medium', 'Windows is not properly activated',
        'An activated Windows gets all updates and has no watermark. Yours says it is not fully activated (status ' + a + ').',
        [S('Open Settings, System, Activation and read what it says.'), S('If you have a licence key, click "Change product key". If the PC came with Windows, sign in with the Microsoft account you used before and click "Troubleshoot".')], 'Licence status code ' + a + ' (1 means activated).');
    });
    R(function () {
      var u = arr(SEC.unsignedDrivers); if (!u.length) return null;
      return F('sec-unsigned', 'Security', 'medium', u.length + ' driver' + (u.length > 1 ? 's' : '') + ' without a digital signature',
        'A driver is a small program that runs with full power over the hardware. A signature proves it came from a real company and was not changed. Unsigned drivers are a risk and can cause blue screens.',
        [S('See the names under "Evidence".'), S('Go to the website of the maker, download the newest driver from there and install it over the old one.'), S('If you do not recognise the device, ask an AI in the AI help tab before you remove anything.')],
        u.map(function (x) { return x.device + (x.provider ? ' (' + x.provider + ')' : ''); }).join('\n'));
    });

    R(function () {
      var bad = [];
      arr(D.network && D.network.adapters).forEach(function (a) {
        if (a.virtual || !/^up$/i.test(a.status)) return;
        if (/wi-?fi|wireless|wlan|802\.11|bluetooth/i.test(a.name + ' ' + a.description)) return;
        var m = /([\d.]+)\s*(m|g)bps/i.exec(a.linkSpeed || ''); if (!m) return;
        var mb = parseFloat(m[1]) * (/g/i.test(m[2]) ? 1000 : 1);
        if (mb <= 100) bad.push(a.name + ' runs at ' + a.linkSpeed);
      });
      if (!bad.length) return null;
      return F('net-link', 'Network', 'low', 'Your network cable only runs at 100 Mbps',
        'Modern cables and routers run at 1000 Mbps (1 Gbps), ten times faster. A bad cable, a worn plug or an old switch drops the speed to 100.',
        [S('Unplug the cable at both ends and plug it back in firmly.'), S('Try a different network cable. A flat or thin old cable is often the cause (look for "Cat5e" or "Cat6" printed on it).'), S('Try another port on the router or switch.')],
        bad.join('; '));
    });
    R(function () {
      var p = NT.ping; if (!NT.gateway || !p) return null;
      if (p.lost >= p.sent) return F('net-gw', 'Network', 'high', 'This PC cannot reach your router',
        'Your PC sent 5 test messages to your router (the box that gives you internet) and got no answer. Either the network is down or something blocks it.',
        [S('Check the cable or the Wi-Fi connection.'), S('Restart the router: unplug it for 30 seconds, plug it back in, wait 2 minutes.'), S('Restart this PC.')], '5 of 5 test messages lost.');
      if (p.lost >= 2 || (p.avgMs != null && p.avgMs > 30)) return F('net-gw', 'Network', 'low', 'The connection to your router is slow or drops messages',
        'The test messages to your router took ' + (p.avgMs != null ? p.avgMs + ' ms' : 'long') + ' and ' + p.lost + ' of ' + p.sent + ' got lost. Good is under 5 ms on cable and under 20 ms on Wi-Fi.',
        [S('If you use Wi-Fi, move closer to the router or use a cable to test.'), S('Restart the router (unplug 30 seconds).'), S('Close downloads, streaming and cloud backups, then scan again.')],
        'Router reply time ' + p.avgMs + ' ms, lost ' + p.lost + ' of ' + p.sent + '.');
      return null;
    });
    R(function () {
      var d = NT.dns; if (!d) return null;
      if (d.ok === false) return F('net-dns', 'Network', 'medium', 'This PC could not look up a website name',
        'Before opening a site, the PC asks a "DNS server" for its address. That did not work now. It can mean you were offline during the scan, or the DNS setting is broken.',
        [S('Open a website in your browser. If it opens, ignore this (you were probably offline during the scan).'), S('If not: restart the router, then restart the PC.'),
         S('Still broken? Open PowerShell and run this, then try again.', 'ipconfig /flushdns')], '');
      if (d.ms != null && d.ms > 800) return F('net-dns', 'Network', 'low', 'Looking up website names is slow (' + d.ms + ' ms)',
        'Websites feel slow to start when the DNS server is slow. A fast one answers in under 100 ms.',
        [S('Open Settings, Network and internet, your connection, "DNS server assignment", Edit, choose Manual, turn on IPv4 and type 1.1.1.1 and 8.8.8.8.')], 'Lookup took ' + d.ms + ' ms.');
      return null;
    });
    R(function () {
      var t = NT.timeSync; if (!t || !t.local) return null;
      return F('net-time', 'Network', 'low', 'The PC clock is not synced with internet time',
        'Windows should check the time online. When it does not, the clock drifts, and then websites, email sign-in and security certificates start to fail.',
        [S('Open Settings, Time and language, Date and time, and click "Sync now".'), S('Make sure "Set time automatically" is turned on.')], 'Time source: ' + t.source);
    });
    R(function () {
      var w = NT.wifi; if (!w) return null;
      if (w.signalPct < 50) return F('net-wifi', 'Network', 'low', 'The Wi-Fi signal is weak (' + w.signalPct + '%)',
        'A weak signal means slow internet and dropped video calls.',
        [S('Move the PC or the router closer, with fewer walls in between.'), S('If your router has a 5 GHz network, connect to that one when you are close to it. It is faster.'), S('Switching the router to a higher location (a shelf) often helps more than anything else.')], 'Signal ' + w.signalPct + '%, ' + (w.band || 'band unknown') + ' ' + (w.radio || ''));
      if (/2\.4/.test(w.band || '')) return F('net-wifi', 'Network', 'info', 'You are on the slow 2.4 GHz Wi-Fi band',
        '2.4 GHz reaches far but is slow and crowded. 5 GHz is much faster at short distance.',
        [S('Open the Wi-Fi list (click the Wi-Fi icon near the clock) and connect to the network whose name ends with 5G, if you have one.')], 'Signal ' + w.signalPct + '%, ' + w.band);
      return null;
    });
    R(function () {
      if (NT.proxyEnabled !== true && NT.pacUrl !== true) return null;
      return F('net-proxy', 'Network', 'low', 'Your internet goes through a proxy',
        'A proxy is a middleman for all your web traffic. Companies use it on purpose. At home you normally have none, and some malware sets one up to watch or redirect your browsing.',
        [S('At work: ignore this, it is normal.'), S('At home: open Settings, Network and internet, Proxy. Turn off "Use a proxy server" and "Use setup script" unless you set them yourself.')], '');
    });
    R(function () {
      var h = arr(NT.hostsEntries); if (!h.length) return null;
      return F('net-hosts', 'Network', 'low', 'The "hosts" file has custom entries (' + h.length + ')',
        'The hosts file overrides website addresses on this PC. Developers and ad blockers use it on purpose. Malware also uses it to send you to fake websites.',
        [S('Read the lines under "Evidence". Do you recognise them?'), S('If a famous website (bank, Google, Microsoft) is in the list, that is suspicious: run a full antivirus scan and ask an AI in the AI help tab.')], h.join('\n'));
    });

    R(function () {
      var rp = BK.restorePoints || {}, apps = appNames.join(' | ');
      var cloud = BK.oneDriveFolders && (BK.oneDriveFolders.documents || BK.oneDriveFolders.desktop || BK.oneDriveFolders.pictures);
      var tool = /acronis|veeam|macrium|backblaze|idrive|duplicati|carbonite|cobian|freefilesync|easeus todo|syncthing|crashplan|aomei backupper|nas sync|synology drive|google drive|dropbox/i.test(apps);
      if (cloud || tool || BK.fileHistory === true) return null;
      if (BK.fileHistory == null && !BK.restorePoints) return null;
      return F('bak-none', 'Backup', 'medium', 'We could not find any backup of your files',
        'If this drive died today, could you get your photos and documents back? We found no File History, no OneDrive folder backup and no backup program. A backup on an external disk that we cannot see does not count here, so ignore this if you have one.',
        [S('Easiest: sign in to OneDrive and let it protect Desktop, Documents and Pictures. Click the OneDrive cloud icon near the clock, Settings, Sync and backup, "Manage backup".'),
         S('Or plug in an external disk: Settings, System, Storage, "Advanced storage settings", "Backup options", and follow the steps.'),
         S('Test it once: open a backed-up file from the backup, not from the PC.')], '');
    });
    R(function () {
      var rp = BK.restorePoints; if (!rp || !rp.readable) return null;
      if (rp.count > 0 && (rp.lastDaysAgo == null || rp.lastDaysAgo <= 90)) return null;
      return F('bak-restore', 'Backup', 'low', rp.count === 0 ? 'System Restore has no restore points' : 'The last restore point is ' + rp.lastDaysAgo + ' days old',
        'A restore point lets you go back to a time when Windows worked, after a bad update or driver. It is not a backup of your files, but it is a cheap safety net.',
        [S('Press the Windows key, type "Create a restore point" and open it.'), S('Select drive C:, click "Configure", choose "Turn on system protection", set about 5% and click OK.'), S('Click "Create", name it "Today" and click Create.')], '');
    });
    R(function () {
      if (BK.winRE !== false) return null;
      return F('bak-winre', 'Backup', 'medium', 'The Windows recovery environment is switched off',
        'This is the blue "Troubleshoot" menu that appears when Windows cannot start, and it is where Reset this PC and Startup Repair live. It is off, so when Windows breaks you might have no easy repair.',
        [S('Open PowerShell as administrator. ' + ADMINHOW), S('Paste this and press Enter.', 'reagentc /enable'), S('Check it with the next command. It should say Enabled.', 'reagentc /info')], '');
    });

    R(function () {
      var d = g(D, 'system.bios.date', null); if (!d) return null;
      var yrs = (Date.now() - new Date(d).getTime()) / 31557600000;
      if (!isFinite(yrs) || yrs < 4) return null;
      return F('drv-bios-age', 'Updates', yrs >= 6 ? 'low' : 'info', 'The BIOS is ' + Math.floor(yrs) + ' years old',
        'The BIOS is the first program that runs when the PC starts. Makers release new versions to fix bugs, security holes and support for new parts. Old ones are not always a problem, but it is worth a look.',
        [S('Find your exact model: press Windows key + R, type msinfo32 and read "System Model" and "BIOS Version".', 'msinfo32'),
         S('Go to the support page of the maker (Dell, HP, Lenovo, ASUS, MSI, Gigabyte) and search your model.'),
         S('Only update if the notes mention a fix that matters to you. Never switch the PC off during a BIOS update, and plug in a laptop first.')],
        'BIOS ' + g(D, 'system.bios.version', '') + ' dated ' + fmtDate(d));
    });

    /* ================= v0.4: disk space, unwanted software, gaming ================= */
    var STO = EX.storage || null, GAM = EX.gaming || {};
    function mbFmt(mb) { return mb >= 1024 ? fmtNum(mb / 1024, 1) + ' GB' : fmtNum(mb) + ' MB'; }
    function folderMB(name) { var f = arr(STO && STO.folders).filter(function (x) { return x.name === name; })[0]; return f ? num(f.mb) : 0; }
    R(function () {
      if (!STO || !arr(STO.folders).length) return null;
      var top = arr(STO.folders).filter(function (x) { return x.name !== 'Program Files' && x.name !== 'ProgramData'; }).slice(0, 6);
      var sys = arr(STO.systemFiles).map(function (x) { return x.name + ' ' + mbFmt(x.mb); });
      return F('sto-where', 'Storage', 'info', 'Where your disk space went',
        'This is a list of the biggest places on your drive, so you can see what is using space. Nothing here is wrong by itself. It helps you decide what to move or delete.',
        [S('Look at the list under "What we found". Folders such as Downloads, Videos and Desktop are yours: you decide what to keep.'),
         S('Do NOT delete anything from Windows or Program Files by hand. Use "Settings, System, Storage, Temporary files" for system leftovers.'),
         S('Move big things you rarely use (videos, old projects, installers) to an external disk or to OneDrive, then delete the copy on this PC.')],
        top.map(function (x) { return x.name + ': ' + mbFmt(x.mb) + (x.partial ? ' (at least)' : ''); }).join('\n') + (sys.length ? '\nSystem files: ' + sys.join(', ') : ''));
    });
    R(function () {
      var o = STO && STO.oldInstallers; if (!o || num(o.mb) < 500) return null;
      return F('sto-installers', 'Storage', 'low', 'Old installers in Downloads take ' + mbFmt(o.mb) + ' (' + o.count + ' files)',
        'Setup files (.exe, .msi), disk images (.iso) and archives (.zip, .rar) that you downloaded more than 2 months ago are usually not needed any more. The program they installed is already on your PC.',
        [S('Open File Explorer, then the Downloads folder. Click "Date modified" to sort the oldest first.'), S('Look at each old .exe, .msi, .iso, .zip, .rar file. If you do not need it, right-click it and choose Delete. It goes to the Recycle Bin first, so you can still get it back.'), S('Empty the Recycle Bin only when you are sure.')], '');
    });
    R(function () {
      var w = folderMB('Windows.old'); if (w < 1000) return null;
      return F('sto-winold', 'Storage', 'low', 'An old Windows copy (Windows.old) takes ' + mbFmt(w),
        'After a big Windows upgrade, Windows keeps the previous version for a while in case you want to go back. After about 10 days you usually do not need it, and it frees a lot of space. Windows removes it by itself after a month.',
        [S('Open Start, type "Disk Cleanup" and open it. Choose drive C:.'), S('Click "Clean up system files", wait, then tick "Previous Windows installation(s)" and click OK. You cannot go back to the older Windows afterwards.')], 'Windows.old: ' + mbFmt(w));
    });
    R(function () {
      var u = folderMB('Windows Update downloads'); if (u < 2000) return null;
      return F('sto-wucache', 'Storage', 'low', 'Windows Update leftovers take ' + mbFmt(u),
        'Windows keeps the files of past updates in a cache folder. It normally cleans it by itself. When it grows large, it can be cleaned safely.',
        [S('Open Settings, System, Storage, "Temporary files". Tick "Windows Update Cleanup" and "Delivery Optimization Files" and click Remove files.')], 'Cache: ' + mbFmt(u));
    });
    R(function () {
      var r = STO && STO.recycleBinMB; if (r == null || r < 1000) return null;
      return F('sto-recycle', 'Storage', 'low', 'The Recycle Bin holds ' + mbFmt(r),
        'Deleted files are not gone until the Recycle Bin is emptied. They still use space.',
        [S('Right-click the Recycle Bin on the Desktop and look inside first. Restore what you still need.'), S('Right-click the Recycle Bin again and choose "Empty Recycle Bin".')], '');
    });
    R(function () {
      var b = arr(STO && STO.bigFiles); if (!b.length) return null;
      var tot = sum(b, function (x) { return x.mb; });
      if (tot < 3000) return null;
      return F('sto-bigfiles', 'Storage', 'info', 'The ' + b.length + ' biggest files in your folders add up to ' + mbFmt(tot),
        'These are single files over 300 MB in Downloads, Documents, Desktop and Videos. Big files are the quickest way to free space.',
        [S('Read the list under "What we found". Do you still need each one?'), S('Move the ones you want to keep to an external disk. Delete the others (they go to the Recycle Bin first).')],
        b.map(function (x) { return mbFmt(x.mb) + '  ' + x.path + '  (' + fmtDate(x.modified) + ')'; }).join('\n'));
    });

    R(function () {
      var PUP = /driver\s*(booster|updater|easy|talent|genius)|driverpack|advanced\s*systemcare|iobit|pc\s*(cleaner|optimi[sz]er|speed|tune|accelerat)|reimage|mypc\s*backup|web\s*companion|ask\s*toolbar|conduit|babylon|wajam|opencandy|segurazo|slimware|registry\s*(cleaner|booster|fix)|system\s*mechanic|total\s*av|mackeeper|pc\s*app\s*store|coupon|search\s*protect|yac\b|delta\s*search/i;
      var hits = appsMatching(PUP).filter(function (n) { return !/^windows driver package/i.test(n); }); if (!hits.length) return null;
      return F('soft-pup', 'Software', hits.length >= 3 ? 'medium' : 'low', hits.length + ' program' + (hits.length > 1 ? 's' : '') + ' of the kind that often come bundled or do little good',
        'Some programs promise to "speed up" or "clean" your PC, update your drivers or protect you, and mostly show ads or scare you into paying. Others come hidden inside free downloads. Not every name on the list is bad, so check each one.',
        [S('Read the names under "What we found". Do you remember installing each one on purpose?'), S('If not, open Settings, Apps, Installed apps, click the three dots next to the name and choose Uninstall.'), S('Never install "driver updater" or "PC cleaner" programs. Windows Update and your PC maker already update drivers safely.'), S('After removing, restart and run a Quick scan in Windows Security.')],
        hits.join(', '));
    });
    R(function () {
      var all = appsMatching(/mcafee|norton|trend micro|kaspersky|avast|avg\b|bitdefender|eset|f-secure|webroot|sophos|panda|comodo|360 total/i);
      var fam = {}, famNames = {};
      all.forEach(function (n) { var k = (/mcafee/i.test(n) ? 'mcafee' : /norton/i.test(n) ? 'norton' : /trend micro/i.test(n) ? 'trend' : /kaspersky/i.test(n) ? 'kaspersky' : /avast|avg\b/i.test(n) ? 'avast' : /bitdefender/i.test(n) ? 'bitdefender' : /eset/i.test(n) ? 'eset' : /f-secure/i.test(n) ? 'fsecure' : /webroot/i.test(n) ? 'webroot' : /sophos/i.test(n) ? 'sophos' : /panda/i.test(n) ? 'panda' : /comodo/i.test(n) ? 'comodo' : 'other'); fam[k] = 1; (famNames[k] = famNames[k] || []).push(n); });
      var t = Object.keys(fam).map(function (k) { return famNames[k][0]; });
      var av = arr(g(D, 'security.antivirus', [])).filter(function (a) { return a.enabled; });
      var thirdActive = av.filter(function (a) { return !/windows defender|microsoft defender/i.test(a.name || ''); });
      if (t.length < 2 || ids2('sec-av2')) return null;
      return F('soft-avmany', 'Software', 'low', t.length + ' antivirus-type programs are installed',
        'Having several antivirus programs slows the PC and they can fight each other. One good antivirus is enough. Windows Security (Defender) is already included.',
        [S('Open Settings, Apps, Installed apps. Keep one security program (or none, and use Windows Security), and uninstall the rest.'), S('Some makers offer a removal tool on their website. Use it if a normal uninstall fails.')], t.join(', ') + (thirdActive.length ? ' (active: ' + thirdActive.map(function (a) { return a.name; }).join(', ') + ')' : ''));
    });

    R(function () {
      if (GAM.gameMode !== false) return null;
      return F('gam-mode', 'Performance', 'info', 'Game Mode is switched off',
        'Game Mode tells Windows to give your game priority and to hold back updates and background work while you play. It is on by default and helps a little, mostly on weaker PCs.',
        [S('Open Settings, Gaming, Game Mode, and switch it on.')], '');
    });
    R(function () {
      if (GAM.hags !== false) return null;
      var gp = arr(D.gpus).filter(function (x) { return /nvidia|amd|radeon/i.test(x.name || ''); })[0];
      if (!gp) return null;
      return F('gam-hags', 'Performance', 'info', 'Hardware-accelerated GPU scheduling is off',
        'This setting lets the graphics card manage its own memory. On recent graphics cards and drivers it can make games a little smoother. On some PCs it makes no difference or causes problems, so test it and keep what works.',
        [S('Open Settings, System, Display, Graphics, "Change default graphics settings".'), S('Switch "Hardware-accelerated GPU scheduling" on and restart. Play your usual game. If it stutters or crashes, switch it back off.')], gp.name);
    });
    R(function () {
      if (GAM.gameDvr !== true) return null;
      return F('gam-dvr', 'Performance', 'info', 'Xbox game recording is switched on in the background',
        'Windows can quietly record gameplay clips in the background. This costs a little speed in games. If you never use it, you can switch it off.',
        [S('Open Settings, Gaming, Captures, and switch "Record what happened" off.')], '');
    });

    /* ================= v0.5: connecting the dots between events and problems ================= */
    var TL = arr(EX.timeline).map(function (e) { return { t: new Date(e.t).getTime(), k: e.k, x: String(e.x || '') }; }).filter(function (e) { return isFinite(e.t); }).sort(function (a, b) { return a.t - b.t; });
    var H = 3600000, MIN = 60000;
    var BAD = { crash: 1, unclean: 1, bsod: 1, hang: 1, gpu: 1, disk: 1, svc: 1, whea: 1 };
    function ofKind() { var ks = Array.prototype.slice.call(arguments); return TL.filter(function (e) { return ks.indexOf(e.k) >= 0; }); }
    function when(ms) { return fmtDT(new Date(ms).toISOString()); }
    function within(ms, list, before, after) { return list.filter(function (e) { return e.t >= ms - before && e.t <= ms + after; }); }
    function trigName(e) { return (e.k === 'update' ? 'a Windows update' : e.k === 'install' ? 'the installation of ' : e.k === 'svcinst' ? 'a new background service' : 'the removal of ') + (e.k === 'update' ? ' (' + e.x + ')' : e.x ? e.x : ''); }
    var NICE = { crash: 'program crashes', unclean: 'unexpected shutdowns', bsod: 'blue screens', hang: 'programs that froze', gpu: 'graphics driver errors', disk: 'drive errors', svc: 'service crashes', whea: 'hardware errors' };

    R(function () {
      if (TL.length < 10) return null;
      var best = null;
      Object.keys(BAD).forEach(function (kind) {
        var evs = ofKind(kind); if (evs.length < 4) return;
        var first = evs[0].t;
        var trig = TL.filter(function (e) { return (e.k === 'update' || e.k === 'install' || e.k === 'svcinst') && e.t <= first && first - e.t <= 72 * H; }).pop();
        if (!trig) return;
        var before = evs.filter(function (e) { return e.t < trig.t; }).length;
        var after = evs.length - before;
        if (after < 4 || before > after * 0.2) return;
        if (!best || after > best.after) best = { kind: kind, trig: trig, first: first, after: after, before: before };
      });
      if (!best) return null;
      var isWU = best.trig.k === 'update';
      return F('cor-start', 'Stability', best.after >= 12 ? 'medium' : 'low', 'The ' + NICE[best.kind] + ' started right after ' + trigName(best.trig),
        'Looking at the time of each event, ' + NICE[best.kind] + ' first appeared ' + Math.round((best.first - best.trig.t) / H) + ' hour(s) after ' + trigName(best.trig) + ' and happened ' + best.after + ' times since. Before that, it was almost never there. That is a strong clue about the cause.',
        isWU ? [S('Do not panic. This does not prove the update is to blame, but it is the first thing to check.'), S('Create a restore point first: press the Windows key, type "Create a restore point", click Create.'),
               S('Open Settings, Windows Update, Update history, scroll down and click "Uninstall updates". Find the update from that day and click Uninstall. Restart and see if the problem is gone.'), S('If it is gone, pause updates for a week (Settings, Windows Update, Pause) and ask someone before you update again.')]
             : [S('This does not prove the program is to blame, but it is the first thing to check.'), S('Open Settings, Apps, Installed apps. Find the program installed around that time, click the three dots and choose Uninstall. Restart and see if the problem is gone.'),
               S('If you need the program, install the newest version from the maker\'s website, or tell the AI help tab what you see.')],
        'First ' + NICE[best.kind] + ': ' + when(best.first) + '\nThe change: ' + trigName(best.trig) + ' on ' + when(best.trig.t) + '\nBefore the change: ' + best.before + ' events. After: ' + best.after + ' events.');
    });

    R(function () {
      var crashes = ofKind('bsod', 'unclean'); if (crashes.length < 2) return null;
      var wakes = ofKind('wake', 'sleep'); if (!wakes.length) return null;
      var hit = crashes.filter(function (c) { return within(c.t, wakes, 15 * MIN, 0).length > 0; });
      if (hit.length < 2 || hit.length < crashes.length * 0.4) return null;
      return F('cor-wake', 'Stability', 'medium', hit.length + ' of ' + crashes.length + ' crashes happened right after the PC woke from sleep',
        'The PC crashed within minutes of waking up from sleep, again and again. The usual cause is a driver (graphics, network, USB or chipset) that does not wake up properly, or a power setting.',
        [S('Do not use Sleep for now: Settings, System, Power, set "Screen and sleep" to Never for the sleep options. See if the crashes stop.'),
         S('Update the graphics, network and chipset drivers from the website of the PC or motherboard maker (not from a "driver updater" program).'),
         S('Turn off Fast Startup: Control Panel, Power Options, "Choose what the power buttons do", untick "Turn on fast startup".'),
         S('If it still happens, copy the dates shown below into the AI help tab and ask.')],
        hit.slice(-6).map(function (c) { return when(c.t) + ' ' + (c.k === 'bsod' ? 'blue screen' : 'unexpected shutdown'); }).join('\n'));
    });

    R(function () {
      var crashes = ofKind('bsod', 'unclean'); if (crashes.length < 2) return null;
      var disk = ofKind('disk'); if (!disk.length) return null;
      var hit = crashes.filter(function (c) { return within(c.t, disk, 15 * MIN, 0).length > 0; });
      if (hit.length < 2) return null;
      return F('cor-disk', 'Storage', 'high', 'Drive errors came right before ' + hit.length + ' crashes',
        'Just before the PC crashed or switched off by itself, Windows wrote an error about a drive. A drive or its cable that is failing can freeze the whole PC. This is serious because it can also lose your files.',
        [S('Copy your important files to another drive or to the cloud, today.'), S('Open the Hardware tab and look at the drive health and temperature.'),
         S('If the drive is an old SATA one, shut down, unplug the power, and reseat the thin data cable at both ends (or ask someone to do it).'), S('Run the check from the matching "Drive or file system errors" finding. If errors keep coming, plan to replace the drive.')],
        hit.slice(-6).map(function (c) { return when(c.t); }).join('\n'));
    });

    R(function () {
      var bad = ofKind('crash', 'hang', 'bsod'); if (bad.length < 3) return null;
      var gpu = ofKind('gpu'); if (!gpu.length) return null;
      var hit = bad.filter(function (c) { return within(c.t, gpu, 5 * MIN, 0).length > 0; });
      if (hit.length < 3 || hit.length < bad.length * 0.3) return null;
      return F('cor-gpu', 'Stability', 'medium', hit.length + ' crashes came right after a graphics driver error',
        'Right before a program crashed or froze, the graphics driver had a problem. That points to the graphics driver (or heat or power for the graphics card) as the real cause, not the program that crashed.',
        [S('Install the newest stable driver from nvidia.com, amd.com or intel.com (the website of the maker of your graphics card).'), S('If it keeps happening, do a clean install: in the driver installer choose "Custom" and tick "Perform a clean installation".'),
         S('Check that the graphics card is not too hot: clean the dust, make sure its fans spin.')],
        hit.slice(-6).map(function (c) { return when(c.t) + ' ' + (c.k === 'bsod' ? 'blue screen' : c.k === 'hang' ? 'froze: ' + c.x : 'crash: ' + c.x); }).join('\n'));
    });

    R(function () {
      var bad = ofKind('crash', 'unclean', 'bsod', 'hang'); if (bad.length < 6) return null;
      var hours = []; for (var i = 0; i < 24; i++) hours.push(0);
      bad.forEach(function (e) { hours[new Date(e.t).getHours()]++; });
      var best = 0, bh = 0;
      for (var h = 0; h < 24; h++) { var s = hours[h] + hours[(h + 1) % 24] + hours[(h + 2) % 24]; if (s > best) { best = s; bh = h; } }
      if (best < bad.length * 0.6) return null;
      var pad = function (n) { return (n < 10 ? '0' : '') + n; };
      return F('cor-hours', 'Stability', 'low', 'Most crashes (' + best + ' of ' + bad.length + ') happen between ' + pad(bh) + ':00 and ' + pad((bh + 3) % 24) + ':00',
        'Problems that always happen at the same time of day usually come from something that starts at that time: a scheduled task, a backup, a Windows update, a game or program you open every day, or the PC going to sleep.',
        [S('Think: what do you do, or what runs by itself, at that time? Backup? Antivirus scan? A game?'), S('Open Task Scheduler (press the Windows key, type "Task Scheduler") and look at the tasks that run around that time.'),
         S('Try moving that activity to another time of day and see if the problems follow it.')], '');
    });

    R(function () {
      var boots = ofKind('boot'); var ups = ofKind('update'); if (boots.length < 6 || !ups.length) return null;
      var up = ups[ups.length - 1];
      var b4 = boots.filter(function (b) { return b.t < up.t; }), af = boots.filter(function (b) { return b.t >= up.t; });
      if (b4.length < 3 || af.length < 3) return null;
      var avg = function (a) { return a.reduce(function (s, b) { return s + parseFloat(b.x); }, 0) / a.length; };
      var x = avg(b4), y = avg(af);
      if (!(y > x * 1.4 && y - x > 10)) return null;
      return F('cor-boot', 'Performance', 'low', 'Windows starts slower since the update on ' + when(up.t).split(',')[0],
        'Before that update the PC started in about ' + Math.round(x) + ' seconds. Since then it takes about ' + Math.round(y) + ' seconds. A new background program or driver that came with the update, or a program that now starts with Windows, is the usual cause.',
        [S('Open Task Manager (Ctrl + Shift + Esc), click "Startup apps", and switch off what you do not need.'), S('Restart twice. The first start after an update is slower.'), S('If it is still slow, see the "Windows takes about N seconds to start" finding for the list of slow programs.')],
        'Average start before the update: ' + Math.round(x) + ' s (' + b4.length + ' starts). After: ' + Math.round(y) + ' s (' + af.length + ' starts).');
    });

    R(function () {
      var un = ofKind('unclean'); if (un.length < 2) return null;
      var sd = ofKind('shutdown', 'wake');
      var forced = un.filter(function (u) { return within(u.t, sd, 6 * MIN, 0).length === 0 && within(u.t, ofKind('bsod'), 0, 6 * MIN).length === 0; });
      if (forced.length < 2) return null;
      return F('cor-power', 'Stability', 'low', forced.length + ' times the PC lost power or was switched off with the button',
        'These ' + forced.length + ' restarts were not preceded by a normal shutdown, a wake from sleep or a blue screen. That means the power was cut, the power button was held, or the PC shut itself off because of heat.',
        [S('Was it a power cut or did you hold the button? If yes, ignore this.'), S('If not, check the PC for dust and heat (is it very hot to touch?), and the power cable or the laptop charger.'), S('Consider a small UPS (battery backup) if power cuts are common where you live.')],
        forced.slice(-6).map(function (u) { return when(u.t); }).join('\n'));
    });

    R(function () {
      var bad = ofKind('crash', 'unclean', 'bsod', 'hang', 'gpu', 'disk', 'svc'); if (bad.length < 10) return null;
      var perDay = {}; bad.forEach(function (e) { var d = new Date(e.t).toDateString(); perDay[d] = (perDay[d] || 0) + 1; });
      var top = Object.keys(perDay).sort(function (a, b) { return perDay[b] - perDay[a]; })[0];
      if (perDay[top] < bad.length * 0.5) return null;
      var dayStart = new Date(top).getTime();
      var that = TL.filter(function (e) { return e.t >= dayStart - 12 * H && e.t < dayStart + 36 * H && (e.k === 'update' || e.k === 'install' || e.k === 'svcinst' || e.k === 'uninstall'); });
      return F('cor-burst', 'Stability', 'info', 'Most problems (' + perDay[top] + ' of ' + bad.length + ') happened on one day: ' + new Date(top).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        'When almost everything went wrong on a single day, something happened that day. A one-day burst is often harmless and does not come back. It is more worrying if it repeats.',
        [S('Do you remember what you did that day (new program, update, travel, power cut)?'), S('If the problems have stopped since, there is nothing to do. If they come back, run the scan again in a few days.')],
        that.length ? that.map(function (e) { return when(e.t) + ' ' + trigName(e); }).join('\n') : 'No install or update events were found around that day.');
    });

    out.sort(function (a, b) { return SEV_ORDER[a.sev] - SEV_ORDER[b.sev]; });
    return out;
  }

  /* ---------------- "looking good" checks ---------------- */
  function goodChecks(findings) {
    var ids = {}; findings.forEach(function (f) { ids[f.id] = 1; });
    var list = [];
    function ok(label, detail) { list.push({ label: label, detail: detail || '' }); }
    var disks = arr(D.disks);
    if (disks.length && disks.every(function (d) { return /healthy/i.test(d.health || ''); }) && !ids['sto-health']) ok('Drives report Healthy', disks.length + ' physical drive' + (disks.length > 1 ? 's' : ''));
    if (!ids['sto-space'] && arr(D.volumes).length) ok('Enough free disk space', '');
    if (g(D, 'settings.trim', null) === true) ok('TRIM is enabled for SSDs');
    if (g(D, 'security.secureBoot', null) === true) ok('Secure Boot is on');
    if (g(D, 'security.tpm.ready', false)) ok('TPM is ready', g(D, 'security.tpm.specVersion', ''));
    if (arr(D.volumes).some(function (x) { return x.bitlocker && /on|1/i.test(String(x.bitlocker.protection)); })) ok('BitLocker encryption is on');
    var av = arr(g(D, 'security.antivirus', [])).filter(function (a) { return a.enabled; });
    if (av.length && !ids['sec-av']) ok('Antivirus is active', av.map(function (a) { return a.name; }).join(', '));
    var fw = g(D, 'security.firewall', null);
    if (fw && fw.domain !== false && fw.private !== false && fw.public !== false) ok('Firewall is on for all profiles');
    if (g(D, 'security.uac', null) === true) ok('User Account Control is on');
    if (g(D, 'security.pendingReboot', null) === false) ok('No restart is pending');
    if (g(D, 'dism.state', '') === 'healthy') ok('Windows component store is healthy');
    var pd = g(D, 'updates.lastPatchDaysAgo', null);
    if (pd != null && pd <= 45) ok('Windows updates are recent', 'last update ' + pd + ' days ago');
    if (!ids['stab-shutdown'] && !ids['stab-bsod'] && !ids['stab-whea']) ok('No unexpected shutdowns, blue screens or hardware errors', 'last ' + g(D, 'events.days', 30) + ' days');
    var ex2 = g(D, 'extras', null);
    if (ex2) {
      var dd = g(ex2, 'securityMore.defender', null);
      if (dd && dd.signatureAgeDays != null && dd.signatureAgeDays < 7 && !ids['sec-def-sigs']) ok('Antivirus knows the newest viruses', 'definitions ' + dd.signatureAgeDays + ' days old');
      if (dd && dd.threats30d === 0) ok('No threats found in the last 30 days');
      if (g(ex2, 'networkTest.ping.lost', null) === 0 && !ids['net-gw']) ok('Your router answers quickly', g(ex2, 'networkTest.ping.avgMs', '?') + ' ms');
      if (g(ex2, 'networkTest.dns.ok', null) === true && !ids['net-dns']) ok('Website names are looked up fine');
      if (g(ex2, 'networkTest.timeSync.local', null) === false) ok('The clock syncs with internet time');
      if (!ids['bak-none'] && (g(ex2, 'backup.fileHistory', false) || g(ex2, 'backup.oneDriveFolders.documents', false) || g(ex2, 'backup.oneDriveFolders.desktop', false))) ok('Some form of backup is in place');
      if (g(ex2, 'backup.winRE', null) === true) ok('Windows recovery menu is available');
      var ri = g(ex2, 'reliability.stabilityIndex', null);
      if (ri != null && ri >= 8) ok('Windows reliability score is high', ri + ' out of 10');
    }
    var ram = num(g(D, 'system.ram.totalGB', 0));
    if (ram >= 16) ok('Plenty of memory', fmtGB(ram));
    if (arr(g(D, 'system.ram.modules', [])).length >= 2 && !ids['perf-xmp']) ok('Memory runs in dual channel');
    return list;
  }

  /* ---------------- scoring ---------------- */
  function score(findings) {
    var pen = 0; findings.forEach(function (f) { pen += PEN[f.sev] || 0; });
    var s = Math.max(0, Math.round(100 - pen));
    var areas = AREAS.map(function (a) {
      var p = 0; findings.forEach(function (f) { if (f.area === a) p += (f.sev === 'high' ? 20 : f.sev === 'medium' ? 8 : f.sev === 'low' ? 3 : 0); });
      return { name: a, score: Math.max(0, Math.round(100 - p)) };
    });
    var label = s >= 85 ? 'In good shape' : (s >= 60 ? 'Needs attention' : 'Needs work');
    return { score: s, label: label, areas: areas };
  }

  /* ---------------- Windows 11 readiness ---------------- */
  function ord(n) { var t = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (t[(v - 20) % 10] || t[v] || t[0]); }
  function cpuSupport(name) {
    name = String(name || '');
    var m;
    if (/Core\(TM\)\s*Ultra|Core\s*Ultra/i.test(name)) return { st: 'pass', d: 'Intel Core Ultra is supported.' };
    if ((m = name.match(/Core\(TM\)\s*(?:i[3579]|m[3579])-(\d{4,5})/i)) || (m = name.match(/\bi[3579]-(\d{4,5})/i))) {
      var digits = m[1], gen;
      gen = digits.length === 5 ? parseInt(digits.slice(0, 2), 10) : (digits.charAt(0) === '1' ? parseInt(digits.slice(0, 2), 10) : parseInt(digits.charAt(0), 10));
      if (gen >= 8) return { st: 'pass', d: 'Intel ' + ord(gen) + ' generation (8th or newer is needed).' };
      return { st: 'fail', d: 'Intel ' + ord(gen) + ' generation is too old. Windows 11 needs the 8th generation or newer.' };
    }
    if ((m = name.match(/Ryzen\s*(?:Threadripper\s*)?(?:PRO\s*)?\d?\s*(?:PRO\s*)?(\d)(\d{3})/i))) {
      var first = parseInt(m[1], 10);
      if (first >= 3) return { st: 'pass', d: 'AMD Ryzen ' + first + '000 series or newer is supported.' };
      if (first === 2) return { st: 'warn', d: 'AMD Ryzen 2000 series: desktop chips are supported, some mobile ones are not. Check Microsoft\'s list.' };
      return { st: 'fail', d: 'AMD Ryzen 1000 series is not supported by Windows 11.' };
    }
    if (/Snapdragon|Qualcomm/i.test(name)) return { st: 'warn', d: 'Qualcomm processors: only some are on Microsoft\'s list.' };
    if (/Pentium|Celeron|Atom|Xeon|Athlon|FX-|A\d-|EPYC/i.test(name)) return { st: 'unknown', d: 'This processor family needs a manual check against Microsoft\'s supported-processor list.' };
    return { st: 'unknown', d: 'Could not recognise the processor name.' };
  }
  function readiness() {
    var rows = [], s = D.system || {}, os = s.os || {}, cpu = s.cpu || {};
    function row(label, st, detail) { rows.push({ label: label, status: st, detail: detail }); }
    if (!RAW) return { rows: rows, verdict: '', level: 'unknown', alreadyWin11: false };
    var build = num(os.build);
    row('64-bit system', /64/.test(os.arch || '') ? 'pass' : (os.arch ? 'fail' : 'unknown'), os.arch || 'unknown');
    var cs = cpuSupport(cpu.name); row('Supported processor', cs.st, (cpu.name ? cpu.name + '. ' : '') + cs.d);
    var ramGB = num(g(s, 'ram.totalGB', 0));
    row('At least 4 GB of memory', ramGB >= 3.8 ? 'pass' : (ramGB ? 'fail' : 'unknown'), ramGB ? fmtGB(ramGB) : 'unknown');
    var biggest = 0; arr(D.volumes).forEach(function (v) { biggest = Math.max(biggest, num(v.sizeGB)); });
    var cVol = arr(D.volumes).filter(function (v) { return /^C:/i.test(v.letter); })[0];
    var sysSize = cVol ? num(cVol.sizeGB) : biggest;
    row('At least 64 GB of storage', sysSize >= 64 ? 'pass' : (sysSize ? 'fail' : 'unknown'), sysSize ? fmtGB(sysSize) + ' on the system drive' : 'unknown');
    var fw = s.firmware || '';
    row('UEFI firmware (not legacy BIOS)', fw === 'UEFI' ? 'pass' : (fw === 'BIOS' ? 'fail' : 'unknown'), fw ? fw : 'unknown');
    var sb = g(D, 'security.secureBoot', null);
    row('Secure Boot', sb === true ? 'pass' : (sb === false ? (fw === 'BIOS' ? 'fail' : 'warn') : (fw === 'BIOS' ? 'fail' : 'unknown')), sb === true ? 'on' : (sb === false ? 'off or not available. Often it can simply be switched on in the BIOS.' : 'could not be read'));
    var tpm = g(D, 'security.tpm', null);
    if (!tpm) row('TPM 2.0', 'warn', 'No TPM found. Many boards have it switched off in the BIOS (fTPM on AMD, PTT on Intel).');
    else if (/^2/.test(tpm.specVersion || '')) row('TPM 2.0', tpm.ready ? 'pass' : 'warn', 'version ' + tpm.specVersion + (tpm.ready ? '' : ', not ready'));
    else row('TPM 2.0', tpm.present ? 'fail' : 'warn', tpm.present ? 'TPM version ' + (tpm.specVersion || 'unknown') + ' is too old' : 'TPM not present');
    var fails = rows.filter(function (r) { return r.status === 'fail'; }).length;
    var warns = rows.filter(function (r) { return r.status === 'warn'; }).length;
    var unk = rows.filter(function (r) { return r.status === 'unknown'; }).length;
    var level = fails ? 'fail' : (warns ? 'warn' : (unk ? 'unknown' : 'pass'));
    var verdict = fails ? 'Not ready for Windows 11' : (warns ? 'Almost ready: only settings need changing' : (unk ? 'Probably ready, a few checks are unknown' : 'Ready for Windows 11'));
    return { rows: rows, verdict: verdict, level: level, alreadyWin11: build >= 22000, build: build };
  }

  var findings = RAW ? runRules() : [];
  var good = RAW ? goodChecks(findings) : [];
  var sc = score(findings);
  var counts = { high: 0, medium: 0, low: 0, info: 0 };
  findings.forEach(function (f) { counts[f.sev]++; });

  return {
    RAW: RAW, D: D, $: $, $$: $$, esc: esc, arr: arr, num: num, g: g, sum: sum, uniq: uniq, words: words,
    fmtNum: fmtNum, fmtGB: fmtGB, fmtDate: fmtDate, fmtDT: fmtDT, fmtUptime: fmtUptime, ageDays: ageDays,
    evGroups: evGroups, evCount: evCount, RE: RE, findings: findings, good: good, score: sc, counts: counts,
    SEV_ORDER: SEV_ORDER, AREAS: AREAS, readiness: readiness(), battery: g(D, 'battery', null),
    withProfile: withProfile, scoreOf: score, META: META, noiseFor: noiseFor, PROFILES: PROFILES, BUGCODES: BUGCODES, bugKey: bugKey, baseFindings: findings, profile: 'home'
  };
}
var V = Engine(window.__PCDATA__ || null);
V.Engine = Engine;
V.setProfile = function (key) {
  V.profile = V.PROFILES[key] ? key : 'home';
  V.findings = V.withProfile(V.baseFindings, V.profile);
  V.counts = { high: 0, medium: 0, low: 0, info: 0 };
  V.findings.forEach(function (x) { V.counts[x.sev]++; });
  V.score = V.scoreOf(V.findings);
};
