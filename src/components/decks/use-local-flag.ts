"use client";

import { useCallback, useSyncExternalStore } from "react";

// A per-deck "this has happened, don't show it again" bit, persisted in
// localStorage rather than a DB column: a cosmetic one-shot does not justify a
// migration, and the failure mode is benign — a second device shows it once more.
//
// useSyncExternalStore rather than useState + useEffect: localStorage is an
// external store, and reading it into state inside an effect is the
// cascading-render pattern the lint rule rejects. The server snapshot is
// `true` — "assume seen" — so the server render and the hydration pass never
// contain the thing being gated, and a returning user cannot catch a flash of it.
//
// Extracted from useCelebrated when the arrival strip needed the same
// mechanism. Two copies of this would be two chances to get the storage-throws
// fallback or the cross-tab filter subtly different.

// Keyed by storage key, so a write wakes only the components watching that key —
// same reason the cross-tab handler below filters on it.
const listeners = new Map<string, Set<() => void>>();

// Storage can throw outright — Safari private mode, blocked storage, full
// quota. Dismissal is driven entirely by the write below, so an unguarded
// throw does not merely lose persistence: it leaves the surface on screen with
// a dismiss button that cannot work. This session-scoped set is the fallback,
// so the surface is always dismissable and the worst case degrades to "shows
// again next visit" rather than "never goes away".
const setThisSession = new Set<string>();

function subscribeToKey(key: string, onStoreChange: () => void): () => void {
  const forKey = listeners.get(key) ?? new Set<() => void>();
  forKey.add(onStoreChange);
  listeners.set(key, forKey);
  // Cross-tab: acting in one tab should settle the other. Filtered to this
  // key — every other deck's write fires the same global event, and an
  // unfiltered handler would re-render every open builder tab.
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === key) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    forKey.delete(onStoreChange);
    if (forKey.size === 0) listeners.delete(key);
    window.removeEventListener("storage", onStorage);
  };
}

function readFlag(key: string): boolean {
  if (setThisSession.has(key)) return true;
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

/** Returns `[isSet, set]` for the given localStorage key. Write-once; nothing unsets it. */
export function useLocalFlag(key: string): [boolean, () => void] {
  const subscribe = useCallback(
    (onStoreChange: () => void) => subscribeToKey(key, onStoreChange),
    [key],
  );

  const value = useSyncExternalStore(
    subscribe,
    () => readFlag(key),
    () => true,
  );

  const set = useCallback(() => {
    setThisSession.add(key);
    try {
      localStorage.setItem(key, "1");
    } catch {
      // Persistence is best-effort; the session set already settled the UI.
    }
    for (const listener of listeners.get(key) ?? []) listener();
  }, [key]);

  return [value, set];
}
