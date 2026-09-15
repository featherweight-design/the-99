// The deck list's row order — one comparator, applied INSIDE each group.
//
// The groups are still `By type` / `By role`; this decides the rows within one
// of them and never the order of the groups themselves (handoff decision 10).
//
// Pure, and free of UI imports: `decklist.tsx` passes the key and direction it
// holds, and `grouping.ts` takes the comparator as an option.

import { priceRank, type PriceFact } from "./price";
import { printedFaceName } from "../collection/browse";
import type { DeckSortDirection, DeckSortKey } from "../copy/deck-sort";

/** What ordering a row needs. Structural, so a fixture can satisfy it. */
export type SortableCard = {
  oracleId: string;
  name: string;
  cmc: number;
  price?: PriceFact | null;
  /** The name printed on the copy this player owns, when it differs. */
  printedName?: string | null;
  /** Scryfall's layout word, so a two-faced printing sorts on its front face. */
  layout?: string | null;
};

/**
 * ON THE NAME THE ROW DRAWS, which is not always the oracle name.
 *
 * `decklist-row.tsx` renders `printedFaceName(card)` — for a live row, and for
 * the undo receipt that stands in its place — so a player whose copy is a
 * renamed printing sees that name on the list. Sorting the oracle name would
 * put those rows in a position the visible labels contradict, which is the same
 * mistake as ranking a price a row does not print. Every surface that names a
 * card on this list goes through that one resolver, so none of them can drift
 * from the order.
 *
 * By code point, never `localeCompare`, and the id after the name.
 * `localeCompare` reads whichever locale the runtime holds, and this list is
 * rendered on the server and again in the browser — a pair it orders one way in
 * Node can come back the other way for the reader. `sortDecks` spells the same
 * rule out, and PR #629 took the finding. The id is the last clause because
 * `cards.name` carries no uniqueness constraint.
 */
function byNameThenId(a: SortableCard, b: SortableCard): number {
  const left = displayName(a).toLowerCase();
  const right = displayName(b).toLowerCase();
  if (left !== right) return left < right ? -1 : 1;
  return a.oracleId < b.oracleId ? -1 : a.oracleId > b.oracleId ? 1 : 0;
}

/**
 * Price, in the asked-for direction — and **not** a negation of
 * `comparePriceDesc`.
 *
 * That was the plan's first shape, and review caught it before a line was
 * written. `comparePriceDesc` returns a positive number when `a` has no live
 * figure, so negating the whole result moves sold-out and never-stocked rows to
 * the FRONT under `asc` and reverses their own name/id tiebreak with them.
 * Reversing the order must not reverse the meaning of "we have no price for
 * this".
 *
 * So the figure-less rows are taken out first and always sort last, among
 * themselves by name; only the priced rows take the direction. `priceRank` is
 * the one definition of the figure a row draws — `price.ts` holds it and holds
 * no comparator of its own, so nothing can disagree with this one.
 */
function byPrice(
  a: SortableCard,
  b: SortableCard,
  direction: DeckSortDirection,
  newestAsOf: Date | null,
): number {
  const left = priceRank(a, newestAsOf);
  const right = priceRank(b, newestAsOf);

  // No figure: last in BOTH directions, and among themselves by name.
  if (left === null || right === null) {
    if (left === right) return byNameThenId(a, b);
    return left === null ? 1 : -1;
  }

  if (left !== right) return direction === "desc" ? right - left : left - right;
  return byNameThenId(a, b);
}

/**
 * The row comparator for one key and direction.
 *
 * `newestAsOf` is only read by `price`; the other two keys ignore it, which is
 * why it is a plain argument rather than being folded into the key.
 */
export function compareDeckCards(
  a: SortableCard,
  b: SortableCard,
  key: DeckSortKey,
  direction: DeckSortDirection,
  newestAsOf: Date | null,
): number {
  if (key === "price") return byPrice(a, b, direction, newestAsOf);
  if (key === "mana") {
    const step = a.cmc - b.cmc;
    if (step !== 0) return direction === "asc" ? step : -step;
    // Ties fall to the name in READING order whichever way the curve runs: a
    // reversed curve is a statement about mana value, not about the alphabet.
    return byNameThenId(a, b);
  }
  const step = byNameThenId(a, b);
  return direction === "asc" ? step : -step;
}

function displayName(card: SortableCard): string {
  return printedFaceName({
    name: card.name,
    printedName: card.printedName ?? null,
    layout: card.layout ?? null,
  });
}

/** Bound to one key and direction, for `Array.prototype.sort`. */
export function deckCardComparator(
  key: DeckSortKey,
  direction: DeckSortDirection,
  newestAsOf: Date | null,
): (a: SortableCard, b: SortableCard) => number {
  return (a, b) => compareDeckCards(a, b, key, direction, newestAsOf);
}
