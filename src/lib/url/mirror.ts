// Writing the address bar without navigating: every `history.replaceState` a page makes to mirror
// its own state (a filter, a sort, a view, an open card) or to strip a one-time parameter.
//
// Next patches `history.replaceState` so the router adopts whatever URL it is given, and adopting
// a URL while a navigation is pending DROPS that navigation. Measured on main (1f's startup
// diagnostic, 2026-09-29): a push to /decks, then /collection's and /discover's mirror effects
// re-wrote the page's OWN current URL ~700ms later, and in 3 of 4 cases the reader never left.
// So every mirror goes through here, under three rules:
//
//   1. A write equal to the live URL is not made. It changes nothing a reader can see, and it is
//      the write that was adopted over the pending push.
//   2. A write naming a different PATH than the live one is not made. A mirror describes the page
//      it is on and never moves it; a browser Back or Forward has already changed the address when
//      Next's popstate handler runs, so a late write from the page being left would put that
//      page's own path back over the destination.
//   3. While a navigation is pending (the shell's `NavigationPendingProvider` says so), no write
//      is made. The last one asked for is kept, and made when the navigation ends without leaving
//      the path it was asked on; a navigation that leaves has made it moot.

let pending = false;
let deferred: { href: string; state: unknown; path: string } | null = null;

const sameAsLive = (url: URL) =>
  url.pathname === window.location.pathname &&
  url.search === window.location.search &&
  url.hash === window.location.hash;

/** Mirror `href` into the address bar, unless it is already there or a navigation is pending. */
export function mirrorUrl(href: string | URL, state: unknown = null): void {
  const url = new URL(href, window.location.href);
  if (pending) {
    deferred = { href: typeof href === "string" ? href : url.href, state, path: window.location.pathname };
    return;
  }
  if (sameAsLive(url) || url.pathname !== window.location.pathname) return;
  // The caller's own form, so a relative `?query` stays relative exactly as it was written.
  window.history.replaceState(state, "", href);
}

/** The shell's navigation-pending provider reports each change of its pending state here. */
export function setNavigationPending(next: boolean): void {
  pending = next;
  if (next || deferred === null) return;
  const held = deferred;
  deferred = null;
  if (window.location.pathname === held.path) mirrorUrl(held.href, held.state);
}
