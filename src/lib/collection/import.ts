import { eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import {
  cards, collectionItems, commanderScores, csvUploads, printings, skippedPrintings,
} from "../../db/schema";
import type { CollectionRow } from "../manabox/parse";
import type { CatalogCard, DetailedCatalogCard, MatchIndexes } from "./match";
import { toCollectionItemValues, type PendingItem } from "./pending";

const INSERT_BATCH = 500;
// scryfall_id is a uuid column, so a malformed id from a hand-edited CSV would fail the
// lookup query with 22P02 rather than simply not matching. Filter before querying.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Chunked `in (...)` lookup — a 5MB CSV can carry tens of thousands of ids. */
async function chunkedLookup<T>(
  ids: string[],
  query: (chunk: string[]) => Promise<T[]>,
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += 1000) out.push(...(await query(ids.slice(i, i + 1000))));
  return out;
}

/**
 * Loads the catalog plus the printing indexes matchRows needs.
 *
 * `printings` holds every printing in existence, so it is looked up by the ids the upload
 * actually contains rather than loaded whole; the oracle catalog is small enough to read in
 * full and is still needed for name matching.
 */
export async function loadMatchInputs(
  rows: CollectionRow[],
): Promise<{ catalog: CatalogCard[]; indexes: MatchIndexes }>;
export async function loadMatchInputs(
  rows: CollectionRow[],
  opts: { detailed: true },
): Promise<{ catalog: DetailedCatalogCard[]; indexes: MatchIndexes }>;
export async function loadMatchInputs(
  rows: CollectionRow[],
  opts: { detailed?: boolean } = {},
): Promise<{ catalog: CatalogCard[]; indexes: MatchIndexes }> {
  // Deck import needs the type line to tell a basic land and a legendary creature
  // apart; the collection flow does not, and oracle_text over the whole catalog is
  // large enough that reading it unconditionally would be a real regression there.
  const columns = { oracleId: cards.oracleId, scryfallId: cards.scryfallId, name: cards.name };
  const catalog = await db
    .select(
      opts.detailed
        ? {
            ...columns,
            typeLine: cards.typeLine,
            oracleText: cards.oracleText,
            commanderLegal: cards.commanderLegal,
          }
        : columns,
    )
    .from(cards);

  const ids = [...new Set(rows.map((r) => r.scryfallId).filter((id): id is string => !!id && UUID_RE.test(id)))];
  if (ids.length === 0) return { catalog, indexes: {} };

  const printingRows = await chunkedLookup(ids, (chunk) =>
    db
      .select({ scryfallId: printings.scryfallId, oracleId: printings.oracleId })
      .from(printings)
      .where(inArray(printings.scryfallId, chunk)));
  const skippedRows = await chunkedLookup(ids, (chunk) =>
    db
      .select({ scryfallId: skippedPrintings.scryfallId })
      .from(skippedPrintings)
      .where(inArray(skippedPrintings.scryfallId, chunk)));

  return {
    catalog,
    indexes: {
      printings: printingRows,
      skippedScryfallIds: skippedRows.map((r) => r.scryfallId),
    },
  };
}

/**
 * Replaces a user's collection with `items`, in one transaction.
 *
 * Delete-then-plain-INSERT, with no ON CONFLICT anywhere: the caller must have aggregated to
 * exactly one item per primary key (see aggregatePendingItems) or this raises 23505.
 *
 * Shared by confirmUpload and `pnpm db:seed:collection` so the CLI path exercises the server
 * action's write rather than a second implementation of it.
 */
export async function replaceCollection(
  userId: string,
  items: PendingItem[],
  opts: { confirmUploadId?: string } = {},
): Promise<void> {
  const values = toCollectionItemValues(userId, items);
  await db.transaction(async (tx) => {
    await tx.delete(collectionItems).where(eq(collectionItems.userId, userId));
    // Every score component derives from the collection, so a replace invalidates all of them.
    await tx.delete(commanderScores).where(eq(commanderScores.userId, userId));
    for (let i = 0; i < values.length; i += INSERT_BATCH) {
      await tx.insert(collectionItems).values(values.slice(i, i + INSERT_BATCH));
    }
    if (opts.confirmUploadId) {
      await tx.update(csvUploads).set({ confirmedAt: new Date() })
        .where(eq(csvUploads.id, opts.confirmUploadId));
    }
  });
}
