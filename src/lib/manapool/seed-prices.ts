import { inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { printingPrices, printings, tokenPrintingPrices, tokenPrintings } from "../../db/schema";
import { countTokenPrintings, tokenPriceTablesExist } from "../tokens/publish";
import { tokenPriceFloorFailure } from "../tokens/catalog";
import { stampCatalogRefresh } from "../cache/stamp-catalog";
import { fetchManapoolSingles } from "./client";
import { parseManapoolPayload, type PriceRow } from "./parse";

const BATCH_SIZE = 500;
const LOOKUP_CHUNK = 1000;

export type SeedPricesResult = {
  upserted: number;
  /** Rows written to `token_printing_prices`; 0 when the token tables do not exist yet. */
  tokenUpserted: number;
  /** Why the token prices were NOT written (a floor), or null. The CLI exits non-zero on it. */
  tokenRefusal: string | null;
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
 * Splits feed rows three ways: a card printing, a token printing, or neither. A printing is one or
 * the other (a token has no `cards` row, and a card is never a token printing), so the order of the
 * two lookups is not a rule. Pure, for the same reason as `filterKnownPrintings`.
 */
export function partitionFeed(
  rows: PriceRow[],
  knownCards: Set<string>,
  knownTokens: Set<string>,
): { cardRows: PriceRow[]; tokenRows: PriceRow[]; skippedOrphan: number } {
  const cardRows: PriceRow[] = [];
  const tokenRows: PriceRow[] = [];
  let skippedOrphan = 0;
  for (const row of rows) {
    if (knownCards.has(row.scryfallId)) cardRows.push(row);
    else if (knownTokens.has(row.scryfallId)) tokenRows.push(row);
    else skippedOrphan++;
  }
  return { cardRows, tokenRows, skippedOrphan };
}

/**
 * Refreshes `printing_prices` from ManaPool's singles feed, and `token_printing_prices` from the
 * same rows in the same transaction.
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

  // Token printings: the ids the feed carries that are not card printings. Skipped cleanly when the
  // token tables do not exist, because the refresh can reach a database before its migration does.
  const knownTokens = new Set<string>();
  let tokenCatalogSize = 0;
  if (await tokenPriceTablesExist()) {
    tokenCatalogSize = await countTokenPrintings();
    const rest = feedIds.filter((id) => !known.has(id));
    for (let i = 0; i < rest.length; i += LOOKUP_CHUNK) {
      const found = await db.select({ scryfallId: tokenPrintings.scryfallId }).from(tokenPrintings)
        .where(inArray(tokenPrintings.scryfallId, rest.slice(i, i + LOOKUP_CHUNK)));
      for (const p of found) knownTokens.add(p.scryfallId);
    }
  }
  const partitioned = partitionFeed(feed.rows, known, knownTokens);
  const { cardRows: rows, skippedOrphan } = partitioned;
  // A collapsed token match set is refused, not written: card prices still go in (they are not what
  // broke) and the run reports the refusal for the CLI to exit on. See `tokenPriceFloorFailure`.
  const tokenRefusal = tokenPriceFloorFailure(partitioned.tokenRows.length, tokenCatalogSize);
  const tokenRows = tokenRefusal ? [] : partitioned.tokenRows;

  // One transaction across every batch. The staleness rule schema.ts documents
  // — a row is live when its `as_of` matches the newest in the table — only
  // holds if a run is all-or-nothing. A crash halfway through a loose loop
  // leaves half the table on the new `as_of` and half on the old, which makes
  // every surviving row read as sold out. Batching stays: it is about statement
  // size, not durability, and 100k rows in one insert is not a statement to send.
  let upserted = 0;
  let tokenUpserted = 0;
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
    // The same upsert on the token table, inside the same transaction: one feed run is one `as_of`,
    // and a run that wrote the cards and not the tokens would leave every token reading as sold out.
    for (let i = 0; i < tokenRows.length; i += BATCH_SIZE) {
      await tx.insert(tokenPrintingPrices).values(tokenRows.slice(i, i + BATCH_SIZE))
        .onConflictDoUpdate({
          target: tokenPrintingPrices.scryfallId,
          set: {
            productName: sql`excluded.product_name`,
            productSet: sql`excluded.product_set`,
            productNumber: sql`excluded.product_number`,
            priceCents: sql`excluded.price_cents`,
            priceCentsNm: sql`excluded.price_cents_nm`,
            priceCentsFoil: sql`excluded.price_cents_foil`,
            priceCentsEtched: sql`excluded.price_cents_etched`,
            availableQuantity: sql`excluded.available_quantity`,
            buyUrl: sql`excluded.buy_url`,
            asOf: sql`excluded.as_of`,
          },
        });
      tokenUpserted += Math.min(BATCH_SIZE, tokenRows.length - i);
    }
  });
  // Every cached list payload that draws a shopping cost priced it from this table, and the
  // catalog generation in their key is what retires them. After the commit, like every other
  // ingest's stamp: a reader who misses it by a moment gets one more minute of the old payload
  // rather than a new generation over half-written prices. See `catalog-generation.ts`.
  await stampCatalogRefresh();

  return {
    upserted, tokenUpserted, tokenRefusal, skippedOrphan,
    collapsedDuplicates: feed.collapsedDuplicates,
    asOf: feed.asOf,
  };
}
