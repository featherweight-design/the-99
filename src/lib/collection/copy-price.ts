// What one card on `/collection` is worth, for the Price sort (design handoff
// `design_handoff_the99_collection_price`, R1).
//
// THE SAME READER AS CARD DETAILS. Each owned printing is resolved through `priceFor`, the
// function the card modal prices its printing with, against the same `PrintingPrices` index
// `loadPrintingPrices` builds, so a holding's identity (catalog id, else set and collector
// number, else the one printing its set holds) and the ambiguity rules are one definition.
// Liveness is `priceState`'s: a row whose `as_of` is not the table's newest is sold out, because
// the ingest upserts and never deletes, so a frozen row is not a stocked printing (AGENTS.md,
// `printing_prices`).
//
// ONE DIFFERENCE, AND IT IS THE RULING: the figure is the copy's FINISH (Hugh, 2026-10-11). A
// foil copy is worth the foil price, an etched copy the etched one, a non-foil copy the non-foil
// one. Card details prices a printing, not a copy, and draws the non-foil figure with a foil one
// only for a printing stocked in no other finish (`priceOf`); for a non-foil copy the two agree.
//
// The card is worth its MOST VALUABLE copy, in both directions, so reversing the sort reverses
// the list exactly; a sum across copies is a must-not.
//
// COMPACT ON THE WIRE. `/collection` ships every card the reader owns, and the sort runs in the
// browser over all of them, so the figure rides every card as one integer:
//
//   absent          nothing reached us: no read, or no copy names a printing. Silent.
//   -1              the store answered no, and a copy's printing was stocked once (sold out).
//   -2              the store answered no, and has never carried the printing (or the finish).
//   n >= 0          cents * 8 + (4 when an owned printing or finish is priced below the top
//                   one, so a cheaper copy exists) + the top copy's finish (0 non-foil, 1 foil,
//                   2 etched). Two copies at the same price are not `max`: nothing is cheaper.

import { priceFor, type PrintingPrices } from "../cards/price-lookup";
import { priceState, type PriceFact } from "../decks/price";
import type { BrowsePrinting, Finish } from "./browse";

export type CardPrice =
  | { cents: number; finish: "foil" | "etched" | null; mixed: boolean }
  | { none: "soldOut" | "neverStocked" };

const SOLD_OUT = -1;
const NEVER_STOCKED = -2;
const FINISH_CODE: Record<Finish, number> = { nonfoil: 0, foil: 1, etched: 2 };
const FINISHES = Object.keys(FINISH_CODE) as Finish[];

/** The figure one finish of a live printing carries, or null when the store does not stock it. */
function finishCents(fact: PriceFact, finish: Finish): number | null {
  if (finish === "foil") return fact.foilCents;
  if (finish === "etched") return fact.etchedCents;
  return fact.cents;
}

/** The card's price, encoded. `undefined` is silence, and is never written onto a card. */
export function cardPriceCode(
  printings: readonly Pick<BrowsePrinting, "scryfallId" | "setCode" | "collectorNumber" | "finishes">[],
  prices: PrintingPrices | null | undefined,
): number | undefined {
  if (!prices) return undefined;
  return copiesPriceCode(
    printings.map((p) => ({ read: priceFor(prices, p), finishes: FINISHES.filter((f) => (p.finishes[f] ?? 0) > 0) })),
    prices.newestAsOf,
  );
}

/**
 * The same figure over copies whose printing has already been read: each a `priceFor` answer
 * and the finishes held of it. The set page reads its prices per printing id and calls this
 * for an owned cell, so a cell's figure is the one `/collection` draws for those copies.
 */
export function copiesPriceCode(
  copies: readonly { read: { fact: PriceFact | null } | null; finishes: readonly Finish[] }[],
  newestAsOf: Date | null,
): number | undefined {
  let best: { cents: number; finish: Finish } | null = null;
  let cheapest: number | null = null;
  let soldOut = false;
  // A NO from the store: it never carried the printing, or carries it without this copy's finish.
  // A live row with nothing in any price column is not one (`priceState` reads it `absent`, and
  // `sets/cost.ts` calls it inconclusive), so it stays silent rather than saying `no stock`.
  let neverStocked = false;
  for (const { read, finishes } of copies) {
    if (read === null) continue;
    if (read.fact === null) {
      neverStocked = true;
      continue;
    }
    const state = priceState(read.fact, newestAsOf);
    if (state === "soldOut") {
      soldOut = true;
      continue;
    }
    if (state === "absent") continue;
    for (const finish of finishes) {
      const cents = finishCents(read.fact, finish);
      if (cents === null) {
        neverStocked = true;
        continue;
      }
      if (cheapest === null || cents < cheapest) cheapest = cents;
      if (best === null || cents > best.cents) best = { cents, finish };
    }
  }
  if (best !== null) return best.cents * 8 + ((cheapest ?? best.cents) < best.cents ? 4 : 0) + FINISH_CODE[best.finish];
  if (soldOut) return SOLD_OUT;
  return neverStocked ? NEVER_STOCKED : undefined;
}

/** The encoded price, read back. Null is silence. */
export function readCardPrice(code: number | undefined): CardPrice | null {
  if (code === undefined) return null;
  if (code === SOLD_OUT) return { none: "soldOut" };
  if (code < 0) return { none: "neverStocked" };
  const finish = code % 4;
  return {
    cents: Math.floor(code / 8),
    finish: finish === 1 ? "foil" : finish === 2 ? "etched" : null,
    mixed: (code & 4) !== 0,
  };
}

/** What the Price sort orders by: the figure in cents, or null for every card with none. */
export function priceSortCents(code: number | undefined): number | null {
  return code === undefined || code < 0 ? null : Math.floor(code / 8);
}
