// The all-decks shopping roll-up.
//
// Two surfaces read this and they must agree: a deck tile's detail row
// (`3 to buy · $18.40`) and Home's Commitments row (`18 · $94.80`). They are
// the same computation at two scopes, so they are one function — computing the
// total separately is how the two come to disagree.
//
// Not to be confused with `./shopping`, which is the deck-detail Shopping
// filter's predicate over one already-loaded decklist. That one is deliberately
// narrow and does not query; this one is the roll-up over every deck a player
// owns. Neither imports the other.
//
// COPIES, NOT DISTINCT CARDS, and deliberately double-counted across decks: a
// card wanted by two decks and owned in zero copies is two copies to buy.
//
// "To buy" is the seniority question, not the ownership one, and the rows come
// from `loadDeckBuyRows` so that this roll-up, the status pill and a deck's own
// Shopping list are one definition. A card owned in one copy and wanted by four
// committed decks is three copies to buy: the oldest deck is holding the one
// that exists. Counting only cards owned in zero copies — which this did — made
// the tile disagree with the deck page it links to.
//
// An unpriced copy is NOT free. The feed omits out-of-stock cards rather than
// listing them at zero, so `summarisePrices` counts them against the
// denominator and not into the total — `pricedCopies` is what makes that
// visible to a caller that wants to say "12 of 15 priced".
//
// Basics are excluded, as they are from every other Shopping surface
// (`isShoppingCard`) and from the availability model. A deck's fill never buys
// them, so counting an unowned Forest here would put a cost on this roll-up
// that no deck's own Shopping list shows.

import { loadDeckBuyRows, type DeckBuyRow } from "./availability-query";
import { summarisePrices, type PricedCard } from "./price";
import { loadPrices, priceFor, type PriceRead } from "./price-query";
import { readHeldPricePicks } from "./printings";

export type DeckShopping = { copies: number; cents: number; pricedCopies: number };

export type ShoppingRollup = {
  /** Keyed by deck id. A deck whose cards are all owned is absent, not zero. */
  byDeck: Map<string, DeckShopping>;
  total: DeckShopping;
};

/**
 * A fresh object each time. A shared constant would hand every caller with an
 * empty roll-up the same reference, and one caller mutating its `total` would
 * silently change what the next one reads.
 */
const empty = (): DeckShopping => ({ copies: 0, cents: 0, pricedCopies: 0 });

export function sumShopping(values: Iterable<DeckShopping>): DeckShopping {
  let copies = 0;
  let cents = 0;
  let pricedCopies = 0;
  for (const v of values) {
    copies += v.copies;
    cents += v.cents;
    pricedCopies += v.pricedCopies;
  }
  return { copies, cents, pricedCopies };
}

/**
 * `deckIds` narrows which decks are ANSWERED FOR, not which decks the seniority
 * model considers — a deck's bill depends on what every other deck is holding,
 * so that half is always user-wide. `total` is then the total over the decks
 * asked about, which is the whole collection when nothing is passed.
 */
export async function loadShoppingRollup(
  userId: string,
  deckIds: string[] | undefined,
  /** The reader's resolved switches (`requestSwitchEnv`), for the claim model and the printing picks. */
  env: NodeJS.ProcessEnv,
): Promise<ShoppingRollup> {
  const rows = await loadDeckBuyRows(userId, deckIds, undefined, env);
  if (rows.length === 0) return { byDeck: new Map(), total: empty() };
  return rollupBuyRows(rows, await readBuyRowPrices(userId, rows, env));
}

/**
 * The prices every buy row is drawn at. Each deck's held printing picks ride in the one read
 * (deck printings), and every row is priced through its OWN deck's pick: a card two decks picked
 * differently is two figures, so a deck tile's figure and Home's total agree with that deck's own
 * Shopping rows. Shared with the all-decks cart (`cart-read.ts`), which reads it apart from the
 * rows so a failed price read still leaves the cart its rows.
 */
export async function readBuyRowPrices(
  userId: string,
  rows: DeckBuyRow[],
  env: NodeJS.ProcessEnv,
): Promise<PriceRead> {
  const picks = await readHeldPricePicks(userId, [...new Set(rows.map((r) => r.deckId))], env);
  return loadPrices([...new Set(rows.map((r) => r.oracleId))], picks);
}

/** The roll-up over rows already priced: one summary per deck, and their sum. */
export function rollupBuyRows(rows: DeckBuyRow[], read: PriceRead): ShoppingRollup {
  const { newestAsOf } = read;
  const perDeck = new Map<string, PricedCard[]>();
  for (const row of rows) {
    const list = perDeck.get(row.deckId) ?? [];
    list.push({ quantity: row.quantity, price: priceFor(read, row.deckId, row.oracleId) });
    perDeck.set(row.deckId, list);
  }

  const byDeck = new Map<string, DeckShopping>();
  for (const [deckId, pricedCards] of perDeck) {
    const summary = summarisePrices(pricedCards, newestAsOf);
    byDeck.set(deckId, {
      copies: summary.totalCopies,
      cents: summary.totalCents,
      pricedCopies: summary.pricedCopies,
    });
  }

  return { byDeck, total: sumShopping(byDeck.values()) };
}
