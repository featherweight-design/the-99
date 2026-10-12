// The line's sentence, in the summary's short form (plan `plan-added-copy-2026-10-12`). Pure, so
// the words are tested apart from the row that draws them.
import { addedCopyCopy as copy } from "../copy/added-copy";
import type { WentRow } from "./arrivals";
import type { ContestedCard } from "./summary-read";

/**
 * Where a card's copies went, as the receipt froze it. Null when there is nothing to say (no deck
 * took or read a copy, or a deck's frozen name is gone): the row then falls back to the shipped
 * per-deck rows rather than drawing a blank.
 */
export function wentSentence(went: WentRow, deckNames: Record<string, string>): string | null {
  const names = went.decks.map((d) => deckNames[d.deckId] ?? "");
  if (went.decks.length === 0 || names.some((name) => name === "")) return null;
  if (went.kind === "soft") {
    return names.length === 1 ? copy.row.freeForBrew(names[0]) : copy.row.freeForBrews(names.length);
  }
  if (went.kind !== "held") return null;
  if (names.length === 1) {
    return went.decks[0].picked ? copy.row.goesToEarlier(names[0]) : copy.row.goesTo(names[0]);
  }
  return went.decks.every((d) => d.copies === 1) ? copy.row.goesToMany(names) : copy.row.goesToManyUneven(names);
}

/**
 * The line after a Change, from the card the pick read back: the deck the player gave the copy to.
 * Null when no deck holds a pick (the player cleared it), and the row keeps its frozen sentence.
 */
export function pickedSentence(card: ContestedCard): string | null {
  const picked = card.claimants.find((c) => c.granted > 0);
  return picked ? copy.row.goesToPicked(picked.deckName) : null;
}
