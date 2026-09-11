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
// 2. `popstate` alone, where it does not (Firefox, today). That covers back and
//    forward, which is the case the bug report named, and leaves the same-route
//    link navigation reading stale until the next render — which is what the
//    whole app did before this file existed.
//
// What it does NOT do is wrap `history.pushState`. That was written first and is
// the obvious approach, and it is wrong here: Next's router installs its own
// wrappers around the same two methods, and a patch that composes with a patch
// composes badly. An assignment landing after this one replaces it silently and
// every navigation afterwards goes unobserved; an accessor that captures a later
// assignment instead RECURSES, because the code installing that patch reads the
// current method first — getting this wrapper — and then delegates to it. The
// test that proved this blew the stack. Two patchers cannot both be outermost.

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

function subscribe(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  listeners.add(listener);
  if (!installed) {
    installed = true;
    const navigation = navigationApi();
    if (navigation) navigation.addEventListener("currententrychange", notify);
    // `popstate` either way. With the Navigation API it is redundant and
    // harmless — `notify` only ever re-reads the URL — and without it, it is the
    // whole of what this store can see.
    window.addEventListener("popstate", notify);
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

