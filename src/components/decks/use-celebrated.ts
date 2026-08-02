"use client";

import { useCallback, useSyncExternalStore } from "react";
import { celebrationKey } from "../../lib/decks/celebration";

// Whether this deck's 99/99 reveal has already been shown. Persisted in
// localStorage rather than a DB column: a cosmetic "has been celebrated" flag
// does not justify a migration, and the failure mode is benign — a second
// device shows the reveal once more.
//
// useSyncExternalStore rather than useState + useEffect: localStorage is an
// external store, and reading it into state inside an effect is the cascading
// -render pattern the lint rule rejects. The server snapshot is `true` —
// "assume seen" — so the server render and the hydration pass never contain a
// kaiju, and a returning user cannot catch a flash of celebration.

const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  // Cross-tab: dismissing in one tab should settle the other.
  window.addEventListener("storage", onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

/** Returns `[alreadyCelebrated, markCelebrated]`. */
export function useCelebrated(deckId: string): [boolean, () => void] {
  const key = celebrationKey(deckId);

  const celebrated = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(key) === "1",
    () => true,
  );

  const markCelebrated = useCallback(() => {
    localStorage.setItem(key, "1");
    for (const listener of listeners) listener();
  }, [key]);

  return [celebrated, markCelebrated];
}
