/**
 * The receipt a start-with-collection leaves on the deck page, read from the ledger. The entry id comes off
 * the URL (`?added=`), so it is a claim: this answers for it only when the entry is the reader's OWN, an `add`,
 * written by a precon add (`precon:<file>`) and not reverted, and gives nothing for anything else (another
 * reader's entry, an upload's, a malformed id, a revert), so a forged or stale link draws no receipt.
 */
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { collectionHistory, precons } from "../../db/schema";
import { isUuid } from "../uuid";
import { committedAnswer } from "./add";
import { preconSource } from "./added";

export type PreconAddReceipt = {
  entryId: string;
  /** The precon's name; the file name when the feed has since dropped it. */
  name: string;
  cards: number;
  copies: number;
  foil: number;
  tokens: { marked: number; names: string[] };
};

type Entry = { source: string | null; kind: string; revertedBy: string | null };

/** The precon an entry is a standing add of, or null: only an unreverted `add` whose source is `precon:<file>` is one. */
export function receiptFileName(entry: Entry | undefined): string | null {
  if (!entry || entry.kind !== "add" || entry.revertedBy !== null || entry.source === null) return null;
  const prefix = preconSource("");
  return entry.source.startsWith(prefix) && entry.source.length > prefix.length ? entry.source.slice(prefix.length) : null;
}

/** The entry read, apart so a test can render its SQL: scoped to the reader by id AND user. */
export function receiptEntryQuery(userId: string, entryId: string) {
  return db
    .select({ source: collectionHistory.source, kind: collectionHistory.kind, revertedBy: collectionHistory.revertedBy })
    .from(collectionHistory)
    .where(and(eq(collectionHistory.id, entryId), eq(collectionHistory.userId, userId)));
}

export async function readPreconAddReceipt(userId: string, entryId: unknown): Promise<PreconAddReceipt | null> {
  if (typeof entryId !== "string" || !isUuid(entryId)) return null;
  const [entry] = await receiptEntryQuery(userId, entryId);
  const fileName = receiptFileName(entry);
  if (fileName === null) return null;
  const answer = await committedAnswer(userId, fileName, entryId);
  if (!answer || !answer.ok) return null;
  const [head] = await db.select({ name: precons.name }).from(precons).where(eq(precons.fileName, fileName));
  return { entryId, name: head?.name ?? fileName, cards: answer.cards, copies: answer.copies, foil: answer.foil, tokens: answer.tokens };
}
