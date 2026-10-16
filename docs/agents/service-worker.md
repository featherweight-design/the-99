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
