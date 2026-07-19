"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "../../db";
import { cards, collectionItems, csvUploads } from "../../db/schema";
import { requireUserId } from "../../lib/auth";
import { parseCollectionCsv, type CollectionRow, type ParseError } from "../../lib/manabox/parse";
import { parsePasteList } from "../../lib/manabox/paste";
import { matchRows } from "../../lib/collection/match";

export type UploadPreview = {
  uploadId: string;
  matchedCardCount: number;
  unmatchedRows: { name: string; setCode: string; line: number }[];
  parseErrors: { line: number; reason: string }[];
  currentCollectionCount: number;
  filename: string;
  rowCount: number;
};

type PendingItem = { oracleId: string; setCode: string; foil: boolean; condition: string | null; quantity: number };

/**
 * Shared post-parse pipeline for previewUpload / previewPaste.
 * Guards the zero-row case, matches against the catalog, aggregates matched
 * rows to compact (oracleId,setCode,foil) totals, records currentCollectionCount,
 * and writes the csv_uploads row that confirmUpload reads back.
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

  const catalog = await db
    .select({ oracleId: cards.oracleId, scryfallId: cards.scryfallId, name: cards.name })
    .from(cards);
  const { matched, unmatched } = matchRows(rows, catalog);

  const agg = new Map<string, PendingItem>();
  for (const { row, oracleId } of matched) {
    const key = `${oracleId}|${row.setCode}|${row.foil}`;
    const existing = agg.get(key);
    if (existing) {
      existing.quantity += row.quantity;
      if (existing.condition !== row.condition) existing.condition = null;
    } else {
      agg.set(key, { oracleId, setCode: row.setCode, foil: row.foil, condition: row.condition, quantity: row.quantity });
    }
  }
  const pendingItems = [...agg.values()];
  const matchedCardCount = pendingItems.reduce((n, i) => n + i.quantity, 0);

  const [{ count: currentCollectionCount }] = await db
    .select({ count: sql<number>`coalesce(sum(${collectionItems.quantity}), 0)::int` })
    .from(collectionItems)
    .where(eq(collectionItems.userId, userId));

  const unmatchedPayload = unmatched.map((r) => ({ name: r.name, setCode: r.setCode, line: r.line }));

  const [upload] = await db.insert(csvUploads).values({
    userId,
    filename,
    rowCount: rows.length,
    unmatchedCount: unmatched.length,
    previewPayload: {
      unmatched: unmatchedPayload,
      parseErrors: errors.map((e) => ({ line: e.line, reason: e.reason })),
      pendingItems,
    },
  }).returning({ id: csvUploads.id });

  return {
    uploadId: upload.id,
    matchedCardCount,
    unmatchedRows: unmatchedPayload,
    parseErrors: errors.map((e) => ({ line: e.line, reason: e.reason })),
    currentCollectionCount,
    filename,
    rowCount: rows.length,
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
  const values = pendingItems.map((v) => ({ userId, ...v }));
  await db.transaction(async (tx) => {
    await tx.delete(collectionItems).where(eq(collectionItems.userId, userId));
    for (let i = 0; i < values.length; i += 500) {
      await tx.insert(collectionItems).values(values.slice(i, i + 500));
    }
  });
  revalidatePath("/collection");
  revalidatePath("/");
}
