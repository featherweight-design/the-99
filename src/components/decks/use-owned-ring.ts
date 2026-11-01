"use client";
// The deck row's brief ring (add a card from anywhere, READINESS O9; boards D5, D-D3, S4, K7): a row whose card turns
// owned under it, after a save from card details, search or Add cards anywhere on the page, rings for a moment in
// `--success` so the eye finds what changed (its dot filled, its $ gone). A row drawn owned for a card the dock's bridge
// just saved and the deck just accepted rings too (`noteJustOwned`, K7): it subscribes, since the optimistic row is
// already on screen when the add's answer arrives.
//
// The duration is not drawn ("ringed briefly"). Two seconds is long enough to be found after the sheet slides away and
// short enough not to read as a state. It is an edge, not an animation, so reduced motion draws it the same.

import { useEffect, useState, useSyncExternalStore } from "react";
import { forgetJustOwned, isJustOwned, subscribeJustOwned } from "../../lib/decks/just-owned";

export const OWNED_RING_MS = 2_000;

/** The board's ring: the deck row's inset edge (`.drow.lit`). */
export const OWNED_RING_EDGE = "inset 0 0 0 1.5px var(--success)";

/**
 * True while the row should ring. `owned` is the collection fact (`card.owned`), never the drawn dot: a proxy tag
 * cleared or set moves the dot with no save, and must not ring. The caller decides whether a ringing row draws it.
 */
export function useOwnedRing(deckId: string, oracleId: string, owned: boolean): boolean {
  // The card turned owned under the row. Adjusted during render, React's pattern for state that follows a prop's
  // change: the frame that fills the dot is the frame that rings it. Turning unowned (an Undo) takes the ring away. A
  // row reused for another deck or card (a route that reconciles rather than remounts) starts over without ringing:
  // only the same card on the same deck turning owned is a save.
  const [flipped, setFlipped] = useState(false);
  const [seen, setSeen] = useState({ deckId, oracleId, owned });
  if (seen.deckId !== deckId || seen.oracleId !== oracleId) {
    setSeen({ deckId, oracleId, owned });
    setFlipped(false);
  } else if (seen.owned !== owned) {
    setSeen({ deckId, oracleId, owned });
    setFlipped(owned);
  }
  useEffect(() => {
    if (!flipped) return;
    const t = window.setTimeout(() => setFlipped(false), OWNED_RING_MS);
    return () => window.clearTimeout(t);
  }, [flipped]);

  // The dock's note (K7). Spent once the ring has run its full length, never on unmount (see just-owned.ts): a row
  // that leaves inside the window hands what is left to the row that stands in for it, and the lapse ends it.
  const noted = useSyncExternalStore(
    subscribeJustOwned,
    () => isJustOwned(deckId, oracleId),
    () => false,
  );
  const fromNote = owned && noted;
  useEffect(() => {
    if (!fromNote) return;
    const t = window.setTimeout(() => forgetJustOwned(deckId, oracleId), OWNED_RING_MS);
    return () => window.clearTimeout(t);
  }, [fromNote, deckId, oracleId]);

  return flipped || fromNote;
}
