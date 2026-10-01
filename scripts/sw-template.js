const BUILD_VERSION = '__BUILD_VERSION__';
const FILES = __PRECACHE_FILES__;
const SCOPE = self.registration.scope;
const CACHE_PREFIX = `speedstorm:${SCOPE}:`;
const CACHE_NAME = `${CACHE_PREFIX}${BUILD_VERSION}`;
const PRECACHE = FILES.map(file => new URL(file, SCOPE).href);
const INDEX = new URL('index.html', SCOPE).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      await cache.addAll(PRECACHE.map(url => new Request(url, { cache: 'reload' })));
    } catch (error) {
      await caches.delete(CACHE_NAME);
      throw error;
    }
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(SCOPE)) return;
  const url = new URL(request.url);
  const appRoot = new URL(SCOPE).pathname;
  const isAppDocument = request.mode === 'navigate'
    && (url.pathname === appRoot || url.pathname === `${appRoot}index.html`);
  const assetUrl = `${url.origin}${url.pathname}`;
  if (!isAppDocument && !PRECACHE.includes(assetUrl)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(isAppDocument ? INDEX : assetUrl);
    return cached || fetch(request);
  })());
});
