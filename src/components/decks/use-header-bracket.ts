"use client";

import { useMemo, useState } from "react";

import { slotDeck } from "../../lib/bracket/slot";
import type { Bracket } from "../../lib/bracket/types";
import { isReachablePermits } from "../../lib/bracket/verdict-head";
import type { DeckProfile } from "../../lib/profile/types";

/**
 * The deck header's bracket: the permitted range to draw, or null for no chip.
 *
 * TWO SOURCES, the newest winning: the analysis the page was served with (`storedPermits`) and
 * one the reader pressed for during the visit (`readyProfile`). Each is held beside the DECK and
 * the card list it was read against, and returned while the DECK is still the one on screen.
 *
 * - An edit during the visit HOLDS the chip (ruling 4, Hugh 2026-09-23), as the tile and a reload
 *   do: the header keeps the bracket the deck was last read at, and the Analysis tab says it is
 *   stale. The card list is still tracked, to refuse a press answered for a list edited mid-flight.
 * - A route change to another deck changes the deck id. The shell outlives that change, and two
 *   decks can hold the same list, so the card list alone would carry deck A's chip onto deck B.
 *
 * Adjusted during render, React's pattern for state derived from a changed input, so a stale chip
 * never paints once before being corrected.
 */
export function useHeaderBracket({
  deckId,
  cards,
  storedPermits,
  readyProfile,
  loading,
}: {
  deckId: string;
  cards: readonly { oracleId: string; quantity: number }[];
  storedPermits: Bracket[] | null;
  readyProfile: DeckProfile | null;
  /** A press is in flight. The card list at its START is the one its answer describes. */
  loading: boolean;
}): Bracket[] | null {
  const key = useMemo(
    () => `${deckId}|${cards.map((c) => `${c.oracleId}:${c.quantity}`).sort().join(",")}`,
    [deckId, cards],
  );
  const [source, setSource] = useState<{ permits: Bracket[]; key: string; pressed?: boolean } | null>(
    storedPermits && isReachablePermits(storedPermits) ? { permits: storedPermits, key } : null,
  );
  const [seenStored, setSeenStored] = useState(storedPermits);
  const [seenProfile, setSeenProfile] = useState(readyProfile);
  // THE KEY A PRESS WAS MADE AGAINST. An edit while the press is in flight leaves its answer
  // describing the list before the edit, so it is not taken at all. A ready profile with no press behind it (a stored one, peeked on tab open)
  // is filed under the list on screen when it arrives.
  const [pressKey, setPressKey] = useState<string | null>(loading ? key : null);
  const [wasLoading, setWasLoading] = useState(loading);
  if (loading !== wasLoading) {
    setWasLoading(loading);
    if (loading) setPressKey(key);
  }
  if (readyProfile !== seenProfile) {
    setSeenProfile(readyProfile);
    // An answer to a press whose list was edited while it was in flight is not taken: the server
    // refused to store it too, and the bracket already held stays.
    if (readyProfile && (pressKey ?? key) === key) {
      setSource({ permits: slotDeck(readyProfile).permits, key, pressed: true });
    }
    setPressKey(null);
  }
  if (storedPermits !== seenStored) {
    // A revalidated page is the server's answer for the deck as it now stands, EXCEPT over a
    // press made against the list still on screen: a revalidation that started before that press
    // completed carries the row from before it, and would rewind or clear a fresher answer.
    setSeenStored(storedPermits);
    if (!(source?.pressed && source.key === key)) {
      setSource(storedPermits && isReachablePermits(storedPermits) ? { permits: storedPermits, key } : null);
    }
  }
  // THE CHIP HOLDS (ruling 4, Hugh 2026-09-23): an edit leaves the last analyzed bracket drawn,
  // and the Analysis tab is where staleness is said. Only a change of DECK retires it.
  return source && source.key.startsWith(`${deckId}|`) ? source.permits : null;
}
