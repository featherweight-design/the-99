"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { readRaw, subscribeToKey, writeRaw } from "./local-store";
import { writeViewCookie } from "./view-cookie";

// Which of a `ViewToggle`'s two segments the player last chose, kept across
// visits. Both surfaces that carry the toggle held the choice for one visit
// only: `/collection` mirrored it to `?view=` and the deck builder held it in
// component state. Neither survived leaving the route, so a player who reads
// their decks as cards re-chose cards every time they opened one.
//
// localStorage rather than a column: it is a reading preference, the kind of
// fact that costs nothing to be wrong about on a second device, and a
// migration would make it a shared truth it is not.
//
// useSyncExternalStore rather than useState + useEffect, for the reason
// useLocalFlag gives: storage is an external store, and reading it into state
// inside an effect is the cascading-render pattern the lint rule rejects. The
// server snapshot is `null` — "no choice on record" — so the server render and
// the hydration pass agree, and the stored choice lands on the pass after.
// That is a visible flip for a player whose preference is not the default, and
// it is the honest one: the server has no way to know what this browser stores.

/**
 * Returns `[chosen, choose]`, where `chosen` is null until this browser has a
 * valid stored choice. The caller owns what absence means — the deck's list
 * view, or `/collection`'s width-dependent default — because only it knows.
 */
export function useStoredView<T extends string>(
  key: string,
  isValid: (value: string) => value is T,
  /**
   * OPT-IN, for a surface whose server render must draw the stored choice (`/collection`, whose
   * rows-then-grid flash was this hook's `null` server snapshot). `serverValue` is what the page
   * read from `cookie` and becomes the server snapshot, so the server and the hydration pass
   * agree on the choice rather than on its absence; every choose mirrors itself into the cookie.
   * A caller passing nothing behaves exactly as before, which the tests pin.
   */
  mirror?: { cookie: string; serverValue: T | null },
): [T | null, (next: T) => void] {
  const subscribe = useCallback(
    (onStoreChange: () => void) => subscribeToKey(key, onStoreChange),
    [key],
  );
  const serverValue = mirror?.serverValue ?? null;
  const cookie = mirror?.cookie;

  const chosen = useSyncExternalStore(
    subscribe,
    // A stored value that is no longer one of the segments — a view that was
    // renamed, or a key another build wrote — is absence, not a crash. With a mirror, the
    // cookie's answer stands in for an empty store, so a browser whose storage was cleared
    // but whose cookie survived does not flip after hydration.
    () => {
      const raw = readRaw(key);
      return raw !== null && isValid(raw) ? raw : serverValue;
    },
    () => serverValue,
  );

  // A reader who chose before the mirror existed holds the choice in storage and no cookie, so
  // the server cannot see it yet. Writing it once here makes their NEXT visit draw it. Keyed on
  // the stored value and the cookie's, so it writes only when the two disagree.
  useEffect(() => {
    if (!cookie) return;
    const raw = readRaw(key);
    if (raw !== null && isValid(raw) && raw !== serverValue) writeViewCookie(cookie, raw);
  }, [cookie, key, isValid, serverValue]);

  const choose = useCallback(
    (next: T) => {
      writeRaw(key, next);
      if (cookie) writeViewCookie(cookie, next);
    },
    [key, cookie],
  );

  return [chosen, choose];
}
