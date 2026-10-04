/* Arcadia site — offline shell.
   A launcher's own page working without a connection is the point, not a trick: the app asks for
   no network permission, so the site should not need one either once you have seen it. */
var CACHE = 'arcadia-v1';
var SHELL = ['./', 'index.html', 'style.css', 'app.js', 'demo.js', 'palette.js',
  'manifest.webmanifest', 'assets/icon.png'];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () {
    return self.skipWaiting();
  }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    /* Network first, so an update is never held back by a stale shell; the cache is the
       fallback, which is the only time it is allowed to answer. */
    fetch(event.request).then(function (response) {
      var copy = response.clone();
      caches.open(CACHE).then(function (c) { c.put(event.request, copy); });
      return response;
    }).catch(function () {
      return caches.match(event.request).then(function (hit) {
        return hit || caches.match('index.html');
      });
    })
  );
});
