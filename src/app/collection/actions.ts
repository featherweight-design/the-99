"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "../../db";
import { cards, collectionItems, csvUploads } from "../../db/schema";
import { requireUserId } from "../../lib/auth";
import { parseManaBoxCsv } from "../../lib/manabox/parse";
import { matchRows } from "../../lib/collection/match";

export type UploadPreview = {
  uploadId: string;
  matchedCardCount: number; // total card quantity across matched rows
  unmatchedRows: { name: string; setCode: string }[];
  parseErrors: { line: number; reason: string }[];
  currentCollectionCount: number; // total card quantity in the current collection
};

type PendingItem = { oracleId: string; setCode: string; foil: boolean; condition: string | null; quantity: number };

// Matched rows are aggregated to compact (oracleId,setCode,foil) totals before
// being stashed on the upload record: the JSONB stays small for large collections
// and confirm becomes a plain insert.
export async function previewUpload(formData: FormData): Promise<UploadPreview> {
  const userId = await requireUserId();
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No CSV file provided");
  const { rows, errors } = parseManaBoxCsv(await file.text());
  // Fatal-parse guard: a CSV yielding zero rows (wrong file, missing headers)
  // must never become a confirmable preview — confirm replaces the collection,
  // so an empty preview would silently wipe it.
  if (rows.length === 0) {
    throw new Error(errors[0] ? `CSV parse failed: ${errors[0].reason}` : "CSV contained no data rows");
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
      // Same printing in multiple conditions collapses to one row (PK excludes condition);
      // a mixed-condition stack has no single truthful condition, so store null.
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

  const [upload] = await db.insert(csvUploads).values({
    userId,
    filename: file.name,
    rowCount: rows.length,
    unmatchedCount: unmatched.length,
    previewPayload: { unmatched, parseErrors: errors, pendingItems },
  }).returning({ id: csvUploads.id });

  return {
    uploadId: upload.id,
    matchedCardCount,
    unmatchedRows: unmatched.map((r) => ({ name: r.name, setCode: r.setCode })),
    parseErrors: errors.map((e) => ({ line: e.line, reason: e.reason })),
    currentCollectionCount,
  };
}

export async function confirmUpload(uploadId: string): Promise<void> {
  const userId = await requireUserId();
  const [upload] = await db.select().from(csvUploads)
    .where(and(eq(csvUploads.id, uploadId), eq(csvUploads.userId, userId)));
  if (!upload) throw new Error("upload not found");

  const { pendingItems } = upload.previewPayload as { pendingItems: PendingItem[] };
  if (pendingItems.length === 0) throw new Error("Upload has no matched cards; refusing to replace collection");
  const values = pendingItems.map((v) => ({ userId, ...v }));
  // Full replace, transactional.
  await db.transaction(async (tx) => {
    await tx.delete(collectionItems).where(eq(collectionItems.userId, userId));
    for (let i = 0; i < values.length; i += 500) {
      await tx.insert(collectionItems).values(values.slice(i, i + 500));
    }
  });
  revalidatePath("/collection");
}
