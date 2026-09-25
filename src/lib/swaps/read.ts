/** The swap tools' page reads. SERVER-ONLY. */
import { and, eq } from "drizzle-orm";

import { db } from "../../db";
import { decks } from "../../db/schema";

/** The deck's stored Shopping limit, in cents: null for the $10 default, or when the deck is not the reader's. */
export async function readShoppingLimit(deckId: string, userId: string): Promise<number | null> {
  const [row] = await db.select({ cents: decks.shoppingLimitCents }).from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)));
  return row?.cents ?? null;
}
