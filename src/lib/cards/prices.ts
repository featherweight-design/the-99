// Prices for one card's printings — the database half.
//
// Kept apart from `price-lookup.ts` for the reason `cards/price-fact.ts` and
// `decks/price-query.ts` are: the modal is a client component and imports the
// lookup, so nothing it reaches may import `db`.

import { sql } from "drizzle-orm";
import { db } from "../../db";
import { indexPriceRows, type PrintingPriceRow, type PrintingPrices } from "./price-lookup";
import { storeRows } from "../decks/price-query";
import type { Store } from "../stores/rows";

/**
 * Every printing of one oracle card, with whatever price the feed last carried.
 *
 * One statement, because the two halves must share a snapshot — the same reason
 * `price-query.ts:44-56` gives: an ingest committing between two statements would
 * leave the caller measuring rows from one snapshot against a newest from another,
 * and `priceState` reads that mismatch as `sold out` for every printing at once.
 * `left join … on true` is what keeps the newest row when nothing else matched.
 */
export async function loadPrintingPrices(oracleId: string, store: Store = "manapool"): Promise<PrintingPrices> {
  const result = await db.execute<PrintingPriceRow>(printingPricesQuery(oracleId, store));
  return indexPriceRows(result.rows as PrintingPriceRow[]);
}

/**
 * The statement, apart so a test can read it. THE STORE NAMES THE TABLE, as in `loadPrices`: Mana Pool renders the
 * text this statement had before stores, byte for byte; another store reads its own rows through `storeRows`, against
 * its own newest `as_of`, and carries `sold_out`, which `indexPriceRows` sets as the fact's `soldOut`.
 */
export function printingPricesQuery(oracleId: string, store: Store) {
  const other = store === "manapool" ? null : store;
  const newestFrom = other ? sql`printing_store_prices where store = ${other}` : sql`printing_prices`;
  const source = other ? storeRows(other) : sql`printing_prices`;
  const soldOutCol = other ? sql`,
           pp.sold_out          as sold_out` : sql``;
  return sql`
    with newest as (select max(as_of) as as_of from ${newestFrom})
    select n.as_of              as newest_as_of,
           p.scryfall_id        as scryfall_id,
           upper(p.set_code)    as set_code,
           p.collector_number   as collector_number,
           pp.price_cents       as price_cents,
           pp.price_cents_foil  as price_cents_foil,
           pp.price_cents_etched as price_cents_etched,
           pp.as_of             as as_of${soldOutCol}
      from newest n
      left join printings p on p.oracle_id = ${oracleId}
      left join ${source} pp on pp.scryfall_id = p.scryfall_id
  `;
}

/**
 * `loadPrintingPrices` for every card one reader owns, in one statement: `/collection`'s Price
 * sort needs a figure on every card it ships. The same columns and the same `newest` row, grouped
 * per oracle card and indexed by the same `indexPriceRows`, so each card's index is exactly the
 * one card details would build for it. All of a card's printings, not only the owned ones:
 * `priceFor` names a set-only or name-only holding by counting the catalog's printings of it.
 *
 * It takes the ids rather than the user: the caller passes the cards of the collection snapshot it
 * already read, so a card added between two reads can never ship without its price.
 *
 * Measured on staging for the reference account (2,926 cards): 19,817 rows.
 */
export async function loadOwnedPrintingPrices(
  oracleIds: readonly string[],
): Promise<Map<string, PrintingPrices>> {
  if (oracleIds.length === 0) return new Map();
  const result = await db.execute<PrintingPriceRow & { oracle_id: string }>(sql`
    with newest as (select max(as_of) as as_of from printing_prices),
         owned as (select distinct unnest(${sql.param([...oracleIds])}::uuid[]) as oracle_id)
    select o.oracle_id          as oracle_id,
           n.as_of              as newest_as_of,
           p.scryfall_id        as scryfall_id,
           upper(p.set_code)    as set_code,
           p.collector_number   as collector_number,
           pp.price_cents       as price_cents,
           pp.price_cents_foil  as price_cents_foil,
           pp.price_cents_etched as price_cents_etched,
           pp.as_of             as as_of
      from newest n
      cross join owned o
      left join printings p on p.oracle_id = o.oracle_id
      left join printing_prices pp on pp.scryfall_id = p.scryfall_id
  `);
  const byOracle = new Map<string, PrintingPriceRow[]>();
  for (const row of result.rows as (PrintingPriceRow & { oracle_id: string })[]) {
    const rows = byOracle.get(row.oracle_id);
    if (rows) rows.push(row);
    else byOracle.set(row.oracle_id, [row]);
  }
  return new Map([...byOracle].map(([oracleId, rows]) => [oracleId, indexPriceRows(rows)]));
}
