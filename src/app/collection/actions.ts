"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { db } from "../../db";
import { cardArtPreferences, collectionItems, csvUploads } from "../../db/schema";
import { requireUserId } from "../../lib/auth";
import { getCollectionLastUpdated, getCollectionStats } from "../../lib/home/summary";
import { formatLastUpdated } from "../../lib/collection/browse";
import { revalidateUserLists } from "../../lib/cache/user-lists";
import { parseCollectionCsv, type CollectionRow, type ParseError } from "../../lib/manabox/parse";
import { parsePasteList } from "../../lib/manabox/paste";
import { matchRows } from "../../lib/collection/match";
import { loadMatchInputs, replaceCollection } from "../../lib/collection/import";
import {
  ownedAfterEntry, ownedByOracle, pendingItemsToOwnedCounts, writeArrivalsReceipt,
} from "../../lib/collection/arrivals-write";
import type { OwnedCounts } from "../../lib/collection/arrivals";
import { applyCollectionChange, type ShortDeck } from "../../lib/collection/write";
import { collectionEditEnabled } from "../../lib/collection/edit-flag";
import { editsSinceUpload } from "../../lib/collection/history";
import { randomUUID } from "node:crypto";
import { invalidateCollectionReaders } from "../../lib/collection/invalidate";
import { loadDeckBuyRows } from "../../lib/decks/availability-query";

import { aggregatePendingItems, totalQuantity, type PendingItem } from "../../lib/collection/pending";
import { recommendCommanders } from "../../lib/recs/recommend";
import { collectionGeneration, indexGeneration, persistScores } from "../../lib/recs/store";
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
 * What a confirm can answer besides success. `needsConfirm` is the one refusal a caller acts
 * on rather than shows: a `firstImport` confirm found a collection already there, so nothing
 * was written and the caller asks the player before replacing it. It carries the collection's
 * size, counted as the preview counts it, because the preview the caller holds says 0 and the
 * modal reads its variant and its NOW figure off that figure.
 */
export type ConfirmOutcome =
  | { needsConfirm: true; currentCollectionCount: number }
  /**
   * Ledger path only: committed decks this upload would leave short. Nothing was written; the
   * caller shows the warning and confirms again with these decks as `confirmShort`.
   */
  | { wouldShort: ShortDeck[] }
  /** Ledger path only: cards the catalog dropped since the preview. Nothing was written. */
  | { missingCard: string[] }
  | void;

/** How an upload meets the collection: replace it whole, or add its counts to it. */
export type UploadMode = "replace" | "add";

/** What a confirm in `mode` would do, for the Replace/Add screen. Ledger path only. */
export type UploadChangePreview = {
  raised: number;
  lowered: number;
  /** Committed decks the upload would leave short (a Replace only; an Add lowers nothing). */
  decks: ShortDeck[];
  /** Hand changes since the last upload, which a Replace overwrites. */
  editsSinceUpload: number;
};

function parseMode(mode: unknown): UploadMode {
  if (mode === undefined || mode === "replace") return "replace";
  if (mode === "add") return "add";
  throw new Error("unknown upload mode");
}

/** The warning the client says it showed. Malformed entries confirm nothing. */
function parseShortDecks(value: unknown): ShortDeck[] {
  if (!Array.isArray(value)) return [];
  return value.filter((d): d is ShortDeck =>
    typeof d === "object" && d !== null
    && typeof d.deckId === "string" && typeof d.oracleId === "string"
    && typeof d.deckName === "string" && typeof d.cardName === "string"
    && Number.isInteger(d.short));
}

async function loadUpload(userId: string, uploadId: string) {
  const [upload] = await db.select().from(csvUploads)
    .where(and(eq(csvUploads.id, uploadId), eq(csvUploads.userId, userId)));
  if (!upload) throw new Error("upload not found");
  return upload;
}

/**
 * What confirming `uploadId` in `mode` would do, computed by the write itself in a rolled-back
 * transaction (`dryRun`), so the screen and the save cannot disagree. Ledger path only.
 */
export async function previewUploadChange(uploadId: string, mode?: UploadMode): Promise<UploadChangePreview | null> {
  const userId = await requireUserId();
  if (!collectionEditEnabled()) throw new Error("collection editing is off");
  const kind = parseMode(mode);
  const upload = await loadUpload(userId, uploadId);
  // Already confirmed: there is nothing left to choose.
  if (upload.confirmedAt) return null;
  const { pendingItems } = upload.previewPayload as { pendingItems: PendingItem[] };
  const [result, edits] = await Promise.all([
    applyCollectionChange(userId, { kind, items: pendingItems, uploadId }, { id: randomUUID(), dryRun: true }),
    editsSinceUpload(userId),
  ]);
  if (result.status !== "preview") return null;
  return { raised: result.raised, lowered: result.lowered, decks: result.decks, editsSinceUpload: edits };
}

export async function confirmUpload(
  uploadId: string,
  opts: { firstImport?: boolean; mode?: UploadMode; confirmShort?: ShortDeck[] } = {},
): Promise<ConfirmOutcome> {
  const userId = await requireUserId();
  const mode = parseMode(opts.mode);
  const ledger = collectionEditEnabled();
  if (mode === "add" && !ledger) throw new Error("adding an upload needs collection editing on");
  const upload = await loadUpload(userId, uploadId);

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
  // A FIRST IMPORT SKIPS THE CONFIRM, because there is nothing to lose (prod walk 2026-09-28,
  // item 5a). The client says "first" from the count it was drawn with, which can be stale: a
  // second tab may have imported since. So the replace itself refuses, under the per-user lock,
  // when a collection exists, writes nothing, and the choice goes back to the player. The skip
  // is only as safe as "nothing to lose" is true AT THE WRITE.
  //
  // With COLLECTION_EDIT_ENABLED on, the write goes through the ledger (plan Decision 1): one
  // entry for the upload, a fresh id per confirm because the upload's own stamp is what makes a
  // double submit apply once, and the deck check a Replace now carries. Off, it is main's replace.
  let ownedAfter: OwnedCounts;
  if (ledger) {
    const result = await applyCollectionChange(
      userId,
      { kind: mode, items: pendingItems, uploadId },
      { id: randomUUID(), onlyIfEmpty: opts.firstImport, confirmShort: parseShortDecks(opts.confirmShort) },
    );
    switch (result.status) {
      case "notEmpty": return { needsConfirm: true, currentCollectionCount: result.owned };
      case "alreadyConfirmed": return;
      case "wouldShort": return { wouldShort: result.decks };
      case "missingCard": return { missingCard: result.names };
      case "applied": break;
      default: throw new Error(`upload confirm refused: ${result.status}`);
    }
    // A Replace's items ARE the collection after it; an Add's are only what it added, so its
    // receipt counts the collection from the rows the entry changed (plan Decision 8).
    ownedAfter = mode === "replace"
      ? pendingItemsToOwnedCounts(pendingItems)
      : ownedAfterEntry(ownedBefore, result.entry.rows);
  } else {
    const { alreadyConfirmed, notEmpty } = await replaceCollection(userId, pendingItems, {
      confirmUploadId: uploadId,
      onlyIfEmpty: opts.firstImport,
    });
    if (notEmpty !== null) return { needsConfirm: true, currentCollectionCount: notEmpty };
    if (alreadyConfirmed) return;
    ownedAfter = pendingItemsToOwnedCounts(pendingItems);
  }

  // INVALIDATION FIRST, RECEIPT SECOND. The replace has committed, so every cached figure
  // behind every one of these routes is already wrong; the receipt is a nicety by comparison.
  // Ordered the other way, a failure while assembling the receipt would leave the caches stale
  // too — and the early return above means no retry would ever repair either.
  //
  // The ROUTE LIST is `COLLECTION_ROUTES`, and it is checked rather than remembered: this set
  // was hand-assembled and wrong three review rounds running, each round naming a route the
  // last had missed. `pnpm check:collection-routes` walks every page and fails when one reads
  // the collection without being named there.
  invalidateCollectionReaders(userId);

  // THE RECEIPT. Assembled and stored by a helper the probe can call directly, because
  // everything above this line needs a request to exist and the receipt does not.
  await writeArrivalsReceipt({
    userId,
    uploadId,
    ownedAfter,
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
      //
      // BOTH fingerprints are taken before the compute, which is the whole
      // point of them: taken after, each would describe the state the compute
      // finished in rather than the state it read, and would match itself no
      // matter what moved underneath.
      const [generation, indexGen] = await Promise.all([
        collectionGeneration(userId),
        indexGeneration(),
      ]);
      const recs = await recommendCommanders(userId);
      await persistScores(userId, recs.results, generation, indexGen);
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
  // INSIDE `after`, AND THAT IS LOAD-BEARING. A Server Action that revalidates during its own
  // run re-renders the route it was called from into its own response, and this one is called
  // from `/collection`, whose payload is the largest in the app.
  //
  // Measured on 2026-09-16 at 1300px, picking a printing: 1,665,949 bytes of reply with the
  // revalidation inline, 122 bytes with it deferred. Cutting only `revalidatePath("/collection")`
  // and keeping the other two changed nothing — ONE revalidation of any path re-renders the
  // current route — so deferring is the whole fix, not the path list.
  //
  // Nothing on screen is waiting for it: the modal paints the pick optimistically and the
  // browse list patches its own copy of that one card, so the megabyte bought nothing.
  //
  // `updateTag` still reaches a Server Action context in here, which a route handler would not
  // — it throws there, and `revalidateTag` is the only alternative, which serves one stale read
  // of the very list this write just changed.
  after(() => invalidateArtCaches(userId));
  return true;
}

/**
 * Every cache a card-art pick makes stale. Both writes drop the same set, which is why it is
 * one function rather than two lists that could drift.
 */
function invalidateArtCaches(userId: string): void {
  // The browse payload carries the chosen printing's art, so it is stale now.
  revalidateUserLists(userId);
  revalidatePath("/collection");
  // A pick is keyed (user_id, oracle_id), so choosing #268 fills #268 and EMPTIES #262:
  // two cells change from one act, with the set's ratio unmoved. The set page is the only
  // surface where that swap is legible, and without this it happens invisibly.
  revalidatePath("/collection/sets/[code]", "page");
  // A commander's art on all three deck surfaces is the picked printing's now, so a pick
  // on a card leading a deck changes the tile, the header band and Home's resume rows —
  // which read the same `listDecksWithStats` payload the tile does. `"page"` on the
  // parameterised one: a route with a `[param]` is silently not invalidated without it.
  revalidatePath("/");
  revalidatePath("/decks");
  revalidatePath("/decks/[id]", "page");
  // And every commander surface, for the same reason: they draw the picked printing too.
  // `/commanders` and Home share a payload but not a route, `/decks/new` lists the legends
  // owned with their art, and the detail page is the row's own link target. Without these
  // a reader who has already visited one navigates back through the router cache and finds
  // the pick they just made undone.
  revalidatePath("/commanders");
  revalidatePath("/commanders/[slug]", "page");
  revalidatePath("/decks/new");
}

/**
 * Re-reads the place head's two figures. The `(list)/layout.tsx` that mounts the head once
 * across all three tabs fetches them on its own first mount only — a Next layout does not
 * re-run on a sibling navigation — so without this a collection change made in another tab
 * or on another device while the group stays mounted would leave the header's counts, and
 * Sets/Replace's visibility, stuck at whatever they were on arrival. The head calls this on
 * every tab switch and on window focus, the same cross-tab trigger `DeltaStrip` already
 * polls on for exactly this class of staleness.
 */
export async function refreshCollectionHeader(): Promise<{
  stats: { totalCards: number; uniqueCards: number };
  lastUpdatedLabel: string | null;
}> {
  const userId = await requireUserId();
  const [stats, lastUpdated] = await Promise.all([
    getCollectionStats(userId),
    getCollectionLastUpdated(userId),
  ]);
  // Formatted HERE, on the server, rather than handed to the client as a raw `Date` — the
  // head that renders this is a Client Component and would otherwise recompute the label
  // against the browser's own clock and timezone on hydration, which can disagree with the
  // server's render.
  return { stats, lastUpdatedLabel: lastUpdated ? formatLastUpdated(lastUpdated) : null };
}

/** Forget the pick, returning the card to the resolver's choice. */
export async function clearCardArtPreference(oracleId: string): Promise<void> {
  const userId = await requireUserId();
  await db.delete(cardArtPreferences).where(and(
    eq(cardArtPreferences.userId, userId),
    eq(cardArtPreferences.oracleId, oracleId),
  ));
  // Deferred for the reason `setCardArtPreference` states: a revalidation during the action
  // itself re-renders `/collection` into this reply, and clearing a pick is called from
  // exactly that page.
  after(() => invalidateArtCaches(userId));
}
