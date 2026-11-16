/* Veagle Survival Book: αντίγραφο για λειτουργία χωρίς internet.
   Εγγράφεται ΜΟΝΟ όταν ο χρήστης πατήσει το κουμπί στη σελίδα (τίποτα αυτόματο).
   Δεν στέλνει τίποτα πουθενά: αποθηκεύει μόνο αρχεία αυτής της σελίδας στη συσκευή. */
var CACHE = 'vsb-v1';
var CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png',
  'eagle-white.png', 'eagle-black.png', 'logo-pyrosvestiki.png', 'logo-astynomia.png',
  'logo-limeniko.png', 'logo-ekab.png', 'logo-hamogelo.png', '../veagleos/fonts/fonts.css'];

self.addEventListener('install', function (e) {
  e.waitUntil((async function () {
    var c = await caches.open(CACHE);
    await c.addAll(CORE.map(function (u) { return new Request(u, { cache: 'reload' }); }));
    /* οι γραμματοσειρές που ονομάζει το fonts.css */
    try {
      var cssUrl = new URL('../veagleos/fonts/fonts.css', self.registration.scope).href;
      var txt = await (await fetch(cssUrl)).text();
      var urls = {}; txt.replace(/url\(["']?([^"')]+)["']?\)/g, function (_, u) { urls[new URL(u, cssUrl).href] = 1; });
      await Promise.all(Object.keys(urls).map(function (u) { return c.add(u).catch(function () {}); }));
    } catch (err) {}
    self.skipWaiting();
  })());
});

self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    var keys = await caches.keys();
    await Promise.all(keys.filter(function (k) { return k.indexOf('vsb-') === 0 && k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
    await self.clients.claim();
  })());
});

/* Με internet: φέρνει την πιο νέα εκδοχή και ανανεώνει το αντίγραφο. Χωρίς internet: δίνει το αποθηκευμένο. */
self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  e.respondWith((async function () {
    var c = await caches.open(CACHE);
    try {
      var net = await fetch(r);
      if (net && net.ok) c.put(r, net.clone());
      return net;
    } catch (err) {
      var hit = await c.match(r, { ignoreSearch: true });
      if (hit) return hit;
      if (r.mode === 'navigate') { var home = await c.match('index.html'); if (home) return home; }
      throw err;
    }
  })());
});
