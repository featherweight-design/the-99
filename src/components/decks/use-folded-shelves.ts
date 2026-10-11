"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { readRaw, subscribeToKey, writeRaw } from "../ui/local-store";
import { encodeFoldedShelves, parseFoldedShelves, shelfFoldKey } from "../../lib/decks/shelf-fold";

/**
 * Which Consider shelves this deck has folded (`STATES-consider-tiles.md` s5),
 * persisted per deck so it survives a reload and a tab switch.
 *
 * The raw string is the `useSyncExternalStore` snapshot rather than the parsed
 * set — same reason `useTopOffDraft` reads a string: comparing by identity
 * against a fresh `Set` built on every read would re-render forever. The
 * server snapshot is `null` — no shelf folded — so SSR and the first paint
 * always draw every shelf open; a returning reader's fold state applies once
 * hydration reads storage (the known, undrawn flash the handoff's gap report
 * accepts rather than fixing with a cookie).
 */
export function useFoldedShelves(deckId: string): {
  isFolded: (key: string) => boolean;
  toggleFold: (key: string) => void;
} {
  const { has, toggle } = useStoredKeys(shelfFoldKey(deckId));
  return useMemo(() => ({ isFolded: has, toggleFold: toggle }), [has, toggle]);
}

/**
 * A set of keys persisted under one localStorage key, the store behind `useFoldedShelves` and
 * Mana Balance's open sections. The server snapshot is the empty set.
 */
export function useStoredKeys(storageKey: string): {
  has: (key: string) => boolean;
  toggle: (key: string) => void;
} {
  const subscribe = useCallback(
    (onStoreChange: () => void) => subscribeToKey(storageKey, onStoreChange),
    [storageKey],
  );
  const raw = useSyncExternalStore(subscribe, () => readRaw(storageKey), () => null);
  const keys = useMemo(() => parseFoldedShelves(raw), [raw]);

  const has = useCallback((key: string) => keys.has(key), [keys]);

  // Reads storage fresh rather than closing over `keys`: two keys toggled
  // in the same tick (unlikely, but this is the one place two writers could
  // race) would otherwise both compute their `next` from the same stale set
  // and the second write would silently drop the first's change.
  const toggle = useCallback(
    (key: string) => {
      const next = new Set(parseFoldedShelves(readRaw(storageKey)));
      if (next.has(key)) next.delete(key);
      else next.add(key);
      writeRaw(storageKey, encodeFoldedShelves(next));
    },
    [storageKey],
  );

  return useMemo(() => ({ has, toggle }), [has, toggle]);
}
