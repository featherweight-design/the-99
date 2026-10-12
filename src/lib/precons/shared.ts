/**
 * Whether a reader's deck shares a precon's list (design G2, as ruled 2026-10-11 by the
 * orchestrator for Hugh): a comparison computed at read, never a stored link.
 *
 * Two paths, because a precon build either keeps its commander and gets tuned hard, or swaps the
 * commander and keeps most of the list. Measured on staging against Hugh's 21 decks (the share of
 * the precon's distinct non-basic cards the deck holds, its commanders included):
 *
 * | Deck | Precon | Share | Commanders |
 * |---|---|---|---|
 * | HD - Eldrazi | Eldrazi Unbound | 86% | same |
 * | HD Tune - Sultai Arisen | Sultai Arisen | 84% | same |
 * | HD Tune - Prismari Artistry | Prismari Artistry | 82% | same |
 * | HD Tune - Blood Rites | Blood Rites | 81% | same |
 * | HD Tune - Scrappy Survivors | Scrappy Survivors | 72% | same |
 * | HD Tune - Counter Intelligence | Counter Intelligence | 70% | swapped |
 * | HD Tune - Mutant Menace | Mutant Menace | 48% | same |
 * | HD - Gishath (not a precon build) | Veloci-Ramp-Tor | 43% | different |
 * | HD - Zombies (not a precon build) | Wretched Ranks | 19% | same |
 *
 * Every other pairing read 24% or less.
 */

/** The share a deck needs when it leads with the precon's own commanders. */
export const SHARED_SAME_COMMANDERS = 0.4;
/** The share a deck needs under any commanders. */
export const SHARED_ANY_COMMANDERS = 0.6;

export type SharedMatch = { shared: number; sameCommanders: boolean };

/**
 * `precon` is the precon's distinct non-basic oracle ids, commanders included; `deck` is every
 * oracle id the deck holds, commanders included. Null when the deck does not share the precon.
 */
export function sharedWith(
  precon: { cards: ReadonlySet<string>; commanders: readonly string[] },
  deck: { cards: ReadonlySet<string>; commanders: readonly string[] },
): SharedMatch | null {
  if (precon.cards.size === 0) return null;
  let shared = 0;
  for (const id of precon.cards) if (deck.cards.has(id)) shared++;
  const share = shared / precon.cards.size;
  const sameCommanders = precon.commanders.length === deck.commanders.length
    && precon.commanders.every((id) => deck.commanders.includes(id));
  if (sameCommanders ? share >= SHARED_SAME_COMMANDERS : share >= SHARED_ANY_COMMANDERS) {
    return { shared, sameCommanders };
  }
  return null;
}
