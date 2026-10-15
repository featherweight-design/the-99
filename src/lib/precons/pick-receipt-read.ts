/**
 * The receipt a precon pick leaves on its destination (no-collection entry S5), read from the ledger. The entry ids
 * come off the URL (`?precons=`), so they are a claim: an id counts only when its entry is the reader's OWN precon
 * `add` whose cards still stand (`add-receipt-read.ts`' rule, restated here so Home does not import the write path),
 * and a forged, foreign or reverted id draws nothing.
 */
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { collectionHistory, precons } from "../../db/schema";
import { preconAddDecks, preconSource, standingPreconAdds } from "./added";
import { parsePickReceipt } from "./pick";

/** `decks`: how many of the entries started a deck that still stands (an owned start links it, `start-owned.ts`). */
export type PickReceipt = { entryIds: string[]; names: string[]; copies: number; tokens: number; decks: number };

type ReceiptEntry = {
  id: string;
  rows: { before?: { quantity: number } | null; after?: { quantity: number } | null }[] | null;
  preconTokens: { quantity: number }[] | null;
};

/**
 * The strip's figures over the entries that count, in the URL's order: copies each added, the tokens each read, and
 * how many started a deck (`decks`, the entry ids with a deck of the reader's). Pure.
 */
export function summarisePickReceipt(entries: readonly (ReceiptEntry & { name: string })[], decks: ReadonlySet<string> = new Set()): PickReceipt | null {
  if (entries.length === 0) return null;
  let copies = 0;
  let tokens = 0;
  for (const e of entries) {
    for (const r of e.rows ?? []) copies += Math.max(0, (r.after?.quantity ?? 0) - (r.before?.quantity ?? 0));
    for (const t of e.preconTokens ?? []) tokens += t.quantity;
  }
  return { entryIds: entries.map((e) => e.id), names: entries.map((e) => e.name), copies, tokens, decks: entries.filter((e) => decks.has(e.id)).length };
}

/** The precon an entry added, or null: only an `add` whose source is `precon:<file>` and whose rows were kept. Pure. */
export function pickEntryFile(e: { kind: string; source: string | null; rows: unknown[] | null } | undefined): string | null {
  const prefix = preconSource("");
  if (!e || e.kind !== "add" || e.rows === null || e.source === null || !e.source.startsWith(prefix)) return null;
  return e.source.length > prefix.length ? e.source.slice(prefix.length) : null;
}

export async function readPickReceipt(userId: string, raw: string | string[] | undefined): Promise<PickReceipt | null> {
  const ids = parsePickReceipt(raw);
  if (ids.length === 0) return null;
  const rows = await db
    .select({
      id: collectionHistory.id, source: collectionHistory.source, kind: collectionHistory.kind,
      rows: collectionHistory.rows, preconTokens: collectionHistory.preconTokens,
    })
    .from(collectionHistory)
    .where(and(eq(collectionHistory.userId, userId), inArray(collectionHistory.id, ids)));
  const standing = new Set((await standingPreconAdds(userId, db)).map((a) => a.id));
  const kept = ids.flatMap((id) => {
    const e = rows.find((r) => r.id === id);
    const fileName = pickEntryFile(e);
    return e && fileName !== null && standing.has(id) ? [{ ...e, fileName }] : [];
  });
  if (kept.length === 0) return null;
  const heads = await db.select({ fileName: precons.fileName, name: precons.name }).from(precons)
    .where(inArray(precons.fileName, kept.map((k) => k.fileName)));
  const name = new Map(heads.map((h) => [h.fileName, h.name]));
  const decks = await preconAddDecks(userId, kept.map((k) => k.id));
  return summarisePickReceipt(kept.map((k) => ({ ...k, name: name.get(k.fileName) ?? k.fileName })), new Set(decks.keys()));
}
