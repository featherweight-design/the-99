/**
 * The write half a deck built from a whole list shares: `importDeck` (pasted or file text) and
 * `createDeckFromPrecon` (a precon's list). One transaction, so a deck never exists without the
 * rows that make it the list it was built from. Not a "use server" module: every export of one is
 * an endpoint, and this takes a user id.
 */
import { db } from "../../db";
import { deckCards, deckPrintings, deckUnresolvedRows, decks } from "../../db/schema";
import type { ImportPrintingPick } from "./import-printings";

const INSERT_BATCH = 500;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type ImportedDeck = {
  userId: string;
  name: string;
  commanderOracleId: string;
  partnerOracleId: string | null;
  /** The list, the commanders already taken out. */
  cards: { oracleId: string; quantity: number }[];
  unresolved?: { rawName: string; quantity: number; sourceLine: number }[];
  printings?: ImportPrintingPick[];
  /** The precon a "Start a deck from this" began with. */
  builtFromPrecon?: string | null;
};

/** Writes the deck and its rows inside `tx`, and returns the new deck's id. */
export async function writeImportedDeck(tx: Tx, d: ImportedDeck): Promise<string> {
  const [deck] = await tx
    .insert(decks)
    .values({
      userId: d.userId,
      name: d.name,
      commanderOracleId: d.commanderOracleId,
      partnerOracleId: d.partnerOracleId,
      builtFromPrecon: d.builtFromPrecon ?? null,
    })
    .returning({ id: decks.id });

  for (let i = 0; i < d.cards.length; i += INSERT_BATCH) {
    await tx.insert(deckCards).values(
      d.cards.slice(i, i + INSERT_BATCH).map((c) => ({ deckId: deck.id, oracleId: c.oracleId, quantity: c.quantity })),
    );
  }
  const unresolved = d.unresolved ?? [];
  for (let i = 0; i < unresolved.length; i += INSERT_BATCH) {
    await tx.insert(deckUnresolvedRows).values(
      unresolved.slice(i, i + INSERT_BATCH).map((r) => ({
        deckId: deck.id, rawName: r.rawName, quantity: r.quantity, sourceLine: r.sourceLine,
      })),
    );
  }
  const printings = d.printings ?? [];
  for (let i = 0; i < printings.length; i += INSERT_BATCH) {
    await tx.insert(deckPrintings).values(printings.slice(i, i + INSERT_BATCH).map((p) => ({ deckId: deck.id, ...p })));
  }
  return deck.id;
}
