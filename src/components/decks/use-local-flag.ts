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

// Keys set while something was watching them, whatever storage did with the
// write. Distinct from `setThisSession` above, which holds only the keys storage
// lost: this one answers "did we set it while this surface was mounted", not "is
// storage working". Backs the `setHere` return of useLocalFlag, and is retired
// with the last listener for the key — see `subscribeToKey`.
const setWhileWatched = new Set<string>();

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
    if (forKey.size === 0) {
      listeners.delete(key);
      // Nobody is watching this key any more, so the surface that set it has
      // gone. "Set while watched" is a property of that visit, not of the
      // session: leave it standing and a later visit to the same deck would
      // read it as still-in-progress and show the one-shot again.
      setWhileWatched.delete(key);
    }
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

/**
 * Returns `[isSet, set, setHere]` for the given localStorage key. Write-once;
 * nothing unsets it.
 *
 * `setHere` is "this visit is the one that set it" — true from the write until
 * the last watcher unmounts, so a later visit starts false. It exists because a
 * surface that burns its own flag on sight would otherwise vanish in the same
 * frame it appeared: `isSet` goes true, the gate closes, and the user never
 * reads it. Kept in the store rather than in component state or a ref so the
 * value is render-safe — setting state inside the effect that burns the flag is
 * the cascading-render pattern, and a ref cannot be read during render.
 */
export function useLocalFlag(key: string): [boolean, () => void, boolean] {
  const subscribe = useCallback(
    (onStoreChange: () => void) => subscribeToKey(key, onStoreChange),
    [key],
  );

  const value = useSyncExternalStore(
    subscribe,
    () => readFlag(key),
    () => true,
  );

  // Server snapshot `false`: nothing has been set during a render that has not
  // happened in a browser yet. Pairs with `value`'s "assume seen" so neither
  // the server render nor hydration can contain the gated surface.
  const setHere = useSyncExternalStore(
    subscribe,
    () => setWhileWatched.has(key),
    () => false,
  );

  const set = useCallback(() => {
    setWhileWatched.add(key);
    // Added before the write, not after: if setItem throws, the UI has already
    // settled and the dismiss button has done its job.
    setThisSession.add(key);
    try {
      localStorage.setItem(key, "1");
      // Read back rather than trusting the write — a quota-evicting store can
      // accept setItem and drop the value. Only a confirmed read retires the
      // fallback entry, so the set holds exactly the keys storage lost.
      if (localStorage.getItem(key) === "1") setThisSession.delete(key);
    } catch {
      // Persistence is best-effort; the session set already settled the UI.
    }
    for (const listener of listeners.get(key) ?? []) listener();
  }, [key]);

  return [value, set, setHere];
}
