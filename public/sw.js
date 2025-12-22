/* Minimal PWA service worker for BJJ Classes
   Update SW_VERSION when you bump the app version to refresh caches. */
const SW_VERSION = 'v1.2';
const CACHE_NAME = `bjj-classes-${SW_VERSION}`;
const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  // Icons are optional; they'll be fetched if present
  '/icons/icon-192.png',
  
  '/icons/icon-512.png',
  '/icons/maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    self.skipWaiting();
    const cache = await caches.open(CACHE_NAME);
    // Add critical assets; ignore failures so install never blocks
    await Promise.allSettled(
      PRECACHE_URLS.map(async (url) => {
        try {
          const res = await fetch(url, { cache: 'no-cache' });
          if (res && res.ok) await cache.put(url, res.clone());
        } catch (_) {/* ignore */}
      })
    );
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Remove old caches
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k.startsWith('bjj-classes-') && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// Strategy helpers
async function networkFirst(event) {
  try {
    const fresh = await fetch(event.request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(event.request, fresh.clone()).catch(() => {});
    return fresh;
  } catch (_) {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    // Last‑ditch: serve cached '/' for navigations if available
    const fallback = await caches.match('/');
    return fallback || Response.error();
  }
}

async function cacheFirst(event) {
  const cached = await caches.match(event.request);
  if (cached) return cached;
  const res = await fetch(event.request).catch(() => null);
  if (res && res.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(event.request, res.clone()).catch(() => {});
  }
  return res || Response.error();
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GETs
  if (req.method !== 'GET') return;

  // Same‑origin only
  const sameOrigin = url.origin === self.location.origin;

  // App Router static assets
  const isNextStatic = sameOrigin && url.pathname.startsWith('/_next/static/');
  const isAsset = sameOrigin && /\.(?:js|css|png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf)$/.test(url.pathname);

  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(event));
    return;
  }

  if (isNextStatic || isAsset) {
    event.respondWith(cacheFirst(event));
  }
});

// Support manual updates from the page (optional)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
