// The deck mix's cache key, extended by the live commander (audit F5).
//
// The mix is built for the commander leading the deck, so a swap must not read an entry cached for
// the old one. The live ids join the key only with CHANGE_COMMANDER_ENABLED on: off, nothing moves
// the columns, and every deck keeps the key it has today rather than paying a cold read after the
// deploy for a change that cannot happen.

import { eq } from "drizzle-orm";
import { db } from "../../db";
import { decks } from "../../db/schema";
import { changeCommanderEnabled } from "./flag";

/** Extra key parts: the live commander and partner ids, or nothing with the switch off. Plain
 *  strings, in the deck's own column order, so the key serializes the same way every time. */
export async function commanderKeyParts(deckId: string, env: NodeJS.ProcessEnv = process.env): Promise<string[]> {
  if (!changeCommanderEnabled(env)) return [];
  const [deck] = await db.select({ c: decks.commanderOracleId, p: decks.partnerOracleId })
    .from(decks).where(eq(decks.id, deckId));
  return deck ? [deck.c, deck.p ?? "-"] : [];
}
