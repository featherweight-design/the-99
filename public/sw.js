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
// And it shows a PUSH (plan 2026-10-22-push.md, PR 3d): the server sends a small JSON payload (title, body, route, tag, and what
// Home opens), and a tap lands on `route`. A payload is shown as sent and nothing of it is kept. A window the reader is looking at
// gets no notification, except in Safari's WebKit (an installed iPhone or iPad, Safari on a Mac), which requires every push to
// show one and revokes a subscription that stays silent. The tag is the kind (a spare request's own key), so a newer notification replaces an older one of its tag.
//
// Hand-written rather than generated: the app builds with Turbopack, which the generators' plugins
// do not support, and a worker this small is easier to read than to configure.

const VERSION = "v2";
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
// The kept page's own asset URLs, so the next refresh knows which files the copy it replaces drew with.
const KEPT_ASSETS = "x-the99-kept-assets";
// And the assets of the copy it replaced, which a document already served may still ask for.
const KEPT_PREVIOUS = "x-the99-kept-previous";
// One refresh at a time within a running worker.
let refreshing = null;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  // A worker installs only once ITS cache holds the offline page (a copy this version already kept
  // counts). A failed fetch fails the install, so the worker before it, and the cache it reads, stay
  // until the browser tries again, rather than a new version activating with nothing to fall back on
  // and deleting the old one.
  event.waitUntil(
    (async () => {
      if (await (await caches.open(OFFLINE)).match(offlineRequest())) return;
      if (!(await keepOfflinePage().catch(() => false))) throw new Error("the offline page could not be kept");
    })(),
  );
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
// When a refresh was last TRIED, kept in the offline cache beside the page: the throttle counts
// attempts, not successes, so a page or asset that keeps failing is asked for at most hourly too.
function attemptRequest() {
  return new Request(new URL(`${OFFLINE_PATH}?attempt`, self.location.origin));
}

async function refreshOfflinePageIfOld() {
  const offline = await caches.open(OFFLINE);
  const stamp = async (request) => Number((await offline.match(request))?.headers.get(KEPT_AT)) || 0;
  // A kept copy counts as an attempt too: the one install keeps starts the hour.
  const triedAt = Math.max(await stamp(attemptRequest()), await stamp(offlineRequest()));
  if (Date.now() - triedAt <= OFFLINE_REFRESH_MS) return;
  refreshing ??= (async () => {
    await offline.put(attemptRequest(), new Response(null, { headers: { [KEPT_AT]: String(Date.now()) } }));
    await keepOfflinePage();
  })().finally(() => {
    refreshing = null;
  });
  await refreshing;
}

/**
 * Fetches `/offline` with NO credentials, so the copy is the signed-out render, and keeps it only
 * when it is that page (not a redirect to sign-in, not an error). Its own stylesheet and scripts
 * are kept with it, so it draws with no network. Answers whether a copy was kept.
 */
async function keepOfflinePage() {
  const response = await fetch(OFFLINE_PATH, { credentials: "omit", cache: "no-store", redirect: "follow" });
  if (!response.ok || response.redirected || new URL(response.url, self.location.origin).pathname !== OFFLINE_PATH) return false;
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
    if (!asset.ok) return false;
    kept.push([request, asset]);
  }
  // The page and its assets are kept TOGETHER, in their own cache, which no trim touches: the static
  // cache's trim can then never take a file the kept page needs. The PREVIOUS page's assets stay one
  // generation longer, because a document already served that copy (in another tab, or while this
  // refresh ran) may still be asking for them; only files neither generation names are dropped.
  const offline = await caches.open(OFFLINE);
  const previous = await offline.match(offlineRequest());
  const urls = kept.map(([request]) => request.url);
  for (const [request, asset] of kept) await offline.put(request, asset);
  const headers = new Headers(response.headers);
  headers.set(KEPT_AT, String(Date.now()));
  headers.set(KEPT_ASSETS, urls.join(" "));
  headers.set(KEPT_PREVIOUS, previous?.headers.get(KEPT_ASSETS) ?? "");
  await offline.put(offlineRequest(), new Response(html, { status: response.status, headers }));
  // What stays is read from the page kept NOW, not from what this refresh saw: a second worker (one
  // installing beside the active one) may have published after it, and its files must survive.
  const current = await offline.match(offlineRequest());
  const names = (header) => (current?.headers.get(header) ?? "").split(" ").filter(Boolean);
  const wanted = new Set([offlineRequest().url, attemptRequest().url, ...names(KEPT_ASSETS), ...names(KEPT_PREVIOUS)]);
  for (const key of await offline.keys()) if (!wanted.has(key.url)) await offline.delete(key);
  return true;
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

// --- Push ---------------------------------------------------------------------------------------------------------

// The notification's icon is `public/icons/icon-192.png` carried inside the worker as a data URL, not its path. Chrome on Android
// fetches a path's icon itself when the push arrives, and when that fetch comes back empty it draws its own stand-in instead: a grey
// circle with the site's first letter (a "T" for the-99.dev), which is what a price drop on Hugh's phone showed (2026-10-26) though the
// path was sent. Bytes already in the worker need no fetch. `sw.test.ts` checks they are still the file's.
const PUSH_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAYAAABS3GwHAAAACXBIWXMAACE4AAAhOAFFljFgAAAPMElEQVR42u2d55tURRbG+y/YFSRnhmEIogTJiAw5ypAFRDIIkoYkIiBKFgSFFRBBUBYHyUnJWRRBiSqooIuRjX9Dbb9X24edpXv6Vp17b93b74f3wzzw3Orqen+3q06dOhUrUexPiqIyVTF+CRQBoCgCQFEEgKIIAEURAIoiABRFACiKAFAUAaAoAkBRBICiCABFEQCKIgAURQAoigBQFAGgKAJAUQSAoggARREAiiIAFEUAqN81pVttNaNHHX4XBCAzzX9lcXtHhIAAZKz5CQEByHjzEwICkPHmJwQEIOPNTwgIQNrKKldc1a9WOnLmDxsEGAOMBQHwUVXLFlfbJjZXp2bnqobVy0TO/GGBAOY/MbuV2jW5hcoqX5wA+Gn+hElshsDE/LZDkDB/4nOGFYJYmM1vMwQS5rcVgsLmDzMEsbCb30YIJM1vGwTJzB9WCGJRML9NEHhhflsgKMr8YYQgFhXz2wCBl+YPGoJ0zR82CGJRMn+QEPhh/qAgcGv+MEEQi5r574WgkU8Q+Gl+vyHQNX9YIIhF0fx+QhCE+f2CwNT8YYAgFlXz+wFBkOb3GgIp89sOQSzK5vcSAhvM7xUE0ua3GYJY1M3vBQQ2mV8aAq/MbysEsUwwvyQENppfCgKvzW8jBLFMMb8EBDab3xQCv8xvGwSxTDK/CQRhML8uBH6b3yYIAgWgzSMV1MUFbX3/4i8vaq+G5Gan/TnLlnggEFB1hc+Kz5xu//Bd4Dvx+3Ni7FvHPZDRU6BO9SuqC/Pb+mr+ke1yXH/OymWKqa0Tm1lv/h35LbQOqAxt7S8EF+Nj3rVhJa4B/IRA1/xhgUDX/H5DYIv5rQqDeg2Bqflth8DU/H5BYJP5rdsI8woCKfPbCoGU+b2GwDbzW5kKIQ2BtPltg0Da/F5BYKP5rU2Gk4LAK/PbAoFX5peGwFbzW50ObQqB1+YPGgKvzS8Fgc3mt/5ADCDQ2Sfwy/xBQeCX+U0hsN38oTgS6RYCv83vNwR+m18XgjCYPzSH4tOFICjz+wVBUOZ3C0FYzB+qsihFQRC0+b2GIGjzpwtBmMwfusJYySCwxfxeQWCL+YuCIGzmD2VpxMIQ2GZ+aQhsM38yCMJo/tAWx01AYKv5pSCw1fyFIQir+UNdHr1Tg4pqZNvq1n9OXQhsN39CGAO8kFgenRKDICzmL8ELMihpCGh+ApCxEND8BCBjIaD5CUDGQkDzE4CMhYDmJwAZqypxCCB+FwSAoggARREAiiIAFEUAKIoAUBQBoCgCQFEEgKIIAEURAIoiABRFACiKAFAUAaAoAkBRBICiCABFEQCKIgAURQBUjewqqkuHXDVu9GC1bNEc9fba5Wrru2vVgd2b1emju9XZY3vV0Q/ed/4ueGeNen3py+qFaeNV355dVJ2a2aHoY+UKZVSrxxqrYYP6qvlzpqt1b7yi3tu0Wu3b+a46fnC708eTh3c6fdxZsEGtWblEvTR7qvP/mzasp0qXKEYAoiKYYWC/PLX69cXq6oUT6j+/fm2kr6+dU2+tXqqeerKHKle6pBV9LPXgA6pz+1y1cO4MderILvXPn74y6uPP3111wJg4dpiqlZNFAMKohvXqqJXL5qkfvr1kbPpk+u7mRfXq4jmq7kPBlGfPqlReTc8fq658etyzPv79hy+dX8JO7VoRgDAIb6yN615T//7lpmemKKy7d64706lqlcv70sdypR50pmU/3b7iWx+hXVs3qGaN6hEAG1Wy+J/V5AmjPH3jF6WvrpxVT3Ru62k/MdW5dP5oYH28+8MX6vmp45xpFwGwRBXLlVJbNr6hPahHDmxVM6eOV4MH9FaD+vd0BvjM0T1az/rXzzfU7OcnedLPKRNHq3/8qDe/x/pn0byZasSQ/mpA3zw1/pkh6v3Na7Wft3f7JlWpfGkCELSqV62ozp3crzWI+LXondc56S8K5te6UK16db7zDKlfNyzidT/LvNnTVNlS96892r71Y+r2jQtaz8VLIqdaZQIQlPAGQtRDZ/AQKenSMbfINhAi1DUe3rgS/Vy6cLb2Z1g8/4Uin/9k7ye0n49wavkypQhAEHN+LMp0Bw4RonTaQewfkRDddkYNH2jUz0nPDtdu+7OPDzsL5nTawd6AbjuYfhIAnzVmxNNGURs38e39uzZrt/XjrcvaYdIGdWurX76/pt025vvptjV10jNGi+MRg58kAH6GOu9887n2YG3fss5Ve9MmjTEyBxaMOv08tLdAu02sb9xs1DWq/7BRH7GOCOt6IHQAYPPJZLCeGT7IdejRNHyYznrjXiGcatIe0jvcTilNQ8ivLJhFALwW3jLYqjcZqCaP1nXVZnaVCsYA4G3u19sfem7yWNff7fFDO4xTKML4KxAqAExCkxDi3slCgqkksevaokkDX6YjUJ8eXVz30WQvJaFZ0ycQAC+FsJvJAF27eFKr3cvnjxmbA+kS6bQ1d9YU47aQ1em2jyuWzDVu9+K5QwTAKz1UI9s4x+fD3Vu02kaqtEQmaTqbYx+fOmDUDr6jCmXdZ6q+PGuqSLrE4y0aEQAvhLRm08FBopxO2wf3vCdijqKmQdjcM01n/v7rz7T6iHWDRB/DNg0KDQDY1TQdHKQU6LS9o2C9iDkQb0/VDg7rSCTl6fRxwpihIn3EvgkB8ECI35sODua5Om2/u2GViDmQgJaqHZxUM20D6xWdPg5/up9IH7F5F6ZTZaEBwDRM5+TnvPS8VttrVy0RMQcOr6RqZ87MfOM2sIbQ6aNJTlBhIZJFAIQlcfJJF4CV8exOCWMgXRrp28nawRlk0zaQHavTx55PdBQDYGC/7gRAWpjbmg4MdpF12pYIEf4RJWneyJPs03uT4HT62L1zO7E+enUmIqMB+OLSGeOBwZtcp23E8KXMkWqT6o3XFhk/X3evo2un1mJ9XLV8AQGwcQqEEiFBRaASQiZr0qlWPE3b9PnfXP9Yq484+C7VR7e5SAQgDR37cJvxwKDCgU7bKDkiZY5ZMyYmbQf/JhGF0ekjTodJ9RH1hwiAsDa/bR6KxI6uTts4VihljlQL8ZFDB4i0oZOU1rZVc7E+6kaiCEAKvfjCZOOBuf3Vp1pto3KalDlSLcRR0U2iDZjZbR9zWzYR6+PnnxwhANKSilLo1O+RnAKlWiAiU9XkFJjJCa32uS3E+nj989MEwIvyJ6ZnAX6LUee5bnvJArlFMCI9qdras22jcRso3+i2jxJpGAl9efkMAfBCSGYzHRzs6ga5D1DUXsTQp/oYt3Hj6lnXZVnyurTjFMh2dWz7uPHg4KB69axKrtrFtEXKHJhOpWoLZUa+/eIT33djsT8h1cePTuwjAF4JZb1NB+gvKxYGkgtUVBhU6iB+4nBKqrSLwurfpzvDoGEQcupRo1Jiuz7ZNAG/NC2bNfzj7w1rlouZAzVMiyyAW7qEY2DTtvbteEdVqVj2vm08XKu6kwCX+PvpAb3E+oi7CAiA5SFR500VzzBFzc0ObVqqdrnNVf64EerEod+OXeJoYqI9bKDJJYrlpR2XNynKldDNax85+xg9urZ3wqyogYr+oD4Sjpgm2hs9/CmxPq5fvYwAeH0pBLbbvaqCfP2zU87lGtInwqDWLZv6UgAsnfKQ2P1NtDVjyrNiz8a+CQHwuk5+vPCTxCGZ+5X3aPN4s/9p65PTH4g9Pyd+TZPbqtBIo5buJ6pg39sOaplKPdu0JCQBSFM4eYSCTFIGwa0vKIRVuB2EFaVOS+lUjUZEB2d9pc4k3O/cruRCH5mlBMBHofLaecO3NKJLdevUuO/z7965Jrbm0O0jFq2maxGkSvfo1uG+z5eaUqIqBcrWE4AAfg2GDOzjZI2mWz4Fb0MYv1f3TikrNUi9GXXPJN8rTM/eWb/SFZTYmMICP1W90EP7CkT6qHsmmQAIqnZONSeqgQMwCAXi1wG3pGAujxAd9gEwT61ZvWqRz2rc4BExAACoZGpIv17dnOxSrIVwVwL6eOGjg86tNxvfXOFUoUi3Ip3ELZpO6Zl4uwQgQpI8LJ5sihV8QKGEcT2ihCbFf2kIQISEGxkljIE3s619bN64vhjk9R6uSQCiJKlQK25tt7WPz44aLJMDdHyfYm3QCAkhS91L5NxUgwham956XaSPqGtEACIkqVNSONAvdWukF7vqKNwrEf5EwIAAREimt9EklG/xwtD0NpqEcJCHN8RESGVKFnMSyUyNgR1cmy+VRuKaBAA4UEMAIqRhg/rKVIEQui/YC9WI5yVJ7HJjn8XWKR4B0BRONRlXoYgvoN2ePvNTUglwvfM6K16TGiGNGjbA8ypwQQv3F0vcfRamKnAEIA0hkevWl+eNjXHm6B4nwmJrP3cWbDDu469/u2rt7jYB0Eyo27XV3Bi4c9fmGvn540dG/heOAAQU9kQ8XKf2kF/C0UhcF+t1fSMCEDLhkIjEW3HBi89ZXVbG9EZ4COemkUBHACKS7iBV/hyX8NkaDsSGl8SiF9GxMB14IQAphJIhEjekQ8uXvGil+fGZUGdIosIEzhxkVSofKQ9kLACo+yNxAzxOlaFMi419RCHgbX99UwTwvds3qaqVykXOBxkHAG5Rx63oqItjagqES5OdsQ1ag/r3FCmxiIMy+L5sDukSgDRDnCgbLlXhYff7b6taOVnW9RNnhnEkUiqLFVcnRdkXkQcAby68DXEwXKryMZ5nWz9R5AqbW+kWBEglLJbx1o9KpCcjAUCiF0KbqPImZfwJY4Y6WaI2neVF0p7UGx+Zq7gRU+eKJQJgyTQHGz3vbVotUkAX818sInE7jU0RnmaN6jlGxZVPUuXMx44c7KyPMm1NGIvCFAcbPLhlHVeESpRGxFRi3OjBaZVN8Us4bI4yiRK3ZQJsPAcH/lEwN5ND4bEo7OBeOn/UufhCJ4pzeH+BUz8IB8NRuBb3dNm4g/vp2YPqVjyq43aOD6DPndzvlHifnj/W+TWLYjiTU6DfC+aihCCMjIEuLNT9xPQB6wNMl8I6zcMvU/N4watundv8Xx+x4/tY00dVnZrZKSvBUdwJpigCQBEAfhEUAaAoAkBRBICiCABFEQCKIgAURQAoigBQFAGgKAJAUQSAoggARREAiiIAFEUAKIoAUBQBoCgCQFEEgKIIAEURAIoiABRFACiKAFAUAaAoAkBRBICiCABFEQCKIgAURQAoigBQFAGgKAJAUQSAouT0X5NtVxfTIf9uAAAAAElFTkSuQmCC";

/**
 * Safari's WebKit (an installed iPhone or iPad app, any browser on iOS, Safari on a Mac): it requires every push to show a
 * notification and revokes a subscription that stays silent, so the focused-window rule below does not apply there. Read from
 * the user agent alone: a worker has no `maxTouchPoints`, and an iPad that asks for the desktop site says "Macintosh", which
 * this rule takes as Safari on a Mac, the same answer.
 */
function alwaysShows() {
  const ua = (self.navigator && self.navigator.userAgent) || "";
  if (/iPhone|iPad|iPod/.test(ua)) return true;
  return /AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg|OPR|SamsungBrowser|Android/.test(ua);
}

/**
 * The landing as an ABSOLUTE URL on this origin, or Home's: a payload is ours, but a landing is never trusted to leave the app.
 * Judged on what the URL parser makes of it, not on the string (it drops tabs and line breaks), and returned whole, never as a
 * path: a path like "//host/x" would be read as another host by the next parse. Applying it twice gives the same answer.
 */
function landing(route) {
  const home = new URL("/", self.location.origin).href;
  if (typeof route !== "string") return home;
  try {
    const url = new URL(route, self.location.origin);
    return url.origin === self.location.origin ? url.href : home;
  } catch {
    return home;
  }
}

self.addEventListener("push", (event) => {
  event.waitUntil(showPush(event));
});

async function showPush(event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  if (data === null || typeof data !== "object") data = {};
  if (!alwaysShows()) {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    // Looking at the app already: its own surfaces say it, and a notification on top would be noise.
    if (windows.some((w) => w.focused)) return;
  }
  const title = typeof data.title === "string" && data.title ? data.title : "The 99";
  const options = {
    body: typeof data.body === "string" ? data.body : "",
    tag: typeof data.tag === "string" && data.tag ? data.tag : "the-99",
    icon: PUSH_ICON,
    data: {
      route: landing(data.route),
      keys: Array.isArray(data.keys) ? data.keys.filter((k) => typeof k === "string") : [],
      openCard: typeof data.openCard === "string" ? data.openCard : null,
      openCombo: data.openCombo === true,
    },
  };
  if (typeof data.image === "string" && data.image.startsWith("https://")) options.image = data.image;
  await self.registration.showNotification(title, options);
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(openLanding(event.notification.data ?? {}));
});

/**
 * Focuses an open window of the app and takes it to the landing, or opens one. What to open there rides in the ADDRESS
 * (`push-card`, `push-combo`), never a message: a message sent at a navigation reaches the page being left, and a window
 * opened cold has nobody listening yet. The page reads them once and strips them (the landing PR).
 */
async function openLanding(data) {
  const url = new URL(landing(data.route));
  if (typeof data.openCard === "string" && data.openCard) {
    url.searchParams.set("push-card", data.openCard);
    if (data.openCombo === true) url.searchParams.set("push-combo", "1");
  }
  const href = url.href;
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const mine = windows.find((w) => new URL(w.url).origin === self.location.origin);
  if (mine) {
    await mine.focus().catch(() => {});
    // `navigate()` resolves to null when the window went away meanwhile: that is a failure too.
    const went = await mine.navigate(href).then((client) => client != null, () => false);
    if (went) return;
  }
  await self.clients.openWindow(href);
}
