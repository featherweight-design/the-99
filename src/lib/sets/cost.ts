// What finishing a set costs, and what that figure leaves out.
//
// The four price cases are NOT restated here. `priceState` and `priceOf` in
// src/lib/decks/price.ts already own what a null price means, including the distinction
// between a printing the feed has never stocked and one whose last known price is a row
// nobody is selling against. A second classifier would be a second source of truth.

import { priceOf, priceState, type PriceFact } from "../decks/price";

/** One missing cell, with whatever the price table holds for its printing. */
export type MissingCell = { price?: PriceFact | null };

export type CostToComplete = {
  /** Summed over live priced and foil-only cells only. */
  totalCents: number;
  /** How many of the missing cells that total covers. */
  pricedCount: number;
  /** How many cells are missing in all. */
  missingCount: number;
  /** Missing cells the feed has never carried at all. */
  absentCount: number;
  /** Missing cells the feed carries with no usable price — stocked, but not costable. */
  inconclusiveCount: number;
  /** Missing cells whose last known price is a row nobody is selling against now. */
  soldOutCount: number;
};

/**
 * One cell's costable figure, or null when it has none: the price of a `priced` row, the foil
 * price of a `foilOnly` one, and nothing for `soldOut` or `absent`. The figure the total below
 * sums, named so the set page's price ORDER (H16) reads the same number rather than a second
 * opinion about which rows count.
 */
export function livePriceCents(
  price: PriceFact | null | undefined,
  newestAsOf: Date | null,
): number | null {
  return price ? priceOf(price, priceState(price, newestAsOf)) : null;
}

/**
 * A cell whose price is `soldOut` contributes nothing. Its row is a last known price for
 * something nobody is currently selling, and quoting it would put a number in a total the
 * reader cannot actually spend. A `foilOnly` cell does contribute, at its foil price —
 * dropping it would undercount a card that is genuinely for sale.
 *
 * The figure always states what it covers: the total is "over pricedCount of missingCount",
 * never a bare sum that silently treats an uncostable card as zero.
 */
export function costToComplete(
  missing: MissingCell[],
  newestAsOf: Date | null,
): CostToComplete {
  let totalCents = 0;
  let pricedCount = 0;
  let absentCount = 0;
  let soldOutCount = 0;
  let inconclusiveCount = 0;

  for (const cell of missing) {
    const state = priceState(cell.price, newestAsOf);
    const value = livePriceCents(cell.price, newestAsOf);
    if (value !== null) {
      totalCents += value;
      pricedCount += 1;
      continue;
    }
    // Three histories, not two. `priceState` returns `absent` both for a card the feed
    // has never carried and for a live row whose three price columns are all null; only
    // the first was never stocked, and saying so about the second is a claim about
    // ManaPool that its own row contradicts.
    if (state === "soldOut") soldOutCount += 1;
    else if (cell.price) inconclusiveCount += 1;
    else absentCount += 1;
  }

  return {
    totalCents, pricedCount, missingCount: missing.length,
    absentCount, soldOutCount, inconclusiveCount,
  };
}
