"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { db } from "../../db";
import { collectionItems, csvUploads } from "../../db/schema";
import { requireUserId } from "../../lib/auth";
import { parseCollectionCsv, type CollectionRow, type ParseError } from "../../lib/manabox/parse";
import { parsePasteList } from "../../lib/manabox/paste";
import { matchRows } from "../../lib/collection/match";
import { loadMatchInputs, replaceCollection } from "../../lib/collection/import";
import { aggregatePendingItems, totalQuantity, type PendingItem } from "../../lib/collection/pending";
import { recommendCommanders } from "../../lib/recs/recommend";
import { collectionGeneration, persistScores } from "../../lib/recs/store";

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
  if (file.size > 5 * 1024 * 1024) throw new Error("File too large (max 5 MB)");
  const { rows, errors } = parseCollectionCsv(await file.text());
  return buildPreview({ userId, filename: file.name, rows, errors });
}

export async function previewPaste(text: string): Promise<UploadPreview> {
  const userId = await requireUserId();
  // Byte-accurate cap — text.length counts UTF-16 code units, which lets
  // multi-byte input exceed the intended size guard.
  if (Buffer.byteLength(text, "utf8") > 100_000) throw new Error("Paste too large (max 100 KB)");
  const { rows, errors } = parsePasteList(text);
  return buildPreview({ userId, filename: "paste.txt", rows, errors });
}

export async function confirmUpload(uploadId: string): Promise<void> {
  const userId = await requireUserId();
  const [upload] = await db.select().from(csvUploads)
    .where(and(eq(csvUploads.id, uploadId), eq(csvUploads.userId, userId)));
  if (!upload) throw new Error("upload not found");

  const { pendingItems } = upload.previewPayload as { pendingItems: PendingItem[] };
  if (pendingItems.length === 0) throw new Error("Upload has no matched cards; refusing to replace collection");
  // A preview written before migration 0008 carries no collectorNumber/finish;
  // replaceCollection coerces both rather than spreading undefined into the insert.
  await replaceCollection(userId, pendingItems, { confirmUploadId: uploadId });
  revalidatePath("/collection");
  revalidatePath("/");
  // Wiping commander_scores above changes what /commanders renders, and slugs are
  // assigned in rank order so cached detail pages can point at the wrong
  // commander. '[slug]' needs the 'page' type — it is a dynamic segment.
  revalidatePath("/commanders");
  revalidatePath("/commanders/[slug]", "page");

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
