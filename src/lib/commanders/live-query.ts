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
// THE PATCH IS DELIBERATE, AND IT DELEGATES. `pushState` and `replaceState` fire
// no event, and Next's router uses them for client navigations — including the
// one this exists to catch. The wrapper calls through to whatever it found,
// which is Next's own patched version, so it observes rather than intercepts. It
// is installed once per document and never removed: restoring the original would
// clobber any patch installed after it, and there is nothing to reclaim.

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
let installed = false;

function notify() {
  for (const listener of listeners) listener();
}

function install() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("popstate", notify);
  for (const name of ["pushState", "replaceState"] as const) {
    const original = window.history[name];
    window.history[name] = function patched(this: History, ...args: Parameters<History[typeof name]>) {
      const result = original.apply(this, args);
      notify();
      return result;
    };
  }
}

function subscribe(listener: () => void): () => void {
  install();
  listeners.add(listener);
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

