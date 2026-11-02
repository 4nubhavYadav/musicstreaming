// Sora Service Worker - App Shell & Offline Cache
const CACHE_NAME = 'sora-shell-v1';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Precache addAll warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Don't intercept non-GET or cross-origin API proxy requests with stale cache
  if (req.method !== 'GET') return;

  // Navigation requests: Network-first, fallback to offline.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => {
          return caches.match(req).then((cached) => {
            return cached || caches.match('./offline.html');
          });
        })
    );
    return;
  }

  // Static assets: Network-first, caching local origin assets
  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        if (networkRes.ok && req.url.startsWith(self.location.origin)) {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return networkRes;
      })
      .catch(() => {
        return caches.match(req);
      })
  );
});
