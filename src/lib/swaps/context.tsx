"use client";

/**
 * What a deck page's swap surfaces need to know: that the tools are on, which deck this is, and the
 * limit it marks against. Mounted by the deck page ONLY when `SWAP_TOOLS_ENABLED` is set, so a
 * surface reading `null` draws nothing of the swap tools. That is how the flag reaches a row
 * without threading a prop through every component between the page and it.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import type { DeckDetailCard } from "../decks/grouping";
import { effectiveLimit } from "./limit";

export type SwapTools = {
  deckId: string;
  /** The deck's name, for the stand-ins sheet's `replacing, in {deck}`. */
  deckName: string;
  /** The deck's own limit, in cents; null for the $10 default. */
  storedLimitCents: number | null;
  /** The limit rows are marked against: the stored one, or the default. */
  limitCents: number;
  /** The takes made on this visit, each drawn in its cut row's slot until it is undone. */
  receipts: SwapReceipt[];
  addReceipt: (r: SwapReceipt) => void;
  dropReceipt: (swapId: string) => void;
  /**
   * The row whose stand-ins sheet is open, as it was when pressed. Held here rather than by the row,
   * because a take removes the row from the list and the sheet has to outlive it to show `taken`.
   */
  standIns: DeckDetailCard | null;
  /** The sheet was opened from the card modal's door, so it sits over that card (addendum §3). */
  standInsFromCard: boolean;
  openStandIns: (card: DeckDetailCard, from?: "row" | "card") => void;
  closeStandIns: () => void;
  /** Speak a sentence in the page's swap live region, which outlives the control that spoke it. */
  announce: (text: string) => void;
};

/**
 * What a take leaves on the Shopping list. It lives for the visit, like any client cache here: the
 * swap itself is stored (`deck_swaps`) and Undo swap reads it back by id, but the receipt is the
 * page's note that it happened, and a reload shows the deck as it now stands.
 */
export type SwapReceipt = {
  swapId: string;
  /** The deck the take was made on. A take that lands after the builder moved to another deck is dropped. */
  deckId: string;
  cutOracleId: string;
  cut: string;
  add: string;
  /**
   * The cut's row as the list drew it at the take. The list files the receipt with its own sectioning
   * rules, so it lands where the row sat in either grouping, and the name sort compares the real card.
   */
  cutCard: DeckDetailCard;
  /** From the take's own read, never the list's (audit note). */
  free: boolean;
  /** Copies of the cut still in the draft: the row stays and the receipt sits under it. */
  cutLeft: number;
};

const SwapToolsContext = createContext<SwapTools | null>(null);

export function SwapToolsProvider({
  deckId,
  deckName,
  storedLimitCents,
  children,
}: {
  deckId: string;
  deckName: string;
  storedLimitCents: number | null;
  children: ReactNode;
}) {
  // The builder survives a client navigation from one deck to another, and so does this provider.
  // A receipt belongs to the deck its take was made on, so the list is held WITH its deck: a new deck
  // starts an empty list during render (deck B never paints once with deck A's), and a take that lands
  // afterwards is checked inside the state update, against the deck the list is for at that moment.
  // A ref updated after render would leave a window where a late take still passes.
  const [held, setHeld] = useState<{ deckId: string; receipts: SwapReceipt[] }>({ deckId, receipts: [] });
  const [standIns, setStandIns] = useState<{ card: DeckDetailCard; fromCard: boolean } | null>(null);
  if (held.deckId !== deckId) {
    setHeld({ deckId, receipts: [] });
    setStandIns(null);
  }
  const receipts = held.receipts;
  const openStandIns = useCallback(
    (card: DeckDetailCard, from: "row" | "card" = "row") => setStandIns({ card, fromCard: from === "card" }),
    [],
  );
  const closeStandIns = useCallback(() => setStandIns(null), []);
  const [announcement, setAnnouncement] = useState("");
  const addReceipt = useCallback(
    (r: SwapReceipt) =>
      setHeld((h) => (r.deckId !== h.deckId ? h : { ...h, receipts: [...h.receipts.filter((x) => x.swapId !== r.swapId), r] })),
    [],
  );
  const dropReceipt = useCallback(
    (swapId: string) => setHeld((h) => ({ ...h, receipts: h.receipts.filter((x) => x.swapId !== swapId) })),
    [],
  );
  const value = useMemo(
    () => ({
      deckId, deckName, storedLimitCents, limitCents: effectiveLimit(storedLimitCents),
      receipts, addReceipt, dropReceipt,
      standIns: standIns?.card ?? null, standInsFromCard: standIns?.fromCard ?? false,
      openStandIns, closeStandIns, announce: setAnnouncement,
    }),
    [deckId, deckName, storedLimitCents, receipts, addReceipt, dropReceipt, standIns, openStandIns, closeStandIns],
  );
  return (
    <SwapToolsContext.Provider value={value}>
      {children}
      <span className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</span>
    </SwapToolsContext.Provider>
  );
}

/** The deck's swap tools, or null when the flag is off (or outside a deck page). */
export function useSwapTools(): SwapTools | null {
  return useContext(SwapToolsContext);
}
