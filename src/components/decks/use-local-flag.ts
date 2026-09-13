"use client";

import { useCallback, useSyncExternalStore } from "react";
import { readRaw, subscribeToKey, writeRaw } from "../ui/local-store";

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
// The store underneath — subscription, cross-tab handler, the session fallback
// for a storage that throws, the read back that catches a quota-evicting
// write — lives in ../ui/local-store, shared with useTopOffDraft and useStoredView.

/**
 * Returns `[isSet, set]` for the given localStorage key.
 */
export function useLocalFlag(key: string): [boolean, () => void] {
  const subscribe = useCallback(
    (onStoreChange: () => void) => subscribeToKey(key, onStoreChange),
    [key],
  );

  // Server snapshot is `true` — "assume seen" — so neither the server render
  // nor hydration can contain the gated surface.
  const value = useSyncExternalStore(
    subscribe,
    () => readRaw(key) === "1",
    () => true,
  );

  const set = useCallback(() => writeRaw(key, "1"), [key]);

  return [value, set];
}
