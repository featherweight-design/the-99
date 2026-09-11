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
// stack. So: ask the platform where the platform can answer, and fall back to the
// patch that degrades quietly where it cannot.

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
let installed = false;

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

/** The fallback's half of the job: a same-document push or replace, which emits
    no event of its own. Installed only where the Navigation API is absent, and
    only once — see this file's header for why it delegates rather than composes,
    and what it costs if something patches over it later. */
function wrapHistory() {
  for (const name of ["pushState", "replaceState"] as const) {
    const original = window.history[name];
    window.history[name] = function observed(
      this: History,
      ...args: Parameters<History[typeof name]>
    ) {
      const result = original.apply(this, args);
      notify();
      return result;
    };
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
    if (navigation) navigation.addEventListener("currententrychange", notify);
    else wrapHistory();
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
    () => window.location.search.replace(/^\?/, ""),
    () => serverQuery,
  );
}

