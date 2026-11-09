"use client";
// What a deck row calls to change anything, handed down rather than imported: the writes (remove, the basics stepper, undo)
// and the two parts that write or read per-player data (the auto tag, the other-ways press). The builder shell, which holds
// every row that writes, mounts `LIVE_ROW_WIRING` (`deck-row-wiring-live.ts`) around its rows, and a host that draws a
// writable row without it gets a dead one, so any new such host mounts it too. A surface that draws the row with no wiring
// (the landing demo) gets a row whose presses do nothing and whose per-player parts are absent. Types only here: this file
// imports no action, so the row can be read by a surface that may not reach one.

import { createContext, useContext, type ReactNode } from "react";

import type { addCardToDeck, removeCardFromDeck, setBasicQuantity } from "../../app/decks/actions";
import type { OtherWaysPress } from "../social/spare-markers";
import type { AutoTag } from "./auto-tag";

export type DeckRowWiring = {
  removeCard: typeof removeCardFromDeck;
  setBasicQuantity: typeof setBasicQuantity;
  addCard: typeof addCardToDeck;
  AutoTag: typeof AutoTag;
  OtherWaysPress: typeof OtherWaysPress;
};

const DeckRowWiringContext = createContext<DeckRowWiring | null>(null);

export function DeckRowWiringProvider({ value, children }: { value: DeckRowWiring | null; children: ReactNode }) {
  return <DeckRowWiringContext.Provider value={value}>{children}</DeckRowWiringContext.Provider>;
}

/** The host's wiring, or null where none is mounted: a row there changes nothing. */
export function useDeckRowWiring(): DeckRowWiring | null {
  return useContext(DeckRowWiringContext);
}
