"use client";
// The live query string, as an external store.
//
// A lane whose controls mirror themselves into the URL has to know when the URL
// moves for a reason that is NOT one of those controls — the primary nav
// pointing back at the route the reader is already on, a link elsewhere on the
// page. React cannot tell it: such a navigation keeps the component mounted with
// identical props, and `useSearchParams` does not fire for it either (measured;
// the lane corrected only on the next unrelated render). A server-side `key`
// cannot either, because the key is fixed when the tree is first rendered and
// that same tree is what the navigation restores.
//
// Left unnoticed it is not merely cosmetic. The rack builds each control's next
// state from the params it was rendered with, so after such a navigation the
// first colour or search interaction writes the PREVIOUS lane back into a URL the
// navigation had just reset — the stale state resurrecting itself.
//
// So the URL is read the way any other outside-React value is: through
// `useSyncExternalStore`, over the two events that can move it.
//
// HOW IT NOTICES, in the order it prefers.
//
// 1. The Navigation API. `navigation.currententrychange` fires for every way the
//    URL moves — a router's `pushState`, a back, a replace — and asking the
//    platform costs nothing and patches nothing. Chromium and Safari have it.
// 2. Where it does not (Firefox, today): `popstate`, plus a plain delegating
//    wrapper around `pushState` and `replaceState`. `popstate` alone would miss
//    the case this file exists for — browsers do not emit it for a same-document
//    push, which is exactly what the nav link's reset is — so the wrapper is the
//    only notification available there.
//
// THE WRAPPER IS THE FALLBACK, NOT THE MECHANISM, and the difference is the
// point. Next's router patches the same two methods, so two patchers are
// competing for outermost: an assignment landing after this one replaces it
// silently and later navigations go unobserved, which degrades to the behaviour
// this file was written to fix and never to something worse. The alternative was
// tried and is worse than the disease — an accessor that captures a later
// assignment RECURSES, because the code installing that patch reads the current
// method first, gets this wrapper, and delegates to it; the test for it blew the
// stack. So: ask the platform where the platform can answer, and where it cannot,
// wrap — and check on each read that the wrapper is still the installed one,
// re-wrapping whatever displaced it. That composes in the one direction that
// terminates.

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
let installed = false;
/** How many of this module's history wrappers are on the stack. See `observed`. */
let depth = 0;

function notify() {
  for (const listener of listeners) listener();
}

type NavigationLike = {
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
};

/** The Navigation API, where the browser has it. Typed locally because
    `lib.dom` does not carry it yet. */
function navigationApi(): NavigationLike | null {
  const candidate = (window as unknown as { navigation?: NavigationLike }).navigation;
  return candidate && typeof candidate.addEventListener === "function" ? candidate : null;
}

/** The wrappers this module installed, by method, so a displaced one can be
    told from an intact one. Empty under the Navigation API, which needs none. */
const ours = new Map<HistoryMethod, History[HistoryMethod]>();

type HistoryMethod = "pushState" | "replaceState";

/** The fallback's half of the job: a same-document push or replace, which emits
    no event of its own. Used only where the Navigation API is absent.
    Re-entrant on purpose — see `ensureObserving`. */
function wrapHistory() {
  for (const name of ["pushState", "replaceState"] as const) {
    // Only what has actually been displaced. Wrapping a method that is already
    // ours would nest a second `notify` around it, and every repair after that
    // another — so one displaced `pushState` would make every later
    // `replaceState` fire the store twice, then three times.
    if (ours.get(name) === window.history[name]) continue;
    // Whatever is installed right now, which is Next's own wrapper in the app and
    // a previous wrapper of ours if something has since patched over it. Either
    // way this delegates to it rather than replacing it.
    const current = window.history[name];
    const observed = function observed(
      this: History,
      ...args: Parameters<History[HistoryMethod]>
    ) {
      // ONE notification per write, however deep the chain has grown. Re-arming
      // cannot remove an older wrapper of ours from it: the router captured that
      // one when it patched, so the call runs
      // `new observed → router → old observed → original` and both of ours would
      // otherwise fire. The inner one returns with the depth still above zero and
      // stays quiet; only the outermost announces.
      depth += 1;
      try {
        return current.apply(this, args);
      } finally {
        depth -= 1;
        if (depth === 0) notify();
      }
    } as History[HistoryMethod];
    window.history[name] = observed;
    ours.set(name, observed);
  }
}

/**
 * Re-arms the fallback if something has patched over it.
 *
 * Two patchers cannot both be outermost, and Next's goes on SECOND on a first
 * mount — not hypothetically. It patches both methods inside the app router's
 * own `useEffect` (`next/dist/client/components/app-router.js`), and effects run
 * child before parent, so a subscription made while this component commits is
 * already installed when that effect assigns over it. Wrapping whatever is
 * installed NOW restores the order: this delegates to the router's wrapper, the
 * router's still runs first, and nothing recurses, because each wrapper closes
 * over the function it found rather than over a live lookup.
 *
 * Called from two places, and it needs both. From `subscribe`, on a macrotask,
 * which lands after the mount effects that displace it — that is the first-mount
 * case, closed before any navigation can happen. And from the store's read, which
 * runs on every render of every subscriber, for a patch installed later still: one
 * identity comparison, and a displaced wrapper then costs the renders between the
 * patch and the next one rather than every navigation for the life of the page.
 *
 * What neither closes is a patch installed after the last render AND followed by a
 * navigation before the next one. That is a fallback's fallback — it needs a
 * browser with no Navigation API, and a router that re-patches mid-session — and
 * its cost is the behaviour this file was written to improve, one render late.
 */
function ensureObserving() {
  if (ours.size === 0) return; // the Navigation API is carrying this.
  for (const [name, wrapper] of ours) {
    if (window.history[name] !== wrapper) {
      wrapHistory();
      return;
    }
  }
}

function subscribe(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  listeners.add(listener);
  if (!installed) {
    installed = true;
    // Back and forward, in every browser and under either mechanism. With the
    // Navigation API this is redundant and harmless — `notify` only re-reads the
    // URL — and it is what the fallback leans on for a traversal.
    window.addEventListener("popstate", notify);
    const navigation = navigationApi();
    if (navigation) {
      navigation.addEventListener("currententrychange", notify);
    } else {
      wrapHistory();
      // On a macrotask, because the router patches these same two methods in its
      // own mount effect and effects run child before parent: this subscription
      // is in place before that assignment, so the wrapper installed a moment ago
      // has already been displaced by the time this runs. Nothing can navigate in
      // between.
      setTimeout(ensureObserving, 0);
    }
  }
  return () => listeners.delete(listener);
}

/**
 * The current query string, with no leading `?` — `URLSearchParams`' own
 * spelling, so it compares like for like against anything serialised that way.
 *
 * `serverQuery` is what the same reader's request carried, for the server render
 * and the hydration that follows it. Pass `useSearchParams().toString()`.
 */
export function useLiveQuery(serverQuery: string): string {
  return useSyncExternalStore(
    subscribe,
    () => {
      ensureObserving();
      return window.location.search.replace(/^\?/, "");
    },
    () => serverQuery,
  );
}

