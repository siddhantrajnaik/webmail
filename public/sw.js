// Kill switch for an orphaned service worker.
//
// An earlier build shipped a vite-plugin-pwa service worker. The plugin was
// later dropped from vite.config.ts, so no replacement worker is generated and
// /sw.js falls through to the SPA shell (HTML). A browser that already
// registered the old worker can never update it - the update check fetches
// HTML with the wrong MIME type and fails - so it keeps serving its stale
// precache indefinitely.
//
// This worker takes over, drops every cache, unregisters itself, and reloads
// open tabs onto the live build. Keep it until clients have cycled through.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) client.navigate(client.url);
  })());
});

// Never serve from cache while winding down.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
