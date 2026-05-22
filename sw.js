// sw.js — Service Worker para funcionamiento offline (PWA)

const CACHE = 'menus-v1';
const ARCHIVOS = [
  './',
  './index.html',
  './css/styles.css',
  './js/storage.js',
  './js/algoritmo.js',
  './js/ui.js',
  './js/app.js',
  './manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ARCHIVOS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
