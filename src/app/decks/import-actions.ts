"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "../../db";
import { cards, deckCards, deckUnresolvedRows, decks } from "../../db/schema";
import { requireUserId } from "../../lib/auth";
import { loadMatchInputs } from "../../lib/collection/import";
import { validateDeckName } from "../../lib/decks/deck-name";
import { buildDeckImport, type ImportNote } from "../../lib/decks/import";
import { parsePasteList } from "../../lib/manabox/paste";
import { isCommanderCandidate } from "../../lib/recs/score";
import {
  DECK_IMPORT_FILE_MAX_LABEL,
  deckImportMaxBytes,
  type DeckImportSource,
} from "../../lib/upload-limits";

const INSERT_BATCH = 500;

export type ImportDeckInput = {
  /** The decklist exactly as the player gave it — paste, file text, or fetched deck. */
  text: string;
  /**
   * Which entry point produced `text`, and therefore which cap applies. A paste is
   * typed by hand and stays small; a file or a fetched deck can carry far more and
   * gets the 2 MB deck-import cap. Without this the file cap would be enforced
   * nowhere and a valid 200 KB export would be rejected as an oversized paste.
   */
  source: DeckImportSource;
  name: string;
  /** Set only once the player has picked one; a declared commander needs no pick. */
  commanderOracleId?: string;
};

export type ImportDeckResult =
  | { ok: true; deckId: string; unresolvedCount: number; notes: ImportNote[] }
  /** States 11–12: the source named no commander, so the picker runs before any write. */
  | {
      ok: false;
      reason: "commanderNeeded";
      candidates: { oracleId: string; name: string; sourceLine: number }[];
    }
  /** State 10: nothing parsed at all. */
  | { ok: false; reason: "noRows" }
  /** State 9: lines parsed, none of them matched a card. */
  | { ok: false; reason: "noneMatched"; lineCount: number };

/**
 * Parses a decklist and creates the deck it describes, unresolved lines included.
 *
 * There is deliberately **no dedupe**: importing the same list twice creates two
 * decks. Updating in place is sync — a different and much larger feature — and
 * quietly becoming it is the failure mode this comment guards against.
 */
export async function importDeck(input: ImportDeckInput): Promise<ImportDeckResult> {
  const userId = await requireUserId();
  const name = validateDeckName(input.name);
  const maxBytes = deckImportMaxBytes(input.source);
  if (Buffer.byteLength(input.text, "utf8") > maxBytes) {
    throw new Error(
      input.source === "paste"
        ? "Paste too large (max 100 KB)"
        : `Decklist too large (max ${DECK_IMPORT_FILE_MAX_LABEL})`,
    );
  }

  // Parsed once here only to learn which Scryfall ids to index; buildDeckImport
  // re-parses the raw text because section markers are invisible in a row list.
  const { rows } = parsePasteList(input.text);
  if (rows.length === 0) return { ok: false, reason: "noRows" };

  const { catalog, indexes } = await loadMatchInputs(rows, { detailed: true });
  const result = buildDeckImport({ text: input.text, catalog, indexes });

  // Order matters, and the guard is on `cards` alone. Every line that fails to match
  // becomes an unresolved row, so "nothing matched" is an empty `cards` beside a full
  // `unresolved` — never two empty arrays. Checking after the commander gate would
  // report state 9 as an empty commander picker instead.
  if (result.cards.length === 0) {
    return { ok: false, reason: "noneMatched", lineCount: rows.length };
  }

  const commanderOracleId = input.commanderOracleId ?? result.declaredCommander?.oracleId;
  if (!commanderOracleId) {
    // decks.commander_oracle_id is notNull, so a commander-less deck is a schema
    // impossibility as well as a product one. Nothing is written either way.
    return { ok: false, reason: "commanderNeeded", candidates: result.legendaryCandidates };
  }

  // Server actions are reachable via crafted requests — re-validate the commander
  // rather than trusting the id the picker sent back.
  const [commander] = await db.select().from(cards).where(eq(cards.oracleId, commanderOracleId));
  if (!commander || !commander.commanderLegal || !isCommanderCandidate(commander)) {
    throw new Error("card is not a legal commander");
  }

  // A commander the player picked from the 99 must not also sit in the 99.
  const deckCardValues = result.cards.filter((c) => c.oracleId !== commanderOracleId);

  // One transaction: a deck that exists without its unresolved rows is a deck that
  // silently lost the player's data, and there is no second chance to write them.
  const deckId = await db.transaction(async (tx) => {
    const [deck] = await tx
      .insert(decks)
      .values({ userId, name, commanderOracleId })
      .returning({ id: decks.id });

    for (let i = 0; i < deckCardValues.length; i += INSERT_BATCH) {
      await tx.insert(deckCards).values(
        deckCardValues.slice(i, i + INSERT_BATCH).map((c) => ({
          deckId: deck.id,
          oracleId: c.oracleId,
          quantity: c.quantity,
        })),
      );
    }

    for (let i = 0; i < result.unresolved.length; i += INSERT_BATCH) {
      await tx.insert(deckUnresolvedRows).values(
        result.unresolved.slice(i, i + INSERT_BATCH).map((r) => ({
          deckId: deck.id,
          rawName: r.rawName,
          quantity: r.quantity,
          sourceLine: r.sourceLine,
        })),
      );
    }

    return deck.id;
  });

  revalidatePath("/decks");
  return { ok: true, deckId, unresolvedCount: result.unresolved.length, notes: result.notes };
}
