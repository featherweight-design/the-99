// The app's service worker (speed plan, 2026-10-12): a returning reader's static files come from
// the device instead of the network, whatever the browser's HTTP cache has evicted since.
//
// It caches `/_next/static/`, content-hashed by the build, served `immutable` and identical for
// every reader. Cache first, because a hashed URL never changes what it names.
//
// And it answers a PAGE LOAD (`mode: "navigate"`) from the network, always, falling back to ONE
// page only when the network FAILS: `/offline`, a static page with no reader in it. The worker
// fetches that page itself, with no credentials, so the copy it keeps is the signed-out render and
// never anyone's data, and keeps it only when it really is `/offline` (a redirect to sign-in is
// thrown away). A page load is never cached, and a server's own error (a 500) is passed through as
// it is: only an unreachable network gets the fallback.
//
// Not the mana sprite, though every page asks for it again: its URL carries no hash, and each pip's
// cell position is computed by the build's JavaScript from the sprite's symbol order. A cached
// sprite one symbol behind a new build would draw every pip after the new symbol one cell over for
// a whole visit. Its revalidation answers 304, so it costs a round trip and no bytes.
//
// Never a reader's document, a React Server Component payload, an `/api` route, a server action or
// anything cross-origin (Clerk, Scryfall's art). Those carry a reader's own data or are already
// cached by their origin, and a stale one would be a wrong page rather than a slow one. A request it
// does not answer goes to the network exactly as if there were no worker.
//
// Hand-written rather than generated: the app builds with Turbopack, which the generators' plugins
// do not support, and a worker this small is easier to read than to configure.

const VERSION = "v1";
const STATIC = `static-${VERSION}`;
// Every deploy adds its own hashed files and none are removed by the build, so the cache is trimmed
// to its newest entries. A build's whole set is a few hundred files.
const STATIC_LIMIT = 600;
const OFFLINE = `offline-${VERSION}`;
const OFFLINE_PATH = "/offline";
// The kept `/offline` is fetched again after a page load at most this often, so its stylesheet
// and scripts follow each deploy. When it was kept rides on the kept copy itself (`KEPT_AT`), not in
// a variable: the browser stops an idle worker after seconds, and a variable starts at zero again.
const OFFLINE_REFRESH_MS = 60 * 60 * 1000;
const KEPT_AT = "x-the99-kept-at";
// One refresh at a time within a running worker.
let refreshing = null;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(keepOfflinePage().catch(() => {}));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Only this worker's own older versions: Cache Storage is shared by the whole origin.
      for (const name of await caches.keys()) {
        if (name.startsWith("static-") && name !== STATIC) await caches.delete(name);
        if (name.startsWith("offline-") && name !== OFFLINE) await caches.delete(name);
      }
      // The page load starts while the worker wakes, rather than after it.
      const preload = self.registration?.navigationPreload;
      if (preload) await preload.enable().catch(() => {});
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(networkOrOffline(event));
    return;
  }
  if (url.pathname.startsWith("/_next/static/")) event.respondWith(cacheFirst(request, event));
});

/** The network's answer, whatever it is; the kept `/offline` only when the network is unreachable. */
async function networkOrOffline(event) {
  let response;
  try {
    response = (await event.preloadResponse) ?? (await fetch(event.request));
  } catch {
    const kept = await (await caches.open(OFFLINE)).match(offlineRequest());
    return kept ?? Response.error();
  }
  event.waitUntil(refreshOfflinePageIfOld().catch(() => {}));
  return response;
}

function offlineRequest() {
  return new Request(new URL(OFFLINE_PATH, self.location.origin));
}

/** Fetches the kept `/offline` again when it is older than `OFFLINE_REFRESH_MS`, or missing. */
async function refreshOfflinePageIfOld() {
  const kept = await (await caches.open(OFFLINE)).match(offlineRequest());
  const keptAt = Number(kept?.headers.get(KEPT_AT)) || 0;
  if (Date.now() - keptAt <= OFFLINE_REFRESH_MS) return;
  refreshing ??= keepOfflinePage().finally(() => {
    refreshing = null;
  });
  await refreshing;
}

/**
 * Fetches `/offline` with NO credentials, so the copy is the signed-out render, and keeps it only
 * when it is that page (not a redirect to sign-in, not an error). Its own stylesheet and scripts
 * are kept beside the build's other static files, so it draws with no network.
 */
async function keepOfflinePage() {
  const response = await fetch(OFFLINE_PATH, { credentials: "omit", cache: "no-store", redirect: "follow" });
  if (!response.ok || response.redirected || new URL(response.url, self.location.origin).pathname !== OFFLINE_PATH) return;
  const html = await response.clone().text();
  const statics = await caches.open(STATIC);
  // A path ends at a quote, a space, a bracket or a BACKSLASH: inside the page's inline RSC payload
  // the same paths are JSON-escaped (`\"/_next/static/...\"`), and the backslash is not part of one.
  const assets = new Set((html.match(/\/_next\/static\/[^"'\s<>)\\]+/g) ?? []).map((p) => p.replace(/&amp;/g, "&")));
  // Every asset first, from the static cache when it has one: one that cannot be had abandons the
  // refresh (a throw rejects it), so the copy already kept, which can still draw, is never replaced
  // by one that cannot.
  const kept = [];
  for (const path of assets) {
    const request = new Request(new URL(path, self.location.origin));
    const asset = (await statics.match(request)) ?? (await fetch(request));
    if (!asset.ok) return;
    kept.push([request, asset]);
  }
  // The page and its assets are kept TOGETHER, in their own cache, which no trim touches, and
  // replaced as a set: the static cache's trim can then never take a file the kept page needs.
  const offline = await caches.open(OFFLINE);
  const wanted = new Set([offlineRequest().url, ...kept.map(([request]) => request.url)]);
  for (const [request, asset] of kept) await offline.put(request, asset);
  const headers = new Headers(response.headers);
  headers.set(KEPT_AT, String(Date.now()));
  await offline.put(offlineRequest(), new Response(html, { status: response.status, headers }));
  for (const key of await offline.keys()) if (!wanted.has(key.url)) await offline.delete(key);
}

async function cacheFirst(request, event) {
  const cache = await caches.open(STATIC);
  // The offline page's own assets are kept with it, out of reach of the static cache's trim.
  // `has` before `open`, which would create the cache on a miss.
  const hit =
    (await cache.match(request)) ?? ((await caches.has(OFFLINE)) ? await (await caches.open(OFFLINE)).match(request) : undefined);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) {
    event.waitUntil(cache.put(request, response.clone()).then(() => trim(cache, STATIC_LIMIT)));
  }
  return response;
}

/** Deletes the oldest entries past `limit`. `keys()` returns them in the order they were put. */
async function trim(cache, limit) {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - limit))) await cache.delete(key);
}
