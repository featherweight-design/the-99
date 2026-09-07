// The all-decks shopping roll-up.
//
// Two surfaces read this and they must agree: a deck tile's detail row
// (`3 unowned · $18.40`) and Home's Commitments row (`18 · $94.80`). They are
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
// An unpriced copy is NOT free. The feed omits out-of-stock cards rather than
// listing them at zero, so `summarisePrices` counts them against the
// denominator and not into the total — `pricedCopies` is what makes that
// visible to a caller that wants to say "12 of 15 priced".

import { and, eq, notExists, sql } from "drizzle-orm";
import { db } from "../../db";
import { collectionItems, deckCards, decks } from "../../db/schema";
import { summarisePrices, type PricedCard } from "./price";
import { loadPrices } from "./price-query";

export type DeckShopping = { copies: number; cents: number; pricedCopies: number };

export type ShoppingRollup = {
  /** Keyed by deck id. A deck whose cards are all owned is absent, not zero. */
  byDeck: Map<string, DeckShopping>;
  total: DeckShopping;
};

const EMPTY: DeckShopping = { copies: 0, cents: 0, pricedCopies: 0 };

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

export async function loadShoppingRollup(userId: string): Promise<ShoppingRollup> {
  // Every deck line whose card the player owns no copy of. `notExists` rather
  // than a left join with a null check: the join would need a distinct, and a
  // distinct over quantities is a bug waiting to be written.
  const rows = await db
    .select({
      deckId: deckCards.deckId,
      oracleId: deckCards.oracleId,
      quantity: deckCards.quantity,
    })
    .from(deckCards)
    .innerJoin(decks, eq(decks.id, deckCards.deckId))
    .where(
      and(
        eq(decks.userId, userId),
        notExists(
          db
            .select({ one: sql`1` })
            .from(collectionItems)
            .where(
              and(
                eq(collectionItems.userId, userId),
                eq(collectionItems.oracleId, deckCards.oracleId),
              ),
            ),
        ),
      ),
    );

  if (rows.length === 0) return { byDeck: new Map(), total: EMPTY };

  const { prices, newestAsOf } = await loadPrices([...new Set(rows.map((r) => r.oracleId))]);

  const perDeck = new Map<string, PricedCard[]>();
  for (const row of rows) {
    const list = perDeck.get(row.deckId) ?? [];
    list.push({ quantity: row.quantity, price: prices.get(row.oracleId) ?? null });
    perDeck.set(row.deckId, list);
  }

  const byDeck = new Map<string, DeckShopping>();
  for (const [deckId, cards] of perDeck) {
    const summary = summarisePrices(cards, newestAsOf);
    byDeck.set(deckId, {
      copies: summary.totalCopies,
      cents: summary.totalCents,
      pricedCopies: summary.pricedCopies,
    });
  }

  return { byDeck, total: sumShopping(byDeck.values()) };
}
