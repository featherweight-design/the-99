import { sql } from "drizzle-orm";
import { db } from "../../db";
import { parseAsOf, type PriceFact } from "./price";

// Timestamps are driver-dependent: the neon serverless driver parses
// `timestamp` to a Date, others hand back the raw string. `parseAsOf` takes
// both.
type Timestamp = string | Date;

// One shape for both halves of the answer. The newest timestamp rides on every
// row because it comes from the same statement (see 3 below); the card columns
// are null on the one row that carries nothing but that timestamp.
type Row = {
  newest_as_of: Timestamp | null;
  oracle_id: string | null;
  price_cents: number | null;
  price_cents_foil: number | null;
  price_cents_etched: number | null;
  as_of: Timestamp | null;
};

export type PriceRead = {
  prices: Map<string, PriceFact>;
  newestAsOf: Date | null;
};

/**
 * One chosen printing per oracle card. Price is keyed by PRINTING
 * (`printing_prices.scryfall_id`) and a decklist row is an ORACLE card, so
 * this is a join through `printings.oracle_id`, not a lookup.
 *
 * THREE THINGS THIS QUERY DELIBERATELY HANDLES:
 *
 * 1. IT DOES NOT FILTER TO LIVE ROWS. Filtering on `as_of = max(as_of)` would
 *    make `soldOut` unreachable — every row returned would be live by
 *    construction, the `buy · sold out` tail would never render, and its test
 *    would pass vacuously. Liveness is a comparison `priceState` makes; the
 *    `order by` below only ensures a live printing is preferred where one
 *    exists, so a stale row reaching the caller means there is no live one.
 *
 * 2. `distinct on`, NOT AN AGGREGATE. `min(...) group by oracle_id` cannot hand
 *    back the winning row's other columns, and per-column `min()` would mix
 *    figures from different printings into one price that no printing has.
 *
 * 3. ONE STATEMENT, BECAUSE THE TWO HALVES MUST SHARE A SNAPSHOT. `newestAsOf`
 *    cannot be taken from the join — it would be null whenever no passed oracle
 *    id matched, which is exactly the none-priced deck, the case where the
 *    strip's provenance line still has to render. But it cannot be a second
 *    statement either, in either order: an ingest committing between the two
 *    leaves the caller comparing rows from one snapshot against a newest from
 *    another, and `priceState` reads that mismatch as `sold out` for every card
 *    at once. A single statement runs in one snapshot, so `newest` is computed
 *    once and every row is measured against the same value the caller gets.
 *    `left join … on true` is what keeps that row when nothing matched.
 *
 * The `order by` is four clauses and every one is load-bearing: live before
 * stale (see 1); real non-foil stock before foil-only AT ANY PRICE, so a $50
 * non-foil is never displaced by a $2.10 foil and `foilOnly` means the card is
 * genuinely foil-only; then cheapest; then `scryfall_id`, without which the
 * figure wanders between reads whenever two printings tie.
 *
 * A card with no row at all is simply absent from the map. Absence is not
 * free and not unknown — the feed omits out-of-stock cards rather than listing
 * them at zero, so a printing that has never been stocked in any run has never
 * appeared. `priceState` renders that as today's bare tag.
 */
export async function loadPrices(oracleIds: string[]): Promise<PriceRead> {
  if (oracleIds.length === 0) return { prices: new Map(), newestAsOf: null };

  // sql.param is load-bearing for the array. A bare `${jsArray}` in a drizzle
  // template expands to a parenthesised param LIST — `($1, $2)::uuid[]` — which
  // is a syntax error, not an array. sql.param forces the whole array into one
  // placeholder so the driver serialises it as a Postgres array literal.
  const only = sql.param(oracleIds);

  // An empty table makes `newest.as_of` null, and `pp.as_of = null` yields null
  // rather than false — which sorts with the stale rows, the harmless side. The
  // join returns nothing in that case anyway.
  const rows = await db.execute<Row>(sql`
    with newest as (
      select max(as_of) as as_of from printing_prices
    ),
    chosen as (
      select distinct on (p.oracle_id)
        p.oracle_id,
        pp.price_cents,
        pp.price_cents_foil,
        pp.price_cents_etched,
        pp.as_of
      from printings p
      join printing_prices pp on pp.scryfall_id = p.scryfall_id
      where p.oracle_id = any(${only}::uuid[])
      order by
        p.oracle_id,
        (pp.as_of = (select as_of from newest)) desc,
        (pp.price_cents is null),
        coalesce(pp.price_cents, pp.price_cents_foil, pp.price_cents_etched) asc,
        pp.scryfall_id
    )
    select
      newest.as_of as newest_as_of,
      chosen.oracle_id,
      chosen.price_cents,
      chosen.price_cents_foil,
      chosen.price_cents_etched,
      chosen.as_of
    from newest
    left join chosen on true
  `);

  const prices = new Map<string, PriceFact>();
  for (const row of rows.rows) {
    // The placeholder row of a none-priced deck: a newest timestamp and no card.
    if (row.oracle_id === null || row.as_of === null) continue;
    prices.set(row.oracle_id, {
      cents: row.price_cents,
      foilCents: row.price_cents_foil,
      etchedCents: row.price_cents_etched,
      asOf: parseAsOf(row.as_of),
    });
  }

  const newestRaw = rows.rows[0]?.newest_as_of ?? null;
  return { prices, newestAsOf: newestRaw ? parseAsOf(newestRaw) : null };
}
