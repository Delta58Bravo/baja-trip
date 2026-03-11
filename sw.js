// sw.js — Service Worker for Baja Trip PWA
// Caches all app assets on install so the app works fully offline

const CACHE_NAME = 'baja-trip-v1';

// Everything needed to run the app offline
const ASSETS = [
  './',
  './index.html',
  './wlf-logo.jpg',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  // Google Fonts (cached on first load)
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap',
];

// Install: cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        // Non-fatal: font CDN may fail — app still works
        console.warn('[SW] Some assets failed to cache (non-fatal):', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for app assets, network-first for weather API
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Weather API — network first, fall back to cache
  if (url.includes('open-meteo.com') || url.includes('firebase')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          // Cache successful weather responses
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Everything else — cache first, network fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        // Cache new successful responses
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return res;
      });
    })
  );
});
