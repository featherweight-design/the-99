/**
 * The deck notes queries. Not a `"use server"` module: its functions take the reader as an argument, so
 * they must never be client-callable. `app/decks/notes-actions.ts` is the endpoint and owns the flag, the
 * session, `requireDeck`, the shape checks and the revalidation; this owns the SQL.
 *
 * EVERY QUERY CARRIES `deck_id` AND `user_id` in its own where clause. `requireDeck` proves the caller
 * owns the deck, and does not prove a note id belongs to it, so a note of another deck or another
 * player fails to match instead of being touched.
 */
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, deckNotes, decks } from "../../db/schema";
import { isGameCardWhere } from "../cards/game-card-where";
import { nameSearch } from "../cards/name-search";
import { NOTES_PER_DECK } from "../copy/deck-notes";

/**
 * The current catalog name for each GAME card among the ids; any other id is absent. The picker offers only
 * game cards, and an action is directly callable, so a write must enforce the same domain: a forged tag for
 * a token or sticker row refuses the note instead of being stored.
 */
export async function currentNames(oracleIds: readonly string[]): Promise<Map<string, string>> {
  if (oracleIds.length === 0) return new Map();
  const rows = await db.select({ id: cards.oracleId, name: cards.name }).from(cards).where(and(inArray(cards.oracleId, [...oracleIds]), isGameCardWhere()));
  return new Map(rows.map((r) => [r.id, r.name]));
}

/**
 * Add a note unless the deck already holds `NOTES_PER_DECK`, done included. The count and the insert run
 * under a lock on the deck's own row, so two adds at 99 cannot both pass the check: the second waits, then
 * counts 100 and answers "cap".
 */
export async function insertNote(deckId: string, userId: string, body: string): Promise<"ok" | "cap"> {
  return db.transaction(async (tx) => {
    await tx.select({ id: decks.id }).from(decks).where(and(eq(decks.id, deckId), eq(decks.userId, userId))).for("update");
    const [{ n }] = await tx.select({ n: count() }).from(deckNotes).where(eq(deckNotes.deckId, deckId));
    if (n >= NOTES_PER_DECK) return "cap" as const;
    await tx.insert(deckNotes).values({ deckId, userId, body });
    return "ok" as const;
  });
}

const mine = (deckId: string, userId: string, noteId: string) =>
  and(eq(deckNotes.id, noteId), eq(deckNotes.deckId, deckId), eq(deckNotes.userId, userId));

/** The date stays the creation date: only `body` and `updated_at` move. False when no such note is the player's. */
export async function updateNoteBody(deckId: string, userId: string, noteId: string, body: string): Promise<boolean> {
  const rows = await db.update(deckNotes).set({ body, updatedAt: sql`now()` }).where(mine(deckId, userId, noteId)).returning({ id: deckNotes.id });
  return rows.length > 0;
}

/** Select (done) or unselect (open). Done keeps its own date, and selecting a note already done leaves that date alone (a double-tap or a retry must not move it); reopening clears it. */
export async function setNoteDone(deckId: string, userId: string, noteId: string, done: boolean): Promise<boolean> {
  const rows = await db.update(deckNotes).set({ doneAt: done ? sql`coalesce(${deckNotes.doneAt}, now())` : null }).where(mine(deckId, userId, noteId)).returning({ id: deckNotes.id });
  return rows.length > 0;
}

export async function removeNote(deckId: string, userId: string, noteId: string): Promise<boolean> {
  const rows = await db.delete(deckNotes).where(mine(deckId, userId, noteId)).returning({ id: deckNotes.id });
  return rows.length > 0;
}

/** `flavorName` is the Secret Lair name the query caught, for a row whose own name did not match; null otherwise. */
export type NoteCardHit = { oracleId: string; name: string; typeLine: string; commanderLegal: boolean; imageUri: string | null; flavorName: string | null };

/**
 * The `[[` picker's "any card" lookup. Any GAME card, a banned one included (a note can name a card to
 * remember it), so it has no legality filter and says what the legality is. `searchCards` stays as it is:
 * it is the Add panel's per-keystroke search with ownership, availability and facts a note never draws.
 */
export async function searchNoteCards(query: string): Promise<NoteCardHit[]> {
  const match = nameSearch(query);
  if (!match) return [];
  const rows = await db
    .select({ oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine, commanderLegal: cards.commanderLegal, imageUri: cards.imageUri, flavorName: match.flavorHits.flavorName })
    .from(cards)
    // The name match may be a Secret Lair flavor name, which lives in the join `nameSearch` hands back.
    .leftJoin(match.flavorHits, eq(match.flavorHits.oracleId, cards.oracleId))
    .where(and(match.where, isGameCardWhere()))
    .limit(20);
  return rows.map((r) => ({ ...r, flavorName: match.shownFlavor(r.name, r.flavorName) }));
}
