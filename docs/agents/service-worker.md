# Service worker (background)

The full text moved out of `AGENTS.md`, verbatim. `AGENTS.md` keeps each section's rules; this file keeps the history, measurements and derivations behind them.

- **`public/sw.js` is the app's service worker** (speed plan, 2026-10-12), registered in production
  only, after the `load` event, by `ServiceWorker` in the root layout. It CACHES one kind of request,
  `/_next/static/` (content-hashed, cache first, trimmed to its newest 600 files), and lets every other
  one through untouched except a PAGE LOAD (PWA plan PR A, 2026-10-14; d9's rule). Not the mana sprite:
  its URL has no hash and the build computes each pip's cell from its symbol order, so a cached sprite
  behind a new build draws the wrong symbols. Never a reader's document, an RSC payload, `/api`, an
  action or anything cross-origin, because those carry a reader's own data.

  **A page load is answered by the network, always, and kept nowhere.** Only when the network FAILS
  does the worker answer it with the one page it keeps: `/offline`, which it fetches ITSELF with
  `credentials: "omit"` (so the copy is the signed-out render, with no shell and nothing of anyone's;
  `/offline` is public in `src/proxy.ts`), keeps only when the answer really is `/offline` (a redirect
  to sign-in or an error is thrown away), and fetches again at install and after a page load at most
  hourly, with its stylesheet and scripts, so it draws with no network after a deploy. Those assets are
  kept WITH the page, in its own `offline-*` cache, which no trim touches and which is refreshed only
  when every asset of the new page was had, so the static cache's 600-file trim never takes one. The
  previous page's assets stay one refresh longer, for a document that already drew that copy. A server's own
  error (a 500) is passed through as it is. `src/app/sw.test.ts` runs the file against a fake worker scope and pins every one of those, the
  hourly re-fetch included. **To retire it**, ship a
  `sw.js` that unregisters itself (`self.registration.unregister()` in `activate`) rather than deleting
  the file: an update check that finds the script gone keeps the installed worker running on every
  device that has it, while a self-unregistering one leaves on the next visit. Bump `VERSION` in it to drop
  every cache it holds. `measure:load`'s EVICTED figure is the load it exists for: a returning reader
  whose HTTP cache was cleared.

- **Push (plan `2026-10-22-push.md`, PR 3d; `VERSION` v2).** The worker also handles `push` and `notificationclick`, and nothing else
  about its caching changed. A `push` carries the server's small JSON payload (`src/lib/push/send.ts`): the title, body, `tag`, a
  `route`, the item `keys`, and `openCard` / `openCombo` for Home. It is shown as sent (`showNotification`, icon
  `/icons/icon-192.png`, the card `image` only when https) and **nothing of it is kept**: no cache is touched. A payload it cannot read
  still shows a generic "The 99", never nothing, because a push that shows nothing costs the subscription. **A focused window of the app
  gets no notification** (its own surfaces say it) **except in Safari's WebKit**: an installed iPhone or iPad, any browser on iOS,
  and Safari on a Mac all require every push to show one and revoke a subscription that stays silent (D5, widened from iOS to
  every Safari). It is decided from the user agent alone: a worker's navigator has no `maxTouchPoints`, and an iPad asking for the
  desktop site reads as Safari on a Mac, which gets the same answer. A landing
  (`route`) is a same-origin path or Home: `//host`, a backslash, an absolute URL or a non-string all become `/`. A tap closes the
  notification, focuses an open window of the app and navigates it, or opens one (also when the window refuses to navigate). What
  Home should open rides in the ADDRESS, `push-card=<oracle id>` and `push-combo=1`, never a `postMessage`: a message sent at a
  navigation reaches the page being left, and a window opened cold has no listener yet. The landing PR reads and strips them.
  `src/app/sw.test.ts` pins all of it, including that a push touches no cache. The `VERSION` bump drops the v1 caches once; the install
  keeps `/offline` again.

