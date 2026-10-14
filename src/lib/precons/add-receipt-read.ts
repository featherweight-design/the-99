/**
 * The receipt a start-with-collection leaves on the deck page, read from the ledger. The entry id comes off
 * the URL (`?added=`), so it is a claim: this answers for it only when the entry is the reader's OWN, an `add`,
 * written by a precon add (`precon:<file>`) whose cards still stand, and gives nothing for anything else (another
 * reader's entry, an upload's, a malformed id, a revert), so a forged or stale link draws no receipt.
 */
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { collectionHistory, decks, precons } from "../../db/schema";
import { isUuid } from "../uuid";
import { committedAnswer } from "./add";
import { preconSource, standingPreconAdds } from "./added";

export type PreconAddReceipt = {
  entryId: string;
  /** The precon's name; the file name when the feed has since dropped it. */
  name: string;
  cards: number;
  copies: number;
  foil: number;
  tokens: { marked: number; names: string[] };
};

type Entry = { source: string | null; kind: string; revertedBy: string | null; rows: unknown[] | null };

/**
 * The precon an entry was written for, or null: only an `add` whose source is `precon:<file>` is one. Whether its
 * cards still STAND is `standingPreconAdds`' rule (an add whose revert was itself reverted stands again), asked
 * once in `readPreconAddReceipt`, never restated here.
 */
export function receiptFileName(entry: Entry | undefined): string | null {
  // A pruned entry (retention nulls its rows) can no longer say what it added, so it draws no receipt, Undo included.
  if (!entry || entry.kind !== "add" || entry.source === null || entry.rows === null) return null;
  const prefix = preconSource("");
  return entry.source.startsWith(prefix) && entry.source.length > prefix.length ? entry.source.slice(prefix.length) : null;
}

/** The entry read, apart so a test can render its SQL: scoped to the reader by id AND user. */
export function receiptEntryQuery(userId: string, entryId: string) {
  return db
    .select({ source: collectionHistory.source, kind: collectionHistory.kind, revertedBy: collectionHistory.revertedBy, rows: collectionHistory.rows })
    .from(collectionHistory)
    .where(and(eq(collectionHistory.id, entryId), eq(collectionHistory.userId, userId)));
}

/**
 * Whether the deck was started from the precon the entry added: the deck's `built_from_precon` is the plain edition,
 * and a Collector's Edition twin adds its OWN box, so the entry's file may be a twin of the deck's. Pure.
 */
export function sameBox(deckBuiltFrom: string | null | undefined, entryFile: string, entryFileTwinOf: string | null | undefined): boolean {
  return deckBuiltFrom != null && (deckBuiltFrom === entryFile || deckBuiltFrom === entryFileTwinOf);
}

export async function readPreconAddReceipt(userId: string, entryId: unknown, deckId: string): Promise<PreconAddReceipt | null> {
  if (typeof entryId !== "string" || !isUuid(entryId)) return null;
  const [entry] = await receiptEntryQuery(userId, entryId);
  const fileName = receiptFileName(entry);
  if (fileName === null) return null;
  const standing = await standingPreconAdds(userId, db, { fileName });
  if (!standing.some((a) => a.id === entryId)) return null;
  const answer = await committedAnswer(userId, fileName, entryId);
  if (!answer || !answer.ok) return null;
  // Only on the deck the start made: an entry from some other box draws nothing here, Undo included.
  const [deck] = await db.select({ builtFrom: decks.builtFromPrecon }).from(decks).where(and(eq(decks.id, deckId), eq(decks.userId, userId)));
  const [head] = await db.select({ name: precons.name, twinOf: precons.twinOf }).from(precons).where(eq(precons.fileName, fileName));
  if (!sameBox(deck?.builtFrom, fileName, head?.twinOf)) return null;
  return { entryId, name: head?.name ?? fileName, cards: answer.cards, copies: answer.copies, foil: answer.foil, tokens: answer.tokens };
}
