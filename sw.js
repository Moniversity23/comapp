const CACHE_NAME = 'comapp-sw-v1';
const OFFLINE_URLS = [
  '/',
  '/comapp/',
  '/comapp/index.html',
  '/comapp/favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((k) => { if (k !== CACHE_NAME) return caches.delete(k); return null; })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Navigation requests: serve cached index.html fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/comapp/index.html'))
    );
    return;
  }

  // For same-origin static assets under /comapp/assets/ use cache-first
  if (url.origin === location.origin && url.pathname.startsWith('/comapp/assets/')) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => { caches.open(CACHE_NAME).then((c) => c.put(req, res.clone())); return res; }))
    );
    return;
  }

  // Default network-first
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
