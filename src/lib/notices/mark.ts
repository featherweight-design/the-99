/**
 * Marking notices READ (plan PR 6). SERVER-ONLY: it imports the database. Kept out of
 * `actions.ts` because every export of a "use server" module is a callable action, and this one
 * takes the user id on trust; the action resolves it from the session first.
 */
import { and, eq, sql } from "drizzle-orm";

import { db } from "../../db";
import { deckProfiles, decks } from "../../db/schema";
import { liveOffendingIds, type DeckNotices } from "./read";

/**
 * The two marks, each guarded on the owner. The data mark only ever moves forward. The legality
 * set has no order to move forward in, so it is compared instead: under the deck row's lock, it is
 * written only while it is still the set the deck's cards give. An open that read before an edit
 * and finishes after a later open would otherwise write its older set back, and the dot would
 * return over a set the player had already seen.
 *
 * The deck row is locked FIRST, the order every list edit takes (the deck, then `touchDeck`'s
 * profile row): the other order deadlocks against an edit landing while Notices opens.
 *
 * Returns whether the legality set was recorded, so the caller quiets its dot only when it was.
 */
export async function markNoticesRead(deckId: string, userId: string, marks: DeckNotices["readMarks"]): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [deck] = await tx
      .select({ commander: decks.commanderOracleId, partner: decks.partnerOracleId })
      .from(decks)
      .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
      .for("update");
    if (!deck) return false;
    await tx
      .update(deckProfiles)
      .set({ noticesReadSeq: sql`greatest(${deckProfiles.noticesReadSeq}, ${marks.seq})` })
      .where(and(eq(deckProfiles.deckId, deckId), eq(deckProfiles.userId, userId)));
    const live = await liveOffendingIds(tx, deckId, [deck.commander, ...(deck.partner ? [deck.partner] : [])]);
    if (!sameIds(live, marks.violations)) return false;
    await tx
      .update(decks)
      .set({ noticesLegalSeen: marks.violations })
      .where(and(eq(decks.id, deckId), eq(decks.userId, userId)));
    return true;
  });
}

/** Both are sorted, deduplicated id lists (`offendingIds`). */
function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}
