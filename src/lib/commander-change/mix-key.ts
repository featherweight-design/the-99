// The deck mix's cache key, extended by the live commander (audit F5).
//
// The mix is built for the commander leading the deck, so a swap must not read an entry cached for
// the old one.

import { eq } from "drizzle-orm";
import { db } from "../../db";
import { decks } from "../../db/schema";

/** Extra key parts: the live commander and partner ids. Plain strings, in the deck's own column
 *  order, so the key serializes the same way every time. */
export async function commanderKeyParts(deckId: string): Promise<string[]> {
  const [deck] = await db.select({ c: decks.commanderOracleId, p: decks.partnerOracleId })
    .from(decks).where(eq(decks.id, deckId));
  return deck ? [deck.c, deck.p ?? "-"] : [];
}
