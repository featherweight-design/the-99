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

/** One store's source, read and parsed, before anything touches the database. */
export type StoreLoad = {
  rows: StorePriceRow[];
  asOf: Date;
  /** Source rows dropped before the lookup: no usable id, finish, price or link (Card Kingdom), or no price at all (TCGplayer). */
  skipped: number;
  /** Card Kingdom SKUs folded into another for the same printing and finish. 0 for TCGplayer. */
  collapsed: number;
};

export type SeedStoreResult = {
  store: OtherStore;
  /** Rows actually written. Fewer than the source's when the never-backwards guard held some back. */
  upserted: number;
  tokenUpserted: number;
  /** Rows the source had for known printings that the guard held back, because the stored row is newer. */
  heldBack: number;
  skippedOrphan: number;
  skipped: number;
  collapsed: number;
  asOf: Date;
};

/**
 * Below this share of rows with a product link, the TCGplayer pass refuses: Scryfall renaming or dropping
 * `tcgplayer_id` would otherwise null every link while the prices still write. 97,808 of 98,700 (99.1%) carried
 * one on 2026-11-22.
 */
export const TCGPLAYER_MIN_LINKED_SHARE = 0.9;

/** TCGplayer's market prices from Scryfall's `default_cards`, read from the fetch job's file under `CATALOG_FETCH_DIR` when set. */
export async function loadTcgplayerRows(): Promise<StoreLoad> {
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
  const linked = rows.filter((r) => r.buyUrl !== null).length;
  if (rows.length > 0 && linked / rows.length < TCGPLAYER_MIN_LINKED_SHARE) {
    throw new Error(`tcgplayer: only ${linked} of ${rows.length} priced printings carry a tcgplayer_id; Scryfall's field may have moved`);
  }
  return { rows, skipped, collapsed: 0, asOf };
}

export async function loadCardKingdomRows(): Promise<StoreLoad> {
  return parseCardKingdomPricelist(await fetchCardKingdomPricelist());
}

/**
 * Whether migration 0267's tables exist. The refresh can reach a database before its migration does (staging
 * migrates at its daily deploy, the refresh may run first), and a missing table there is a wait, not a failure.
 */
export async function storeTablesExist(): Promise<boolean> {
  const r = await db.execute(sql`select to_regclass('public.printing_store_prices') is not null
    and to_regclass('public.token_store_prices') is not null as ok`);
  return (r.rows[0] as { ok?: boolean } | undefined)?.ok === true;
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

export function upsertSet(table: typeof printingStorePrices | typeof tokenStorePrices) {
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
export async function writeStoreRows(store: OtherStore, { rows, asOf, skipped, collapsed }: StoreLoad): Promise<SeedStoreResult> {
  if (rows.length === 0) throw new Error(`${store}: the source gave no usable rows; its shape may have moved`);
  const ids = [...new Set(rows.map((r) => r.scryfallId))];
  const cards = await knownIds(printings, ids);
  if (cards.size === 0) throw new Error(`${store}: no printing in the source is in our catalog; run \`pnpm db:seed:printings\` first`);
  // Skipped cleanly when the token tables do not exist: the refresh can reach a database before its migration does.
  const tokens = (await tokenTablesExist()) ? await knownIds(tokenPrintings, ids.filter((id) => !cards.has(id))) : new Set<string>();
  const { cardRows, tokenRows, skippedOrphan } = partitionFeed(rows, cards, tokens);

  // Counted from RETURNING, so a row the never-backwards guard held back is not reported as written.
  let upserted = 0;
  let tokenUpserted = 0;
  await db.transaction(async (tx) => {
    for (let i = 0; i < cardRows.length; i += BATCH_SIZE) {
      const written = await tx.insert(printingStorePrices).values(cardRows.slice(i, i + BATCH_SIZE))
        .onConflictDoUpdate(upsertSet(printingStorePrices)).returning({ id: printingStorePrices.scryfallId });
      upserted += written.length;
    }
    for (let i = 0; i < tokenRows.length; i += BATCH_SIZE) {
      const written = await tx.insert(tokenStorePrices).values(tokenRows.slice(i, i + BATCH_SIZE))
        .onConflictDoUpdate(upsertSet(tokenStorePrices)).returning({ id: tokenStorePrices.scryfallId });
      tokenUpserted += written.length;
    }
  });
  // No catalog stamp: nothing reads these tables yet. The store-aware reads decide whether a store run retires cached payloads.
  const heldBack = cardRows.length + tokenRows.length - upserted - tokenUpserted;
  return { store, upserted, tokenUpserted, heldBack, skippedOrphan, skipped, collapsed, asOf };
}
