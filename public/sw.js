// The app's service worker (speed plan, 2026-10-12): a returning reader's static files come from
// the device instead of the network, whatever the browser's HTTP cache has evicted since.
//
// It caches TWO things and nothing else:
//
//   - `/_next/static/`: content-hashed by the build, served `immutable`, identical for every reader.
//     Cache first: a hashed URL never changes what it names.
//   - `/mana/sprite.svg`: one file every pip draws from, served `max-age=0, must-revalidate`, so the
//     browser asks again on every document load. Served from the cache at once and refreshed behind
//     it, so a new sprite lands on the next load.
//
// Never a document, a React Server Component payload, an `/api` route, a server action or anything
// cross-origin (Clerk, Scryfall's art). Those carry a reader's own data or are already cached by
// their origin, and a stale one would be a wrong page rather than a slow one. A request it does not
// answer goes to the network exactly as if there were no worker.
//
// Hand-written rather than generated: the app builds with Turbopack, which the generators' plugins
// do not support, and a worker this small is easier to read than to configure.

const VERSION = "v1";
const STATIC = `static-${VERSION}`;
const SPRITE = `sprite-${VERSION}`;
// Every deploy adds its own hashed files and none are removed by the build, so the cache is trimmed
// to its newest entries. A build's whole set is a few hundred files.
const STATIC_LIMIT = 600;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC, SPRITE]);
      for (const name of await caches.keys()) {
        if (!keep.has(name)) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, event));
  } else if (url.pathname === "/mana/sprite.svg") {
    event.respondWith(staleWhileRevalidate(request, event));
  }
});

async function cacheFirst(request, event) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) {
    event.waitUntil(cache.put(request, response.clone()).then(() => trim(cache, STATIC_LIMIT)));
  }
  return response;
}

async function staleWhileRevalidate(request, event) {
  const cache = await caches.open(SPRITE);
  const hit = await cache.match(request);
  const refresh = fetch(request).then(async (response) => {
    if (response.ok) await cache.put(request, response.clone());
    return response;
  });
  if (hit) {
    event.waitUntil(refresh.catch(() => {}));
    return hit;
  }
  return refresh;
}

/** Deletes the oldest entries past `limit`. `keys()` returns them in the order they were put. */
async function trim(cache, limit) {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - limit))) await cache.delete(key);
}
