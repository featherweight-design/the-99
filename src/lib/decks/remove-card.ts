import { and, eq, sql } from "drizzle-orm";

import { db } from "../../db";
import { deckCards, decks } from "../../db/schema";
import { pruneOrphanLocks } from "./locks";
import { pruneOrphanProxies } from "./prune-proxies";
import { touchDeck } from "./touch";

/**
 * One copy of a card out of a deck's draft: the deck page's remove, and Find a deck's undo of an
 * `Add only`. The caller has already checked the deck is the reader's. Returns whether a copy went.
 */
export async function removeOneCopy(deckId: string, oracleId: string): Promise<boolean> {
  // Decrement multiples (basics); delete the row once quantity would hit 0.
  //
  // Both halves take the row's own lock, in one transaction, because the choice
  // between them is read-then-write and `restoreDraftFromVersion` replaces
  // `deck_cards` wholesale under that same lock. Run unlocked, a removal that
  // waited out a restore would find its decrement matching nothing and fall
  // through to an unconditional delete — taking a card straight back out of the
  // list the restore had just put back, with nothing recording it. Locking
  // first turns that case into the right answer instead: the row this removal
  // named is gone, so there is nothing to remove.
  return db.transaction(async (tx) => {
    // The DECK row first, then the card row. Every other deck write takes them
    // in that order — `addCardToDeck`, the fill, the top-off,
    // `restoreDraftFromVersion` — and this path now ends in a stamp on `decks`,
    // so taking the child first would leave a removal holding the card while it
    // waits for the deck, against a restore holding the deck while it waits for
    // the card. One order everywhere is what makes that pair impossible.
    await tx.execute(sql`select 1 from ${decks} where ${decks.id} = ${deckId} for update`);
    const [row] = await tx.select({ quantity: deckCards.quantity })
      .from(deckCards)
      .where(and(eq(deckCards.deckId, deckId), eq(deckCards.oracleId, oracleId)))
      .for("update");
    if (!row) return false;
    const where = and(eq(deckCards.deckId, deckId), eq(deckCards.oracleId, oracleId));
    if (row.quantity > 1) await tx.update(deckCards).set({ quantity: row.quantity - 1 }).where(where);
    else {
      await tx.delete(deckCards).where(where);
      // The slot is gone, so the deck's statement about it goes with it.
      await pruneOrphanProxies(tx, deckId);
      await pruneOrphanLocks(tx, deckId);
    }
    // Inside the `if (!row)` guard's shadow deliberately: a removal that found
    // nothing wrote nothing, and a stamp for a write that did not happen is the
    // one lie this column can tell.
    await touchDeck(tx, deckId);
    return true;
  });
}
