/**
 * The receipt a ticked import (`I own these cards`, no-collection entry S10) leaves on the deck page, read from the
 * ledger. The entry id comes off the URL (`?added=`, beside `imported=1`), so it is a claim: this answers only when
 * the entry is the reader's OWN `add`, written for THIS deck (`deck:<deck id>`), with its rows still held and nothing
 * reverting it, and gives nothing otherwise, so a forged, foreign or reverted link draws the plain strip.
 *
 * Not a "use server" module: it takes a user id.
 */
import type { HistoryRow } from "../../db/schema";
import { deckSource } from "../collection/deck-source";
import { receiptEntryQuery } from "../precons/add-receipt-read";
import { isUuid } from "../uuid";

export type ImportAddReceipt = { entryId: string; copies: number };

type Entry = { source: string | null; kind: string; revertedBy: string | null; rows: HistoryRow[] | unknown[] | null };

/**
 * The copies the entry added to this deck's collection, or null when it is not this deck's standing add. A reverted
 * add draws nothing: a revert that was itself reverted is a case no navigation straight from the import can reach.
 * Pure, so a test can start from a row.
 */
export function importAddCopies(entry: Entry | undefined, deckId: string): number | null {
  if (!entry || entry.kind !== "add" || entry.revertedBy !== null || entry.rows === null) return null;
  if (entry.source !== deckSource(deckId)) return null;
  const copies = (entry.rows as HistoryRow[]).reduce(
    (n, r) => n + Math.max(0, (r.after?.quantity ?? 0) - (r.before?.quantity ?? 0)),
    0,
  );
  return copies > 0 ? copies : null;
}

export async function readImportAddReceipt(userId: string, entryId: unknown, deckId: string): Promise<ImportAddReceipt | null> {
  if (typeof entryId !== "string" || !isUuid(entryId)) return null;
  const [entry] = await receiptEntryQuery(userId, entryId);
  const copies = importAddCopies(entry, deckId);
  return copies === null ? null : { entryId, copies };
}
