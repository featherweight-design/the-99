"use client";
// What a deck surface calls to change or look up anything, handed down rather than imported: the row's writes (remove, the
// basics stepper, undo), the two parts that write or read per-player data (the auto tag, the other-ways press), and the
// description box's `[[` card lookup (the Analysis empty state). The builder shell, which holds every one of these, mounts
// `LIVE_ROW_WIRING` (`deck-row-wiring-live.ts`) around everything it draws, and a host that draws a writable row or the
// description box without it gets dead controls, so any new such host mounts it too. A surface that draws them with no wiring
// (the landing demo) gets rows whose presses do nothing, no per-player parts, and a box whose lookup finds nothing. Types only
// here: this file imports no action, so these can be read by a surface that may not reach one.

import { createContext, useContext, type ReactNode } from "react";

import type { addCardToDeck, removeCardFromDeck, setBasicQuantity } from "../../app/decks/actions";
import type { OtherWaysPress } from "../social/spare-markers";
import type { searchDescriptionCards } from "../cards/description-tag-search";
import type { AutoTag } from "./auto-tag";

export type DeckRowWiring = {
  removeCard: typeof removeCardFromDeck;
  setBasicQuantity: typeof setBasicQuantity;
  addCard: typeof addCardToDeck;
  /** The `[[` card lookup of a deck's description box (the Analysis empty state). */
  searchDescriptionCards: typeof searchDescriptionCards;
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
