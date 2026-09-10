"use client";

// The localStorage plumbing shared by the hooks in this directory that persist
// a per-deck fact — a dismissal (useLocalFlag) or an uncommitted selection
// (useTopOffDraft). Both need the same four behaviours, and none of them is
// obvious enough to be worth writing twice:
//
//  - a subscription, because localStorage is an external store and reading it
//    into state inside an effect is the cascading-render pattern the lint rule
//    rejects;
//  - a cross-tab listener, so acting in one tab settles the other;
//  - a session-held fallback, because storage can throw outright in Safari
//    private mode or on a full quota, and the surface still has to work;
//  - a read-back after every write, because a quota-evicting store can accept
//    setItem and drop the value.

// Keyed by storage key, so a write wakes only the components watching that key —
// same reason the cross-tab handler below filters on it.
const listeners = new Map<string, Set<() => void>>();

// What storage would not take. Holds the value rather than a bare key, so a
// caller whose value is more than one bit degrades to "kept for this session"
// rather than to nothing at all. The worst case is that the value does not
// survive the tab, which is where it stood before any of this existed.
const sessionValues = new Map<string, string>();

// Cross-tab: acting in one tab should settle the other. One listener for the
// whole map rather than one per subscriber — the event is global, so a
// per-subscriber handler would wake every one of them for every write and then
// have each decide the same thing. A null key is storage being cleared
// wholesale, which is every key at once.
function onStorage(event: StorageEvent) {
  if (event.key === null) {
    sessionValues.clear();
    for (const forKey of listeners.values()) for (const listener of forKey) listener();
    return;
  }
  // The session fallback holds what storage would not take from *this* tab. A
  // storage event is another tab writing the same key and being taken, so the
  // held value is now the older of the two — and readRaw prefers it, which
  // would leave this tab woken and still reading its own refused write.
  sessionValues.delete(event.key);
  for (const listener of listeners.get(event.key) ?? []) listener();
}

// Attached on the first subscription rather than at import: this module is a
// client module, but Next still runs it on the server to render, and there is
// no window there. Never detached: it is one listener for the life of the
// document, and the map it dispatches through is what empties.
let attached = false;

export function subscribeToKey(key: string, onStoreChange: () => void): () => void {
  const forKey = listeners.get(key) ?? new Set<() => void>();
  forKey.add(onStoreChange);
  listeners.set(key, forKey);
  if (!attached) {
    attached = true;
    window.addEventListener("storage", onStorage);
  }
  return () => {
    forKey.delete(onStoreChange);
    if (forKey.size === 0) listeners.delete(key);
  };
}

/** The stored string, or null when there is none. A store that refuses to be
 *  read is the same answer as an empty one — the caller decides what absence
 *  means for its own value. */
export function readRaw(key: string): string | null {
  const held = sessionValues.get(key);
  if (held !== undefined) return held;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Writes and wakes every subscriber to the key.
 *
 *  The session fallback is filled before the write, not after: if setItem
 *  throws, the value has already settled and the control the player clicked
 *  has already done its job. The entry is retired only on a confirmed read
 *  back, so the map holds exactly the keys storage lost. */
export function writeRaw(key: string, value: string): void {
  sessionValues.set(key, value);
  try {
    localStorage.setItem(key, value);
    if (localStorage.getItem(key) === value) sessionValues.delete(key);
  } catch {
    // Persistence is best-effort; the session map already settled the value.
  }
  for (const listener of listeners.get(key) ?? []) listener();
}

/** Drops the key from both storage and the session fallback, and wakes every
 *  subscriber. Clearing one without the other would leave the value readable
 *  through the half that was missed. */
export function removeRaw(key: string): void {
  sessionValues.delete(key);
  try {
    localStorage.removeItem(key);
  } catch {
    // Same trade as the write: the session map is already clear, so the value
    // is gone for this tab whatever storage did.
  }
  for (const listener of listeners.get(key) ?? []) listener();
}
