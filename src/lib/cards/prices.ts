// Prices for one card's printings — the database half.
//
// Kept apart from `price-lookup.ts` for the reason `decks/price.ts` and
// `decks/price-query.ts` are: the modal is a client component and imports the
// lookup, so nothing it reaches may import `db`.

import { sql } from "drizzle-orm";
import { db } from "../../db";
import { indexPriceRows, type PrintingPriceRow, type PrintingPrices } from "./price-lookup";

/**
 * Every printing of one oracle card, with whatever price the feed last carried.
 *
 * One statement, because the two halves must share a snapshot — the same reason
 * `price-query.ts:44-56` gives: an ingest committing between two statements would
 * leave the caller measuring rows from one snapshot against a newest from another,
 * and `priceState` reads that mismatch as `sold out` for every printing at once.
 * `left join … on true` is what keeps the newest row when nothing else matched.
 */
export async function loadPrintingPrices(oracleId: string): Promise<PrintingPrices> {
  const result = await db.execute<PrintingPriceRow>(sql`
    with newest as (select max(as_of) as as_of from printing_prices)
    select n.as_of              as newest_as_of,
           p.scryfall_id        as scryfall_id,
           upper(p.set_code)    as set_code,
           p.collector_number   as collector_number,
           pp.price_cents       as price_cents,
           pp.price_cents_foil  as price_cents_foil,
           pp.price_cents_etched as price_cents_etched,
           pp.as_of             as as_of
      from newest n
      left join printings p on p.oracle_id = ${oracleId}
      left join printing_prices pp on pp.scryfall_id = p.scryfall_id
  `);
  return indexPriceRows(result.rows as PrintingPriceRow[]);
}
