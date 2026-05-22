const STATIC_CACHE = 'wde-static-v2';
const RUNTIME_CACHE = 'wde-runtime-v2';
const MAX_RUNTIME_ENTRIES = 120;

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/frameguard.js',
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
  './assets/world/countries-110m.json'
];

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await cache.delete(keys[0]);
  await trimCache(cacheName, maxEntries);
}

async function putRuntimeCache(request, response) {
  const cache = await caches.open(RUNTIME_CACHE);
  await cache.put(request, response);
  await trimCache(RUNTIME_CACHE, MAX_RUNTIME_ENTRIES);
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
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
          .filter(key => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request);
        if (response && response.ok) {
          await putRuntimeCache(event.request, response.clone());
        }
        return response;
      } catch (_) {
        const cached = await caches.match(event.request);
        return cached || caches.match('./index.html');
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    const networkPromise = fetch(event.request)
      .then(async response => {
        if (response && response.ok) {
          await putRuntimeCache(event.request, response.clone());
        }
        return response;
      })
      .catch(() => cached);

    return cached || networkPromise;
  })());
});
