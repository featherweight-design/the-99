import { sql } from "drizzle-orm";
import { db } from "../../db";
import type { PriceFact } from "./price";

type Row = {
  oracle_id: string;
  price_cents: number | null;
  price_cents_foil: number | null;
  price_cents_etched: number | null;
  as_of: string;
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
 * 3. `newestAsOf` IS ITS OWN SCALAR. Taken from this join it would be null
 *    whenever no passed oracle id matched — which is exactly the none-priced
 *    deck, the case where the strip's provenance line still has to render.
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

  const [rows, newest] = await Promise.all([
    db.execute<Row>(sql`
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
        (pp.as_of = (select max(as_of) from printing_prices)) desc,
        (pp.price_cents is null),
        coalesce(pp.price_cents, pp.price_cents_foil, pp.price_cents_etched) asc,
        pp.scryfall_id
    `),
    db.execute<{ as_of: string | null }>(
      sql`select max(as_of) as as_of from printing_prices`,
    ),
  ]);

  const prices = new Map<string, PriceFact>();
  for (const row of rows.rows) {
    prices.set(row.oracle_id, {
      cents: row.price_cents,
      foilCents: row.price_cents_foil,
      etchedCents: row.price_cents_etched,
      asOf: new Date(row.as_of),
    });
  }

  const newestAsOf = newest.rows[0]?.as_of ?? null;
  return { prices, newestAsOf: newestAsOf ? new Date(newestAsOf) : null };
}
