const CACHE_NAME = 'wde-cache-v1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/app.js',
  './js/i18n.js',
  './js/config.js',
  './js/eventbus.js',
  './js/countries.js',
  './data/gdp.js',
  './data/inflation.js',
  './data/unemployment.js',
  './data/gdp_per_capita.js',
  './data/population.js',
  './data/life_expectancy.js',
  './data/gini.js',
  './data/co2.js',
  './data/trade_balance.js',
  './data/debt_to_gdp.js',
  './data/history.js',
  './data/regions.js',
  './assets/icon.svg',
  'https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js',
  'https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js',
  'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);

  // Offline-first document navigation fallback.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  const isSameOrigin = requestUrl.origin === self.location.origin;
  const isJsDelivr = requestUrl.origin === 'https://cdn.jsdelivr.net';
  if (!isSameOrigin && !isJsDelivr) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request)
        .then(response => {
          if (response && (response.ok || response.type === 'opaque')) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
