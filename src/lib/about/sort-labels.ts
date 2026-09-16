// The decklist's own vocabulary, re-exported for the /about figure.
//
// `DECK_SORT_LABELS` is module-private in `copy/deck-sort.ts` and the group
// toggle spells its two words inline, so a figure wanting them had no way to
// ask — which is how four of them came to be retyped into a fixture, giving
// this page its own copy of the sort vocabulary. These read the real sources
// so a rename reaches the figure.

import { deckSortOrderLabel } from "../copy/deck-sort";
import type { DeckSortKey } from "../copy/deck-sort";

/** `Name`, `Mana value`, `Price` — the label without its direction clause. */
export function deckSortLabel(key: DeckSortKey): string {
  // `deckSortOrderLabel` returns `Name · A–Z`; the figure names the ORDER, and
  // the direction is the second half of a control this page does not draw.
  return deckSortOrderLabel(key, "asc").split(" · ")[0];
}

// The grouping labels are `DECK_GROUPING_LABELS` in `copy/deck-sort.ts`, read
// by the toggle and by the figure. They were a second copy here first, which
// is the same defect this module exists to fix one line further up.
