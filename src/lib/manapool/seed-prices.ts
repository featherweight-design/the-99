import { sql } from "drizzle-orm";
import { db } from "../../db";
import { printingPrices, printings } from "../../db/schema";
import { fetchManapoolSingles } from "./client";
import { parseManapoolPayload, type PriceRow } from "./parse";

const BATCH_SIZE = 500;

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
  const known = new Set(
    (await db.select({ scryfallId: printings.scryfallId }).from(printings))
      .map((p) => p.scryfallId),
  );
  if (known.size === 0) {
    throw new Error("printings table is empty — run `pnpm db:seed:printings` first");
  }

  const { rows, skippedOrphan } = filterKnownPrintings(feed.rows, known);

  let upserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await db.insert(printingPrices).values(rows.slice(i, i + BATCH_SIZE))
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

  return {
    upserted, skippedOrphan,
    collapsedDuplicates: feed.collapsedDuplicates,
    asOf: feed.asOf,
  };
}
