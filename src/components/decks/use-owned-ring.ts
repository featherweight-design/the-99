"use client";
// The deck row's brief ring (add a card from anywhere, READINESS O9; boards D5, D-D3, S4, K7): a row whose card turns
// owned under it, after a save from card details, search or Add cards anywhere on the page, rings for a moment in
// `--success` so the eye finds what changed (its dot filled, its $ gone). A row that lands already owned rings too when
// the dock's bridge saved its card a moment before (`noteJustOwned`, K7).
//
// The duration is not drawn ("ringed briefly"). Two seconds is long enough to be found after the sheet slides away and
// short enough not to read as a state. It is an edge, not an animation, so reduced motion draws it the same.

import { useEffect, useState } from "react";
import { forgetJustOwned, isJustOwned } from "../../lib/decks/just-owned";

export const OWNED_RING_MS = 2_000;

/** The board's ring: the deck row's inset edge (`.drow.lit`). */
export const OWNED_RING_EDGE = "inset 0 0 0 1.5px var(--success)";

/** True while the row should draw the ring. `owned` is the row's DRAWN ownership (its dot), not the raw flag. */
export function useOwnedRing(oracleId: string, owned: boolean): boolean {
  const [ringed, setRinged] = useState(() => owned && isJustOwned(oracleId));
  // Adjusted during render, React's pattern for state that follows a prop's change: the frame that fills the dot is
  // the frame that rings it. Turning unowned (an Undo) takes the ring away with the dot.
  const [was, setWas] = useState(owned);
  if (was !== owned) {
    setWas(owned);
    setRinged(owned);
  }

  useEffect(() => {
    if (!ringed) return;
    const t = window.setTimeout(() => {
      forgetJustOwned(oracleId);
      setRinged(false);
    }, OWNED_RING_MS);
    return () => window.clearTimeout(t);
  }, [ringed, oracleId]);

  return ringed;
}
