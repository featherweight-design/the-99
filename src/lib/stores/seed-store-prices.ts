import { inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { printingStorePrices, printings, tokenPrintings, tokenStorePrices } from "../../db/schema";
import { partitionFeed } from "../manapool/seed-prices";
import { fetchBulkIndex, streamBulkEntries } from "../scryfall/bulk";
import { tokenTablesExist } from "../tokens/publish";
import { fetchCardKingdomPricelist, parseCardKingdomPricelist } from "./cardkingdom";
import type { OtherStore, StorePriceRow } from "./rows";
import { tcgplayerRow } from "./tcgplayer";

const BATCH_SIZE = 500;
const LOOKUP_CHUNK = 1000;

export type SeedStoreResult = {
  store: OtherStore;
  upserted: number;
  tokenUpserted: number;
  skippedOrphan: number;
  /** Source rows dropped before the lookup: no usable id, finish, price or link (Card Kingdom), or no price at all (TCGplayer). */
  skipped: number;
  /** Card Kingdom SKUs folded into another for the same printing and finish. 0 for TCGplayer. */
  collapsed: number;
  asOf: Date;
};

/** TCGplayer's market prices from Scryfall's `default_cards`, read from the fetch job's file under `CATALOG_FETCH_DIR` when set. */
export async function loadTcgplayerRows(): Promise<{ rows: StorePriceRow[]; skipped: number; asOf: Date }> {
  const index = await fetchBulkIndex("default_cards");
  // The file's build time, not this run's clock: two legs reading one artifact write one `as_of`.
  if (!index.updatedAt) throw new Error("Scryfall's default_cards index has no updated_at; the store rows would have no as_of");
  const asOf = index.updatedAt;
  const rows: StorePriceRow[] = [];
  let skipped = 0;
  for await (const entry of streamBulkEntries(index)) {
    const row = tcgplayerRow(entry, asOf);
    if (row) rows.push(row); else skipped++;
  }
  return { rows, skipped, asOf };
}

async function knownIds(table: typeof printings | typeof tokenPrintings, ids: string[]): Promise<Set<string>> {
  const known = new Set<string>();
  for (let i = 0; i < ids.length; i += LOOKUP_CHUNK) {
    const found = await db.select({ id: table.scryfallId }).from(table)
      .where(inArray(table.scryfallId, ids.slice(i, i + LOOKUP_CHUNK)));
    for (const p of found) known.add(p.id);
  }
  return known;
}

function upsertSet(table: typeof printingStorePrices | typeof tokenStorePrices) {
  return {
    target: [table.scryfallId, table.store],
    set: {
      priceCents: sql`excluded.price_cents`,
      priceCentsFoil: sql`excluded.price_cents_foil`,
      priceCentsEtched: sql`excluded.price_cents_etched`,
      quantity: sql`excluded.quantity`,
      quantityFoil: sql`excluded.quantity_foil`,
      quantityEtched: sql`excluded.quantity_etched`,
      buyUrl: sql`excluded.buy_url`,
      buyUrlFoil: sql`excluded.buy_url_foil`,
      buyUrlEtched: sql`excluded.buy_url_etched`,
      asOf: sql`excluded.as_of`,
    },
    // Never backwards: a re-run of an older file (a retried leg, a stale artifact) cannot pull a store's rows
    // behind its newest `as_of`, which would read every untouched row as live again and the rewritten ones as stale.
    setWhere: sql`${table.asOf} <= excluded.as_of`,
  };
}

/**
 * Writes one store's rows to `printing_store_prices` and `token_store_prices`, in ONE transaction, so the store's
 * liveness mark (`max(as_of)` per store) moves for every row at once or not at all (the rule `seedPrices` keeps).
 * Upserts, never deletes: a printing the store dropped keeps its last row behind the mark.
 */
export async function writeStoreRows(store: OtherStore, rows: StorePriceRow[], asOf: Date, skipped: number, collapsed: number): Promise<SeedStoreResult> {
  if (rows.length === 0) throw new Error(`${store}: the source gave no usable rows; its shape may have moved`);
  const ids = [...new Set(rows.map((r) => r.scryfallId))];
  const cards = await knownIds(printings, ids);
  if (cards.size === 0) throw new Error(`${store}: no printing in the source is in our catalog; run \`pnpm db:seed:printings\` first`);
  // Skipped cleanly when the token tables do not exist: the refresh can reach a database before its migration does.
  const tokens = (await tokenTablesExist()) ? await knownIds(tokenPrintings, ids.filter((id) => !cards.has(id))) : new Set<string>();
  const { cardRows, tokenRows, skippedOrphan } = partitionFeed(rows, cards, tokens);

  await db.transaction(async (tx) => {
    for (let i = 0; i < cardRows.length; i += BATCH_SIZE) {
      await tx.insert(printingStorePrices).values(cardRows.slice(i, i + BATCH_SIZE)).onConflictDoUpdate(upsertSet(printingStorePrices));
    }
    for (let i = 0; i < tokenRows.length; i += BATCH_SIZE) {
      await tx.insert(tokenStorePrices).values(tokenRows.slice(i, i + BATCH_SIZE)).onConflictDoUpdate(upsertSet(tokenStorePrices));
    }
  });
  // No catalog stamp: nothing reads these tables yet. The store-aware reads decide whether a store run retires cached payloads.
  return { store, upserted: cardRows.length, tokenUpserted: tokenRows.length, skippedOrphan, skipped, collapsed, asOf };
}

export async function seedTcgplayerPrices(): Promise<SeedStoreResult> {
  const { rows, skipped, asOf } = await loadTcgplayerRows();
  return writeStoreRows("tcgplayer", rows, asOf, skipped, 0);
}

export async function seedCardKingdomPrices(): Promise<SeedStoreResult> {
  const feed = parseCardKingdomPricelist(await fetchCardKingdomPricelist());
  return writeStoreRows("cardkingdom", feed.rows, feed.asOf, feed.skipped, feed.collapsed);
}
