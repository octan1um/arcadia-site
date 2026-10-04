/* Tombstone.
   A service worker shipped on 2026-10-04 and was withdrawn the same evening. Deleting the file
   is not enough: a browser that already registered it keeps the old one when the update check
   404s, so anyone who loaded the site in that window would have kept being served the cached
   page - including the version Kashim asked to have removed.
   This replaces it, clears everything it cached, unregisters itself and reloads the open tabs. */
self.addEventListener('install', function () { self.skipWaiting(); });

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.registration.unregister(); })
      .then(function () { return self.clients.matchAll({ type: 'window' }); })
      .then(function (clients) { clients.forEach(function (c) { c.navigate(c.url); }); })
  );
});
