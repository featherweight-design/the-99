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
 * the card list it was read against, and returned only while both are still the ones on screen.
 *
 * - An edit during the visit changes the card list, so the chip retires at once, as it does on the
 *   tile and on a reload, rather than drawing a bracket for cards the analysis never read.
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
  const [source, setSource] = useState<{ permits: Bracket[]; key: string } | null>(
    storedPermits && isReachablePermits(storedPermits) ? { permits: storedPermits, key } : null,
  );
  const [seenStored, setSeenStored] = useState(storedPermits);
  const [seenProfile, setSeenProfile] = useState(readyProfile);
  // THE KEY A PRESS WAS MADE AGAINST. An edit while the press is in flight leaves its answer
  // describing the list before the edit, so the answer is filed under that list and never drawn
  // over the new one. A ready profile with no press behind it (a stored one, peeked on tab open)
  // is filed under the list on screen when it arrives.
  const [pressKey, setPressKey] = useState<string | null>(loading ? key : null);
  const [wasLoading, setWasLoading] = useState(loading);
  if (loading !== wasLoading) {
    setWasLoading(loading);
    if (loading) setPressKey(key);
  }
  if (readyProfile !== seenProfile) {
    setSeenProfile(readyProfile);
    if (readyProfile) setSource({ permits: slotDeck(readyProfile).permits, key: pressKey ?? key });
    setPressKey(null);
  }
  if (storedPermits !== seenStored) {
    // A revalidated page is the server's answer for the deck as it now stands.
    setSeenStored(storedPermits);
    setSource(storedPermits && isReachablePermits(storedPermits) ? { permits: storedPermits, key } : null);
  }
  return source && source.key === key ? source.permits : null;
}
