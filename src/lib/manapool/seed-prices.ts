import { inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { printingPrices, printings } from "../../db/schema";
import { stampCatalogRefresh } from "../cache/stamp-catalog";
import { fetchManapoolSingles } from "./client";
import { parseManapoolPayload, type PriceRow } from "./parse";

const BATCH_SIZE = 500;
const LOOKUP_CHUNK = 1000;

export type SeedPricesResult = {
  upserted: number;
  skippedOrphan: number;
  collapsedDuplicates: number;
  asOf: Date;
};

/**
 * Splits feed rows into those whose printing we know and those we do not.
 *
 * Exported and pure so the orphan rule is unit-testable — `seedPrices` itself
 * needs a database and a network and so is not.
 */
export function filterKnownPrintings(
  rows: PriceRow[],
  known: Set<string>,
): { rows: PriceRow[]; skippedOrphan: number } {
  const kept: PriceRow[] = [];
  let skippedOrphan = 0;
  for (const row of rows) {
    if (!known.has(row.scryfallId)) { skippedOrphan++; continue; }
    kept.push(row);
  }
  return { rows: kept, skippedOrphan };
}

/**
 * Refreshes `printing_prices` from ManaPool's singles feed.
 *
 * Upserts rather than replacing wholesale: a truncate-then-reload leaves the
 * table empty for the length of the load, and rows for printings that vanish
 * from the feed are more useful left in place with a now-stale `as_of` than
 * deleted outright.
 */
export async function seedPrices(): Promise<SeedPricesResult> {
  const feed = parseManapoolPayload(await fetchManapoolSingles());
  if (feed.rows.length === 0) {
    throw new Error("ManaPool returned no usable rows — the feed's shape may have moved");
  }

  // printing_prices.scryfall_id has an FK to printings.scryfall_id and the two
  // ingests are not lock-stepped, so filter orphans in memory rather than
  // failing a batch. Same pattern and same reasoning as seed-printings.ts.
  //
  // Looked up by the ids the feed actually carries rather than by reading the
  // table whole: `printings` holds every printing in existence and the feed
  // names roughly 100k of them, so a full load moves far more rows than the run
  // can use. Chunked for the same reason collection/import.ts chunks — one
  // `in (...)` of 100k ids is not a query Postgres should be asked to plan.
  const feedIds = [...new Set(feed.rows.map((r) => r.scryfallId))];
  const known = new Set<string>();
  for (let i = 0; i < feedIds.length; i += LOOKUP_CHUNK) {
    const found = await db.select({ scryfallId: printings.scryfallId }).from(printings)
      .where(inArray(printings.scryfallId, feedIds.slice(i, i + LOOKUP_CHUNK)));
    for (const p of found) known.add(p.scryfallId);
  }
  if (known.size === 0) {
    throw new Error(
      "no printing in the feed is in our catalog — run `pnpm db:seed:printings` first",
    );
  }

  const { rows, skippedOrphan } = filterKnownPrintings(feed.rows, known);

  // One transaction across every batch. The staleness rule schema.ts documents
  // — a row is live when its `as_of` matches the newest in the table — only
  // holds if a run is all-or-nothing. A crash halfway through a loose loop
  // leaves half the table on the new `as_of` and half on the old, which makes
  // every surviving row read as sold out. Batching stays: it is about statement
  // size, not durability, and 100k rows in one insert is not a statement to send.
  let upserted = 0;
  await db.transaction(async (tx) => {
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      await tx.insert(printingPrices).values(rows.slice(i, i + BATCH_SIZE))
        .onConflictDoUpdate({
          target: printingPrices.scryfallId,
          set: {
            priceCents: sql`excluded.price_cents`,
            priceCentsNm: sql`excluded.price_cents_nm`,
            priceCentsFoil: sql`excluded.price_cents_foil`,
            priceCentsEtched: sql`excluded.price_cents_etched`,
            availableQuantity: sql`excluded.available_quantity`,
            buyUrl: sql`excluded.buy_url`,
            asOf: sql`excluded.as_of`,
          },
        });
      upserted += Math.min(BATCH_SIZE, rows.length - i);
    }
  });
  // Every cached list payload that draws a shopping cost priced it from this table, and the
  // catalog generation in their key is what retires them. After the commit, like every other
  // ingest's stamp: a reader who misses it by a moment gets one more minute of the old payload
  // rather than a new generation over half-written prices. See `catalog-generation.ts`.
  await stampCatalogRefresh();

  return {
    upserted, skippedOrphan,
    collapsedDuplicates: feed.collapsedDuplicates,
    asOf: feed.asOf,
  };
}
