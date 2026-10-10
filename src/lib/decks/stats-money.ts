// The Money and ownership card's figures (Deck stats card c). Pure: no database import.
//
// THE PARTITION IS THE SHOPPING PILL'S. The deck is split three ways, by copies: basic lands
// (never priced, never counted to buy), the Shopping basket (`isShoppingCard`, plus the
// commanders `commanderShoppingRows` bills), and everything else, which reads as owned. So the
// "to buy" figure here is the `Shopping N` pill's count and the price strip's total, from the
// same rows through the same `summarisePrices`, and an add or a sweep moves all three in one
// frame. A copy that is proxied is acquired (the Shopping predicate says so) and reads as owned.
//
// PRICES ARE THE BUY TAG'S. Every row already carries the fact the tag draws (`loadPrices`: the
// cheapest in-stock printing today), so this card prices a card the way the tag does. When deck
// printings land and a row's fact becomes its pick's (the pick if in stock, else the cheapest in
// stock, else sold out), this card follows with no change here.
//
// An unpriced copy is never free: it counts against the denominator and into no total, so the
// card says "N of M copies priced" rather than a figure that looks complete.

import { priceOf, priceQualifier, priceState, summarisePrices, type PricedCard } from "./price";
import { isBasicLand, type DeckDetailCard } from "./grouping";

export const PRICIEST_COUNT = 5;

export type MoneyGroup = { copies: number; cents: number; pricedCopies: number };

export type PriciestCard = {
  oracleId: string;
  name: string;
  /** The unit price in cents, or null where the card has none (not stocked, or sold out). */
  cents: number | null;
  /** `foil` or `etched` where the figure belongs to that printing; the buy tag's qualifier. */
  qualifier: string | null;
  toBuy: boolean;
};

export type MoneyStats = {
  /** Every copy drawn as a square: owned, basics and to buy. */
  total: number;
  basics: number;
  owned: MoneyGroup;
  toBuy: MoneyGroup;
  /** Owned and to buy together: every priced copy, over the copies that could be priced. */
  value: { cents: number; pricedCopies: number; copies: number };
  priciest: PriciestCard[];
};

type MoneyRow = Pick<DeckDetailCard, "oracleId" | "name" | "typeLine" | "quantity" | "price">;

/**
 * `commanders` are the commander rows (`commanderAsRow`), `cards` the 99, and `shopping` the
 * basket the pill counts (commanders first, then the list rows): the same array the strip sums.
 */
export function moneyStats(
  input: { cards: readonly MoneyRow[]; commanders: readonly MoneyRow[]; shopping: readonly Pick<MoneyRow, "oracleId">[] },
  newestAsOf: Date | null,
): MoneyStats | null {
  const buying = new Set(input.shopping.map((c) => c.oracleId));
  const all = [...input.commanders, ...input.cards];
  const basics = all.filter((c) => isBasicLand(c.typeLine));
  const priceable = all.filter((c) => !isBasicLand(c.typeLine));
  const buy = priceable.filter((c) => buying.has(c.oracleId));
  const own = priceable.filter((c) => !buying.has(c.oracleId));

  const group = (rows: readonly MoneyRow[]): MoneyGroup => {
    const s = summarisePrices(rows as readonly PricedCard[], newestAsOf);
    return { copies: s.totalCopies, cents: s.totalCents, pricedCopies: s.pricedCopies };
  };
  const owned = group(own);
  const toBuy = group(buy);
  const basicCopies = basics.reduce((n, c) => n + c.quantity, 0);
  const total = owned.copies + toBuy.copies + basicCopies;
  if (total === 0) return null;

  const priced: PriciestCard[] = priceable.map((c) => {
    const state = priceState(c.price, newestAsOf);
    return {
      oracleId: c.oracleId,
      name: c.name,
      cents: c.price ? priceOf(c.price, state) : null,
      qualifier: c.price ? priceQualifier(c.price, state) : null,
      toBuy: buying.has(c.oracleId),
    };
  });
  // Priced cards, dearest first; a card with no price only fills a slot the priced ones leave,
  // and the card to buy comes first among them, since it is the one a reader wants a price for.
  const byName = (a: PriciestCard, b: PriciestCard) => a.name.localeCompare(b.name);
  const withPrice = priced.filter((p) => p.cents !== null).sort((a, b) => (b.cents as number) - (a.cents as number) || byName(a, b));
  const without = priced.filter((p) => p.cents === null).sort((a, b) => Number(b.toBuy) - Number(a.toBuy) || byName(a, b));

  return {
    total,
    basics: basicCopies,
    owned,
    toBuy,
    value: {
      cents: owned.cents + toBuy.cents,
      pricedCopies: owned.pricedCopies + toBuy.pricedCopies,
      copies: owned.copies + toBuy.copies,
    },
    priciest: [...withPrice, ...without].slice(0, PRICIEST_COUNT),
  };
}
