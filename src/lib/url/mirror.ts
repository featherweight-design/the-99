// Writing the address bar without navigating: every `history.replaceState` a page makes to mirror
// its own state (a filter, a sort, a view, an open card) or to strip a one-time parameter.
//
// Next patches `history.replaceState` so the router adopts whatever URL it is given, and adopting
// a URL while a navigation is pending DROPS that navigation. Measured on main (1f's startup
// diagnostic, 2026-09-29): a push to /decks, then /collection's and /discover's mirror effects
// re-wrote the page's OWN current URL ~700ms later, and in 3 of 4 cases the reader never left.
// So every mirror goes through here, under two rules:
//
//   1. A write equal to the live URL is not made. It changes nothing a reader can see, and it is
//      the write that was adopted over the pending push.
//   2. A write is made only on the page it describes. Its path must be the live one, and the live
//      one must be the path the router has committed. A browser Back or Forward changes the
//      address before Next commits the new page, so a late write from the page being left would
//      otherwise land over the destination, whether it named its own path or read the live one.

// The route the router has committed, as the shell's provider reads it from `usePathname()`; null
// outside the provider. It stays on the page being left until Next commits a Back or Forward,
// while `location` has already moved to the destination.
let routePath: string | null = null;

const sameAsLive = (url: URL) =>
  url.pathname === window.location.pathname &&
  url.search === window.location.search &&
  url.hash === window.location.hash;

/** Mirror `href` into the address bar, unless it is already there or the page has been left. */
export function mirrorUrl(href: string | URL, state: unknown = null): void {
  const url = new URL(href, window.location.href);
  if (sameAsLive(url) || url.pathname !== window.location.pathname) return;
  // The live address must be the router's own page. A mirror that builds its href from
  // `location.pathname` passes the line above by construction, so this is what stops it after a
  // Back or Forward has moved the address but not yet the page.
  if (routePath !== null && window.location.pathname !== routePath) return;
  // The caller's own form, so a relative `?query` stays relative exactly as it was written.
  window.history.replaceState(state, "", href);
}

/** The shell's navigation-pending provider reports the router's committed path here. */
export function setRoutePath(next: string | null): void {
  routePath = next;
}
