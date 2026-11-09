"use client";
// What a deck surface calls to change or look up anything, handed down rather than imported: the row's writes (remove, the
// basics stepper, undo), the two parts that write or read per-player data (the auto tag, the other-ways press), and the
// description box's `[[` card lookup (the Analysis empty state). The builder shell, which holds every one of these, mounts
// `LIVE_ROW_WIRING` (`deck-row-wiring-live.ts`) around everything it draws, and a host that draws a writable row or the
// description box without it gets dead controls, so any new such host mounts it too. A surface that draws them with no wiring
// (the landing demo) gets rows whose presses do nothing, no per-player parts, and a box whose lookup finds nothing. Types only
// here: this file imports no action, so these can be read by a surface that may not reach one.

import { createContext, useContext, type ReactNode } from "react";

import type { addCardToDeck, pullCardFromDeck, removeCardFromDeck, setBasicQuantity } from "../../app/decks/actions";
import type { OtherWaysPress } from "../social/spare-markers";
import type { searchDescriptionCards } from "../cards/description-tag-search";
import type { AutoTag } from "./auto-tag";

export type DeckRowWiring = {
  removeCard: typeof removeCardFromDeck;
  setBasicQuantity: typeof setBasicQuantity;
  addCard: typeof addCardToDeck;
  /** Pulls a card out of the deck into another (Suggested changes' Pull). */
  pullCard: typeof pullCardFromDeck;
  /** The `[[` card lookup of the Suggested changes notes box. */
  searchTuningNotesCards: (query: string) => ReturnType<typeof searchDescriptionCards>;
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

/** The explicit "this surface only draws" wiring: every write is refused or does nothing, the per-player parts draw nothing and
 *  the lookups find nothing. A surface that draws writable rows without a deck to write to (the landing demo) passes this;
 *  a missing provider is a bug and is reported (`reportMissingWiring`), never read as this. */
export const INERT_ROW_WIRING: DeckRowWiring = {
  removeCard: async () => {},
  setBasicQuantity: async () => ({ ok: false, reason: "not-in-deck" }),
  addCard: async () => ({ ok: false, message: "" }),
  pullCard: async () => ({ ok: false, message: "" }),
  searchDescriptionCards: async () => null,
  searchTuningNotesCards: async () => null,
  AutoTag: () => <></>,
  OtherWaysPress: () => <></>,
};

const told = new Set<string>();

/**
 * A writable control (or a press that writes) found no `DeckRowWiringProvider` above it. The builder shell and the review
 * page mount the live wiring; a surface that only draws the control passes `INERT_ROW_WIRING`. So a missing one is a bug:
 * said once per control in the console, and a PRESS also throws under test, so a test that forgot the provider fails
 * rather than passing over a dead button.
 */
export function reportMissingWiring(what: string, press = false): void {
  const message = `${what} needs a DeckRowWiringProvider above it: mount LIVE_ROW_WIRING (the builder shell and the review page do) or pass INERT_ROW_WIRING.`;
  if (press && process.env.NODE_ENV === "test") throw new Error(message);
  if (told.has(what)) return;
  told.add(what);
  console.error(message);
}
