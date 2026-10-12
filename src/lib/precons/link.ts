/**
 * A deck's link to the precon it was built from (R3 addendum, handoff `HANDOFF-R3 · built-from
 * link.md`): the suggestion the shared rule offers and the deck page's picker, as pure functions
 * over what `link-read.ts` counts. The link itself is `decks.built_from_precon`; the suggestion is
 * computed at read and never stored (lock 2), so a linked deck has none.
 *
 * Client-safe: no database import, so the strip and the pickers can take the types and the key.
 */
import { meetsSharedRule } from "./shared";

/** One plain precon beside one deck: the counts the strip, the confirm and the picker draw. */
export type PreconMatch = {
  fileName: string;
  name: string;
  setCode: string;
  releaseDate: string;
  /** The precon's commanders by name, in the feed's order. */
  commanders: string[];
  /** The lead commander's art, as every precon surface resolves it (`preconArt`). */
  leadImage: string | null;
  /** Every card the precon lists, commanders included, from `precon_cards` (never a literal 100). */
  cards: number;
  /** Its distinct non-basic cards the deck holds, commanders included, and how many it lists. */
  shared: number;
  of: number;
  sameCommanders: boolean;
};

/** What the deck page reads: the link, and for an unlinked deck the rule's suggestions and the
 *  picker's list. */
export type DeckPreconLink = { linked: string | null; suggestions: PreconMatch[]; picker: PreconMatch[] };

/** One strip names at most two precons (K15). */
export const MAX_SUGGESTIONS = 2;

const byCodePoint = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const share = (m: PreconMatch) => (m.of === 0 ? 0 : m.shared / m.of);

/** The precons the shared rule suggests: same commanders first, then by share (K15); none for a
 *  linked deck (lock 2). */
export function pickSuggestions(matches: readonly PreconMatch[], linked: string | null): PreconMatch[] {
  if (linked !== null) return [];
  return matches
    .filter((m) => meetsSharedRule(m.shared, m.of, m.sameCommanders))
    .sort((a, b) => Number(b.sameCommanders) - Number(a.sameCommanders) || share(b) - share(a)
      || b.shared - a.shared || byCodePoint(a.name, b.name))
    .slice(0, MAX_SUGGESTIONS);
}

/** The picker's list (K6): every precon sharing a card with the deck, most shared first. */
export function pickerOrder(matches: readonly PreconMatch[]): PreconMatch[] {
  return matches
    .filter((m) => m.shared > 0)
    .sort((a, b) => b.shared - a.shared || byCodePoint(b.releaseDate, a.releaseDate) || byCodePoint(a.name, b.name));
}

/** The strip's dismissal, kept in the browser per deck AND precon (G-R3-2): a different precon
 *  crossing the rule later can still suggest. */
export function suggestionDismissKey(deckId: string, fileName: string): string {
  return `the99:precon-suggestion-dismissed:${deckId}:${fileName}`;
}
