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
 * The line after ANY chooser write, from the card that write read back (the design table's `live`
 * row): the frozen sentence is true only until the first write, and after a pick is cleared it can
 * name a pick that no longer exists.
 *
 * The new copies are the import's, capped at the live surplus over `ownedBefore`: `arrived` is
 * frozen and `owned` is live, so copies removed in another tab since are not named. A pick takes
 * new copies first, up to what the player gave it; the rest are where seniority puts them: the
 * spare first (copies no deck holds), then the junior-most committed holders. Every destination is
 * named, and `as you picked` only when the pick is the sole one. A spare that brews read is `is
 * free for`. Null when no deck holds or reads a new copy any more.
 */
export function liveSentence(card: ContestedCard): string | null {
  let left = Math.min(card.arrived, Math.max(card.owned - card.ownedBefore, 0));
  const took = new Map<string, { name: string; copies: number; picked: boolean }>();
  const picks = card.claimants.filter((c) => c.granted > 0);
  for (const c of picks) {
    const t = Math.min(c.granted, left);
    if (t > 0) took.set(c.deckId, { name: c.deckName, copies: t, picked: true });
    left -= t;
  }
  // EVERY committed deck is in the queue, a picked one included: what it holds beyond its grant
  // is seniority's, and leaving it out names a deck one copy short (A=2 with a one-copy grant read
  // as A=1). Its queue share merges with its picked one.
  const committed = card.claimants.filter((c) => !c.brew);
  const held = card.claimants.filter((c) => !c.brew || c.granted > 0).reduce((n, c) => n + c.allocated, 0);
  const spare = Math.max(card.owned - held, 0);
  let fromQueue = Math.max(left - spare, 0);
  for (const c of [...committed].reverse()) {
    if (fromQueue <= 0) break;
    const t = Math.min(Math.max(c.allocated - c.granted, 0), fromQueue);
    if (t > 0) {
      const had = took.get(c.deckId);
      took.set(c.deckId, had ? { ...had, copies: had.copies + t } : { name: c.deckName, copies: t, picked: false });
    }
    fromQueue -= t;
  }
  const decks = card.claimants.flatMap((c) => took.get(c.deckId) ?? []);
  if (decks.length === 1) return decks[0].picked ? copy.row.goesToPicked(decks[0].name) : copy.row.goesTo(decks[0].name);
  if (decks.length > 1) {
    const names = decks.map((d) => d.name);
    return decks.every((d) => d.copies === 1) ? copy.row.goesToMany(names) : copy.row.goesToManyUneven(names);
  }
  const brews = card.claimants.filter((c) => c.brew && !(c.granted > 0) && c.allocated > 0);
  if (brews.length === 1) return copy.row.freeForBrew(brews[0].deckName);
  if (brews.length > 1) return copy.row.freeForBrews(brews.length);
  return null;
}
