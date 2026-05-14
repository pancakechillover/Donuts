const CACHE_NAME = 'timedonut-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/icon.svg',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Try to cache everything, but fail gracefully if something is missing
        return cache.addAll(urlsToCache).catch(err => console.warn('Cache warning:', err));
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  
  // Don't intercept API calls or HMR websocket
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/@vite') || url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }

  // Network first strategy for everything else
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Only cache valid responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache).catch(() => {});
          });

        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
