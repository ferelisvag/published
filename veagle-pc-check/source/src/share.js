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
    clean.meta = clean.meta || {};
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
