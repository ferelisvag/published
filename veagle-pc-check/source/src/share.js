/* VEAGLE PC Check - "share-safe copy": the same report with personal details removed from the data */
var SHARE = (function (V, AI) {
  'use strict';

  function build() {
    var R = AI.redactor();
    function walk(x) {
      if (typeof x === 'string') return R(x);
      if (Array.isArray(x)) return x.map(walk);
      if (x && typeof x === 'object') { var o = {}; Object.keys(x).forEach(function (k) { o[k] = walk(x[k]); }); return o; }
      return x;
    }
    var clean = walk(V.RAW);
    delete clean.previous; // the earlier scan is not part of a share-safe copy
    clean.meta = clean.meta || {};
    (clean.meta.stepIssues || []).forEach && (clean.meta.stepIssues || []).forEach(function (x) { x.samples = []; }); // error texts are not shared
    try {
      var mo = clean.extras && clean.extras.more;
      if (mo) {
        if (mo.inventory) mo.inventory.serial = '<SERIAL>';
        (mo.accounts || []).forEach(function (a, i) { a.name = '<ACCOUNT ' + (i + 1) + '>'; });
        (mo.wifiSaved || []).forEach(function (w, i) { w.name = '<NETWORK ' + (i + 1) + '>'; });
        (mo.certs || []).forEach(function (c, i) { c.name = '<CERTIFICATE ' + (i + 1) + '>'; });
        (mo.signatures && mo.signatures.flagged || []).forEach(function (s) { s.folder = '<PATH>'; });
      }
      var m2 = clean.extras && clean.extras.more2;
      if (m2) {
        m2.neighbours = []; m2.usbHistory = []; m2.recentRuns = [];
        (m2.mappedDrives || []).forEach(function (x, i) { x.remote = '<PATH ' + (i + 1) + '>'; });
        (m2.vpn || []).forEach(function (x, i) { x.name = '<VPN ' + (i + 1) + '>'; x.server = '<SERVER>'; });
        (m2.monitors || []).forEach(function (x) { x.serial = '<SERIAL>'; });
        (m2.printers || []).forEach(function (x, i) { x.name = '<PRINTER ' + (i + 1) + '>'; });
        if (m2.board) { m2.board.assetTag = '<TAG>'; m2.board.chassisSerial = '<SERIAL>'; }
        if (m2.lastUser) { m2.lastUser.user = '<USER>'; m2.lastUser.display = '<USER>'; }
        if (m2.management) { m2.management.tenant = '<ORG>'; m2.management.domain = m2.management.domain ? '<DOMAIN>' : ''; m2.management.workgroup = m2.management.workgroup ? '<WORKGROUP>' : ''; }
        if (m2.windowsLicence) m2.windowsLicence.partialKey = '<KEY>';
        ((m2.persistence && m2.persistence.items) || []).forEach(function (x) { x.command = '<PATH>'; });
      }
    } catch (e) { }
    clean.meta.user = '<USER>'; clean.meta.computer = '<PC>'; clean.meta.domain = '<DOMAIN>'; clean.meta.shareSafe = true;
    var json = JSON.stringify(clean).replace(/<\//g, '<\\/');
    var html = '<!doctype html>\n<html lang="en">\n<head>' + PAGE.head + '</head>\n<body>' + PAGE.body +
      '\n<script>window.__PCDATA__ = ' + json + ';<' + '/script>\n<script>' + PAGE.code + '<' + '/script>\n</body>\n</html>\n';
    return { html: html, tally: R.tally };
  }

  function download() {
    var r = build();
    var blob = new Blob([r.html], { type: 'text/html;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'veagle-pc-check-share-safe.html';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    var keys = Object.keys(r.tally);
    AI.toast('Saved veagle-pc-check-share-safe.html. ' + (keys.length ? 'Removed: ' + keys.map(function (k) { return k + ' x' + r.tally[k]; }).join(', ') + '.' : 'Nothing needed removing.') + ' Still glance through it before you send it.');
  }
  return { build: build, download: download };
})(V, AI);
