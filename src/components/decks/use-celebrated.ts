"use client";

import { useCallback, useSyncExternalStore } from "react";
import { celebrationKey } from "../../lib/decks/celebration";

// Whether this deck's 99/99 reveal has already been shown. Persisted in
// localStorage rather than a DB column: a cosmetic "has been celebrated" flag
// does not justify a migration, and the failure mode is benign — a second
// device shows the reveal once more.
//
// useSyncExternalStore rather than useState + useEffect: localStorage is an
// external store, and reading it into state inside an effect is the
// cascading-render pattern the lint rule rejects. The server snapshot is
// `true` — "assume seen" — so the server render and the hydration pass never
// contain a kaiju, and a returning user cannot catch a flash of celebration.

// Keyed by celebration key, so a dismissal wakes only the builders watching
// that deck — same reason the cross-tab handler below filters on the key.
const listeners = new Map<string, Set<() => void>>();

// Storage can throw outright — Safari private mode, blocked storage, full
// quota. Dismissal is driven entirely by the write below, so an unguarded
// throw does not merely lose persistence: it leaves the band on screen with a
// dismiss button that cannot work. This session-scoped set is the fallback, so
// the reveal is always dismissable and the worst case degrades to "shows again
// next visit" rather than "never goes away".
const dismissedThisSession = new Set<string>();

function subscribeToKey(key: string, onStoreChange: () => void): () => void {
  const forKey = listeners.get(key) ?? new Set<() => void>();
  forKey.add(onStoreChange);
  listeners.set(key, forKey);
  // Cross-tab: dismissing in one tab should settle the other. Filtered to this
  // deck's key — every other deck's dismissal fires the same global event, and
  // an unfiltered handler would re-render every open builder tab.
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

function readCelebrated(key: string): boolean {
  if (dismissedThisSession.has(key)) return true;
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

/** Returns `[alreadyCelebrated, markCelebrated]`. */
export function useCelebrated(deckId: string): [boolean, () => void] {
  const key = celebrationKey(deckId);

  const subscribe = useCallback(
    (onStoreChange: () => void) => subscribeToKey(key, onStoreChange),
    [key],
  );

  const celebrated = useSyncExternalStore(
    subscribe,
    () => readCelebrated(key),
    () => true,
  );

  const markCelebrated = useCallback(() => {
    dismissedThisSession.add(key);
    try {
      localStorage.setItem(key, "1");
    } catch {
      // Persistence is best-effort; the session set already settled the UI.
    }
    for (const listener of listeners.get(key) ?? []) listener();
  }, [key]);

  return [celebrated, markCelebrated];
}
