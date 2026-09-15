"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { db } from "../../db";
import { cardArtPreferences, cards, collectionItems, csvUploads, decks } from "../../db/schema";
import { requireUserId } from "../../lib/auth";
import { revalidateUserLists } from "../../lib/cache/user-lists";
import { parseCollectionCsv, type CollectionRow, type ParseError } from "../../lib/manabox/parse";
import { parsePasteList } from "../../lib/manabox/paste";
import { matchRows } from "../../lib/collection/match";
import { loadMatchInputs, replaceCollection } from "../../lib/collection/import";
import {
  buildArrivalsSummary, type ArrivalsSummary, type OwnedCounts,
} from "../../lib/collection/arrivals";
import { loadAvailability, loadDeckBuyRows } from "../../lib/decks/availability-query";

import { aggregatePendingItems, totalQuantity, type PendingItem } from "../../lib/collection/pending";
import { recommendCommanders } from "../../lib/recs/recommend";
import { collectionGeneration, persistScores } from "../../lib/recs/store";
import {
  COLLECTION_FILE_MAX_BYTES,
  COLLECTION_FILE_MAX_LABEL,
  PASTE_MAX_BYTES,
  PASTE_MAX_LABEL,
} from "../../lib/upload-limits";

export type UploadPreview = {
  uploadId: string;
  matchedCardCount: number;
  unmatchedRows: { name: string; setCode: string; line: number; quantity: number }[];
  /**
   * Tokens, emblems and art-series rows (§9.1). Excluded from the catalog by design — they
   * are reported apart from unmatchedRows so 113 skipped tokens do not read as an importer
   * that dropped 113 cards on the floor.
   */
  skippedByDesignCount: number;
  parseErrors: { line: number; reason: string }[];
  currentCollectionCount: number;
  filename: string;
  rowCount: number;
};

/**
 * Shared post-parse pipeline for previewUpload / previewPaste.
 * Guards the zero-row case, matches against the catalog + printings, aggregates matched rows
 * to compact (oracleId,setCode,collectorNumber,finish) totals, records
 * currentCollectionCount, and writes the csv_uploads row that confirmUpload reads back.
 */
async function buildPreview(args: {
  userId: string;
  filename: string;
  rows: CollectionRow[];
  errors: ParseError[];
}): Promise<UploadPreview> {
  const { userId, filename, rows, errors } = args;

  if (rows.length === 0) {
    throw new Error(errors[0] ? `Parse failed: ${errors[0].reason}` : "No card rows to import");
  }

  const { catalog, indexes } = await loadMatchInputs(rows);
  const { matched, skipped, unmatched } = matchRows(rows, catalog, indexes);

  const pendingItems = aggregatePendingItems(matched);
  const matchedCardCount = totalQuantity(pendingItems);

  const [{ count: currentCollectionCount }] = await db
    .select({ count: sql<number>`coalesce(sum(${collectionItems.quantity}), 0)::int` })
    .from(collectionItems)
    .where(eq(collectionItems.userId, userId));

  // Set codes are stored lowercase to join against `printings` but displayed uppercase
  // everywhere else, and this payload is read straight back out by the issue inspector.
  const unmatchedPayload = unmatched.map((r) => ({
    name: r.name,
    setCode: r.setCode.toUpperCase(),
    line: r.line,
    quantity: r.quantity,
  }));

  const [upload] = await db.insert(csvUploads).values({
    userId,
    filename,
    rowCount: rows.length + errors.length,
    unmatchedCount: unmatched.length,
    previewPayload: {
      unmatched: unmatchedPayload,
      skippedByDesignCount: skipped.length,
      parseErrors: errors.map((e) => ({ line: e.line, reason: e.reason })),
      pendingItems,
    },
  }).returning({ id: csvUploads.id });

  return {
    uploadId: upload.id,
    matchedCardCount,
    unmatchedRows: unmatchedPayload,
    skippedByDesignCount: skipped.length,
    parseErrors: errors.map((e) => ({ line: e.line, reason: e.reason })),
    currentCollectionCount,
    filename,
    rowCount: rows.length + errors.length,
  };
}

export async function previewUpload(formData: FormData): Promise<UploadPreview> {
  const userId = await requireUserId();
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No CSV file provided");
  if (file.size > COLLECTION_FILE_MAX_BYTES) throw new Error(`File too large (max ${COLLECTION_FILE_MAX_LABEL})`);
  const { rows, errors } = parseCollectionCsv(await file.text());
  return buildPreview({ userId, filename: file.name, rows, errors });
}

export async function previewPaste(text: string): Promise<UploadPreview> {
  const userId = await requireUserId();
  // Byte-accurate cap — text.length counts UTF-16 code units, which lets
  // multi-byte input exceed the intended size guard.
  if (Buffer.byteLength(text, "utf8") > PASTE_MAX_BYTES) throw new Error(`Paste too large (max ${PASTE_MAX_LABEL})`);
  const { rows, errors } = parsePasteList(text);
  return buildPreview({ userId, filename: "paste.txt", rows, errors });
}

/**
 * The collection as the claim model reads it: copies per oracle id.
 *
 * Summed across printings, because every figure in the claim model is oracle-level — a
 * Brushland from any set is a Brushland. Basics are NOT excluded here even though the claim
 * model excludes them: this feeds the arrivals count, and a player who imports 40 Forests
 * has had 40 cards arrive whatever the decks make of them.
 */
async function ownedByOracle(userId: string): Promise<OwnedCounts> {
  const rows = await db
    .select({
      oracleId: collectionItems.oracleId,
      quantity: sql<number>`sum(${collectionItems.quantity})::int`,
    })
    .from(collectionItems)
    .where(eq(collectionItems.userId, userId))
    .groupBy(collectionItems.oracleId);
  const out: OwnedCounts = {};
  for (const r of rows) out[r.oracleId] = r.quantity;
  return out;
}

/**
 * The same shape, predicted from the rows about to be written.
 *
 * Exact rather than approximate: these ARE the rows the replace inserts, so reading the
 * collection back afterwards would return this and cost a second user-wide scan.
 */
function pendingItemsToOwnedCounts(items: PendingItem[]): OwnedCounts {
  const out: OwnedCounts = {};
  for (const i of items) out[i.oracleId] = (out[i.oracleId] ?? 0) + i.quantity;
  return out;
}

/** Printed names for the receipt, frozen into the payload so a later rename cannot rewrite it. */
async function cardNamesFor(oracleIds: string[]): Promise<Record<string, string>> {
  if (oracleIds.length === 0) return {};
  const rows = await db
    .select({ oracleId: cards.oracleId, name: cards.name })
    .from(cards)
    .where(inArray(cards.oracleId, oracleIds));
  const out: Record<string, string> = {};
  for (const r of rows) out[r.oracleId] = r.name;
  return out;
}

/** Deck names, frozen for the same reason: a deck deleted later still has to render its row. */
async function deckNamesFor(userId: string): Promise<Record<string, string>> {
  const rows = await db
    .select({ id: decks.id, name: decks.name })
    .from(decks)
    .where(eq(decks.userId, userId));
  const out: Record<string, string> = {};
  for (const r of rows) out[r.id] = r.name;
  return out;
}

/**
 * Assembles the receipt for one confirmed upload and stores it.
 *
 * Extracted from `confirmUpload` so it can be exercised against a real database: the
 * action around it needs a request and a signed-in reader, and none of that is what the
 * receipt's correctness turns on. `pnpm probe:arrivals` calls this directly and reads the
 * stored payload back.
 *
 * Takes the BEFORE state as arguments rather than reading it, because by the time this
 * runs the replace has destroyed it.
 */
export async function writeArrivalsReceipt(args: {
  userId: string;
  uploadId: string;
  pendingItems: PendingItem[];
  ownedBefore: OwnedCounts;
  buyBefore: { deckId: string; oracleId: string; quantity: number }[];
  unmatched: { name: string; line: number }[];
  parseErrorCount: number;
}): Promise<ArrivalsSummary> {
  const { userId, uploadId, pendingItems, ownedBefore, buyBefore } = args;
  const ownedAfter = pendingItemsToOwnedCounts(pendingItems);
  const buyAfter = await loadDeckBuyRows(userId);

  // Only the cards that GAINED copies. Contention is a question about arrivals, so the
  // claim read is narrowed to them — passing every oracle in the old and new collection
  // defeats the point of `oracleIds` and makes every confirm materialise the player's
  // whole collection as claims.
  const arrivedIds = Object.keys(ownedAfter).filter(
    (oracleId) => (ownedAfter[oracleId] ?? 0) > (ownedBefore[oracleId] ?? 0),
  );
  const availability = arrivedIds.length
    ? await loadAvailability(userId, { oracleIds: arrivedIds })
    : new Map();
  const claims: Record<string, { owned: number; hard: number }> = {};
  for (const [oracleId, a] of availability) claims[oracleId] = { owned: a.owned, hard: a.hard };

  // Names for the rows the diff can emit: every card either side of the collection, plus
  // every card any deck owes. Frozen into the payload, so a later rename or a deleted deck
  // cannot rewrite a receipt.
  const named = new Set([
    ...Object.keys(ownedBefore),
    ...Object.keys(ownedAfter),
    ...buyBefore.map((r) => r.oracleId),
    ...buyAfter.map((r) => r.oracleId),
  ]);

  const summary = buildArrivalsSummary({
    ownedBefore,
    ownedAfter,
    buyBefore,
    buyAfter,
    claims,
    unmatched: args.unmatched,
    parseErrorCount: args.parseErrorCount,
    cardNames: await cardNamesFor([...named]),
    deckNames: await deckNamesFor(userId),
  });
  await db.update(csvUploads).set({ summaryPayload: summary })
    .where(and(eq(csvUploads.id, uploadId), eq(csvUploads.userId, userId)));
  return summary;
}

export async function confirmUpload(uploadId: string): Promise<void> {
  const userId = await requireUserId();
  const [upload] = await db.select().from(csvUploads)
    .where(and(eq(csvUploads.id, uploadId), eq(csvUploads.userId, userId)));
  if (!upload) throw new Error("upload not found");

  // Already confirmed: the receipt is stored and there is nothing to replace. Returning
  // rather than throwing is what makes a retried request idempotent — and re-running the
  // diff here would find nothing moved and overwrite a real receipt with an empty one.
  if (upload.confirmedAt) return;

  const preview = upload.previewPayload as {
    pendingItems: PendingItem[];
    unmatched?: { name: string; line: number }[];
    parseErrors?: { line: number; reason: string }[];
  };
  const pendingItems = preview.pendingItems;
  if (pendingItems.length === 0) throw new Error("Upload has no matched cards; refusing to replace collection");

  // THE STATE BEFORE, read now because the replace destroys it. Both reads are
  // point-in-time and deliberately not serialized against the write: the only race is
  // the same player editing a deck in another tab during their own import, and its cost
  // is a mis-stated line on a receipt — never a wrong claim figure, since every claim
  // figure in the app is recomputed live and the chooser's write re-validates in its own
  // transaction.
  const ownedBefore = await ownedByOracle(userId);
  const buyBefore = await loadDeckBuyRows(userId);

  // A preview written before migration 0008 carries no collectorNumber/finish;
  // replaceCollection coerces both rather than spreading undefined into the insert.
  //
  // The upload row is the lock: the stamp inside that transaction is conditional on
  // `confirmed_at is null`, so a double submit replaces the collection exactly once and
  // the loser is told so rather than raising.
  const { alreadyConfirmed } = await replaceCollection(userId, pendingItems, {
    confirmUploadId: uploadId,
  });
  if (alreadyConfirmed) return;

  // INVALIDATION FIRST, RECEIPT SECOND. The replace has committed, so every cached
  // figure behind every one of these paths is already wrong; the receipt is a nicety by
  // comparison. Ordered the other way, a failure while assembling the receipt would leave
  // the caches stale too — and the early return above means no retry would ever repair
  // either.
  //
  // Every cached list this reader has is a function of the rows just replaced.
  revalidateUserLists(userId);
  revalidatePath("/collection");
  revalidatePath("/");
  // The set pages read owned counts and completion ratios off the same rows. Pattern form
  // for the dynamic one, exactly as `setCardArtPreference` does and for the same reason:
  // the tag refreshes server payloads, not a client route already visited.
  revalidatePath("/collection/sets");
  revalidatePath("/collection/sets/[code]", "page");
  // Wiping commander_scores above changes what /commanders renders, and slugs are
  // assigned in rank order so cached detail pages can point at the wrong
  // commander. '[slug]' needs the 'page' type — it is a dynamic segment.
  revalidatePath("/commanders");
  revalidatePath("/commanders/[slug]", "page");
  // A REPLACE CHANGES EVERY CLAIM FIGURE THERE IS, and these were missing. The
  // `user-lists` tag above covers the cached payloads behind the deck pages; it does not
  // cover the paths, so a back navigation to a deck served the pre-import render with its
  // buy tags still on. Pattern form for the dynamic segments, as `revalidateClaims`
  // already does for the review page — there is no one deck to name here.
  revalidatePath("/decks");
  revalidatePath("/decks/[id]", "page");
  revalidatePath("/decks/[id]/changes", "page");
  revalidatePath("/discover");

  // THE RECEIPT. Assembled and stored by a helper the probe can call directly, because
  // everything above this line needs a request to exist and the receipt does not.
  await writeArrivalsReceipt({
    userId,
    uploadId,
    pendingItems,
    ownedBefore,
    buyBefore,
    unmatched: preview.unmatched ?? [],
    parseErrorCount: (preview.parseErrors ?? []).length,
  });

  // Warm the new collection's scores without blocking the upload response. If this
  // is cut short by the route's max duration, the read path recomputes on first
  // visit — the warm is an optimisation, never a correctness requirement.
  after(async () => {
    try {
      // Reads the generation this confirm just created, so the warm's write survives
      // while an older in-flight compute's write is dropped.
      const generation = await collectionGeneration(userId);
      const recs = await recommendCommanders(userId);
      await persistScores(userId, recs.results, generation);
    } catch {
      // Swallow: the lazy path in getRankedList is the correctness backstop.
    }
  });
}

/**
 * Choose which printing represents a card across the collection surfaces (#105).
 *
 * Reachable outside the picker, which only ever offers printings the user owns — so the holding
 * is verified here rather than trusted. Silently returning on a miss keeps the action from
 * leaking whether some other user owns that printing.
 *
 * Reports whether it wrote. The caller paints the pick optimistically and has no other way to
 * tell a refusal from a write — a refusal reads back exactly the preference already on screen.
 * Saying so reveals nothing but the caller's own holdings.
 */
export async function setCardArtPreference(
  oracleId: string,
  setCode: string,
  collectorNumber: string,
): Promise<boolean> {
  const userId = await requireUserId();
  // Normalize on write (§3.3) — every set code in the database is lowercase, and the picker
  // hands back the uppercased display value.
  const normalizedSetCode = setCode.toLowerCase();
  const [owned] = await db.select({ one: sql<number>`1` })
    .from(collectionItems)
    .where(and(
      eq(collectionItems.userId, userId),
      eq(collectionItems.oracleId, oracleId),
      // Lowercased like every other read of this column: a holding written before 0008
      // carries an uppercase set_code, and comparing raw made the pick silently fail for
      // exactly the rows the set page is trying to place.
      eq(sql`lower(${collectionItems.setCode})`, normalizedSetCode),
      // May legitimately be '' — a bare `Name,Qty` import carries no collector number.
      eq(collectionItems.collectorNumber, collectorNumber),
    ))
    .limit(1);
  if (!owned) return false;

  await db.insert(cardArtPreferences)
    .values({ userId, oracleId, setCode: normalizedSetCode, collectorNumber })
    .onConflictDoUpdate({
      target: [cardArtPreferences.userId, cardArtPreferences.oracleId],
      set: { setCode: normalizedSetCode, collectorNumber },
    });
  // The browse payload carries the chosen printing's art, so it is stale now.
  revalidateUserLists(userId);
  revalidatePath("/collection");
  // A pick is keyed (user_id, oracle_id), so choosing #268 fills #268 and EMPTIES #262:
  // two cells change from one act, with the set's ratio unmoved. The set page is the only
  // surface where that swap is legible, and without this it happens invisibly.
  revalidatePath("/collection/sets/[code]", "page");
  return true;
}

/** Forget the pick, returning the card to the resolver's choice. */
export async function clearCardArtPreference(oracleId: string): Promise<void> {
  const userId = await requireUserId();
  await db.delete(cardArtPreferences).where(and(
    eq(cardArtPreferences.userId, userId),
    eq(cardArtPreferences.oracleId, oracleId),
  ));
  revalidateUserLists(userId);
  revalidatePath("/collection");
  // Clearing a pick moves the fill back, so the set page is stale for the same reason.
  revalidatePath("/collection/sets/[code]", "page");
}
