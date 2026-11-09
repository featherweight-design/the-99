"use client";
// What the demo's drawing halves need around them, and nothing that writes. The deck wiring is the explicit inert one
// (`INERT_ROW_WIRING`, #2723): every write refuses or does nothing and the per-player parts draw nothing. The card details
// context is the demo's own: a press asks the host to open the card, read-only, from the fixture's data; nothing else about a
// signed-in session exists here. A control that wrote anywhere would be a bug the nothing-saved probe catches.

import { useMemo, type ReactNode } from "react";

import { CardDetailContext, type CardDetailContextValue } from "../../cards/card-detail-context";
import { DeckRowWiringProvider, INERT_ROW_WIRING } from "../../decks/deck-row-wiring";
import { HoverPreviewProvider } from "../../decks/hover-preview";

const NO_IDS: ReadonlySet<string> = new Set();
const noop = () => {};
const noopRelease = () => noop;

/** The context value of a surface with no modal state of its own: `open` hands the card to `onOpen`. */
export function demoCardDetail(onOpen: (oracleId: string) => void, openOracleId: string | null): CardDetailContextValue {
  return {
    deckId: null,
    deckOracleIds: NO_IDS,
    open: (oracleId) => onOpen(oracleId),
    pendingOracleId: null,
    openOracleId,
    sessionActive: false,
    revealing: false,
    setSiblings: noop,
    evict: noop,
    close: noop,
    prefetch: () => undefined,
    registerSheet: noopRelease,
    registerDoor: noopRelease,
    registerReceiptLink: noopRelease,
  };
}

export function DemoProviders({ onOpenCard, openOracleId, children }: { onOpenCard: (oracleId: string) => void; openOracleId: string | null; children: ReactNode }) {
  const value = useMemo(() => demoCardDetail(onOpenCard, openOracleId), [onOpenCard, openOracleId]);
  return (
    <DeckRowWiringProvider value={INERT_ROW_WIRING}>
      <CardDetailContext.Provider value={value}>
        <HoverPreviewProvider className="contents">{children}</HoverPreviewProvider>
      </CardDetailContext.Provider>
    </DeckRowWiringProvider>
  );
}
