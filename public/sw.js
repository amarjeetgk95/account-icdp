const CACHE_NAME = 'icdp-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  if (e.request.method === 'GET') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request, { ignoreSearch: true }))
    );
  }
});
