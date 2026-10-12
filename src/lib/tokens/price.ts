import { sql } from "drizzle-orm";
import { db } from "../../db";
import { parseAsOf, type PriceFact } from "../decks/price";
import type { ManapoolLine } from "../manapool/links";

/**
 * A token's price: the deck price rule (`src/lib/decks/price-query.ts`, `loadPrices`) applied to a
 * token's printings, read from `token_printing_prices` (plan `2026-10-11-tokens-for-my-deck.md`,
 * PR 2). One printing is chosen per token and it is BOTH the one pictured and the one the Mana Pool
 * link names, so what the player sees is what the link buys.
 *
 * The rule, in this order, every clause load-bearing for the reason the card read gives:
 *   1. a live printing (its `as_of` is the table's newest) before a stale one. The ingest never
 *      deletes, so a sold-out printing keeps its last row, and a stale row reaching the caller means
 *      no printing of that token is live: `priceState` draws it `sold out`;
 *   2. real non-foil stock before foil-only AT ANY PRICE, so a $50 non-foil is never displaced by a
 *      $2.10 foil and `foilOnly` means the token is genuinely foil-only;
 *   3. then the cheapest;
 *   4. then the printing id, without which the figure wanders between reads whenever two tie.
 *
 * `compareTokenOffers` is the tested statement of that order and the SQL below is its twin; the
 * test pins the SQL's `order by` to the same four clauses, the way `compareForRepresentative` and
 * `setRepresentativePrintings` are kept in step.
 */
export type TokenOffer = {
  scryfallId: string;
  priceCents: number | null;
  priceCentsFoil: number | null;
  priceCentsEtched: number | null;
  asOf: Date;
};

export function compareTokenOffers(a: TokenOffer, b: TokenOffer, newest: Date | null): number {
  const live = (o: TokenOffer) => (newest !== null && o.asOf.getTime() === newest.getTime() ? 0 : 1);
  if (live(a) !== live(b)) return live(a) - live(b);
  const foilOnly = (o: TokenOffer) => (o.priceCents === null ? 1 : 0);
  if (foilOnly(a) !== foilOnly(b)) return foilOnly(a) - foilOnly(b);
  const figure = (o: TokenOffer) => o.priceCents ?? o.priceCentsFoil ?? o.priceCentsEtched;
  const fa = figure(a), fb = figure(b);
  // A row with no figure at all sorts last, as a null does ascending in Postgres.
  if (fa !== fb) return fa === null ? 1 : fb === null ? -1 : fa - fb;
  return a.scryfallId < b.scryfallId ? -1 : a.scryfallId > b.scryfallId ? 1 : 0;
}

/**
 * The pictured and sent printing of a token: where its figure came from, and what a link names.
 * `setCode` and `collectorNumber` are SCRYFALL's (they find the picture); the `product*` fields are
 * MANA POOL's own identity for the thing the figure prices, and they are what a link names (42% of
 * priced token printings differ between the two). Null on a row written before they were stored.
 */
export type TokenPriceFact = PriceFact & {
  printing: {
    scryfallId: string;
    setCode: string;
    collectorNumber: string;
    productName: string | null;
    productSet: string | null;
    productNumber: string | null;
  };
};

const SENDABLE_NUMBER = /^[0-9A-Za-z-]+$/;

/**
 * The line a Mana Pool link sends for one token: Mana Pool's name, set and number for the product
 * the price belongs to, so the line is placed on exactly that product. A row without them sends the
 * token's name alone, which Mana Pool still places by name (it just cannot promise the printing).
 */
export function tokenManapoolLine(tokenName: string, quantity: number, fact: TokenPriceFact): ManapoolLine {
  const { productName, productSet, productNumber } = fact.printing;
  // A number outside letters, digits and hyphens (`1★`, a promo mark) is one Mana Pool's mass entry
  // cannot place EXACTLY: measured 2026-10-11, `Angel // Demon [PHEL] 1★` is placed by name and
  // counted not-exact, with or without the star. The name alone is placed and counted exact, so the
  // line degrades to the name rather than naming a printing the page will not accept.
  // A missing name is treated like a missing coordinate: Mana Pool's coordinates beside Scryfall's name
  // would name a product the line does not match (a double-faced token card is `A // B`, not `A`).
  if (!productName || !productSet || !productNumber || !SENDABLE_NUMBER.test(productNumber)) return { name: productName ?? tokenName, quantity };
  return { name: productName, quantity, printing: { setCode: productSet, collectorNumber: productNumber } };
}

export type TokenPriceRead = {
  prices: Map<string, TokenPriceFact>;
  /** The newest `as_of` among token prices; the yardstick `priceState` compares each fact to. */
  newestAsOf: Date | null;
};

type Timestamp = string | Date;
type Row = {
  newest_as_of: Timestamp | null;
  token_oracle_id: string | null;
  price_cents: number | null;
  price_cents_foil: number | null;
  price_cents_etched: number | null;
  as_of: Timestamp | null;
  scryfall_id: string | null;
  set_code: string | null;
  collector_number: string | null;
  product_name: string | null;
  product_set: string | null;
  product_number: string | null;
};

/**
 * The query, exported so a test can render it. ONE STATEMENT for the reason the card read gives: the
 * newest `as_of` and every row measured against it must share a snapshot, or an ingest committing
 * between two reads would price every token as sold out at once. `left join … on true` keeps the
 * newest row when nothing matched. It does NOT filter to live rows, or `soldOut` would be
 * unreachable and its test vacuous.
 */
export function tokenPriceQuery(tokenOracleIds: string[]) {
  // sql.param, as in `loadPrices`: a bare array in a drizzle template expands to a parenthesised list.
  const only = sql.param(tokenOracleIds);
  return sql`
    with newest as (
      select max(as_of) as as_of from token_printing_prices
    ),
    chosen as (
      select distinct on (tp.token_oracle_id)
        tp.token_oracle_id,
        pp.price_cents,
        pp.price_cents_foil,
        pp.price_cents_etched,
        pp.as_of,
        tp.scryfall_id,
        tp.set_code,
        tp.collector_number,
        pp.product_name,
        pp.product_set,
        pp.product_number
      from token_printings tp
      join token_printing_prices pp on pp.scryfall_id = tp.scryfall_id
      where tp.token_oracle_id = any(${only}::uuid[])
      order by
        tp.token_oracle_id,
        (pp.as_of = (select as_of from newest)) desc,
        (pp.price_cents is null),
        coalesce(pp.price_cents, pp.price_cents_foil, pp.price_cents_etched) asc,
        pp.scryfall_id
    )
    select newest.as_of as newest_as_of, chosen.*
    from newest
    left join chosen on true
  `;
}

export async function loadTokenPrices(tokenOracleIds: string[]): Promise<TokenPriceRead> {
  if (tokenOracleIds.length === 0) return { prices: new Map(), newestAsOf: null };
  const { rows } = await db.execute<Row>(tokenPriceQuery(tokenOracleIds));
  const prices = new Map<string, TokenPriceFact>();
  for (const row of rows) {
    // The placeholder row of nothing-priced: a newest timestamp and no token.
    if (row.token_oracle_id === null || row.as_of === null || row.scryfall_id === null
      || row.set_code === null || row.collector_number === null) continue;
    prices.set(row.token_oracle_id, {
      cents: row.price_cents,
      foilCents: row.price_cents_foil,
      etchedCents: row.price_cents_etched,
      asOf: parseAsOf(row.as_of),
      printing: {
        scryfallId: row.scryfall_id,
        setCode: row.set_code,
        collectorNumber: row.collector_number,
        productName: row.product_name,
        productSet: row.product_set,
        productNumber: row.product_number,
      },
    });
  }
  const newest = rows[0]?.newest_as_of ?? null;
  return { prices, newestAsOf: newest ? parseAsOf(newest) : null };
}
