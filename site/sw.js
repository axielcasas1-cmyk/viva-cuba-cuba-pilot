const CACHE = 'viva-cuba-mother-v0.9.0';
const APP_CACHE_PREFIX = 'viva-cuba-';
const SHELL = [
  './',
  './index.html',
  './app.js',
  './install.js',
  './owner-entry.js',
  './owner-user.js',
  './call.js',
  './version.js',
  './sync.js',
  './release.json',
  './styles.css',
  './install.css',
  './owner-entry.css',
  './manifest.webmanifest',
  './icon.svg',
  './lib/core.mjs',
  './lib/release-core.mjs',
  './owner.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(APP_CACHE_PREFIX) && key !== CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

async function networkFirst(request, fallbackKey = null, cacheResult = true) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (cacheResult && response.ok) await cache.put(fallbackKey || request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(fallbackKey || request);
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirstWithRefresh(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const refresh = fetch(request).then(async (response) => {
    if (response.ok) await cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || refresh || Response.error();
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, './index.html', true));
    return;
  }

  if (url.pathname.endsWith('/release.json')) {
    event.respondWith(networkFirst(request, null, false));
    return;
  }

  if (['script', 'style', 'worker', 'manifest'].includes(request.destination) || /\.(?:js|mjs|css|json)$/.test(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (['image', 'font'].includes(request.destination)) {
    event.respondWith(cacheFirstWithRefresh(request));
    return;
  }

  event.respondWith(networkFirst(request));
});
