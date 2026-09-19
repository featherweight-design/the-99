// The pre-filled `/decks/new?commander=…` door's own read.
//
// Extracted from the route so it can be tested: the door arrives from a synergy link
// rather than from the picker, so it misses the list's own resolution, and it draws the
// card at a larger size than any row does. Reverting it to the catalog's art left the
// pre-filled card wrong with the whole suite green, which is what this module closes.
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { cards } from "../../db/schema";
import { resolveOwnedPrintings } from "../collection/owned-printings";
import { isCommanderCandidate } from "../recs/score";

export type PreFilledCommander = {
  oracleId: string;
  name: string;
  typeLine: string;
  colorIdentity: string[];
  imageUri: string | null;
};

/**
 * The commander the `?commander=` parameter names, drawn from the copy the reader owns —
 * or null when the parameter names no card, a card that cannot lead a deck, or one that
 * is not a commander candidate.
 *
 * The legality check stays HERE rather than moving to the action: the action re-checks
 * whatever it is handed anyway, and this door has to decide which of the two it draws.
 */
export async function loadPreFilledCommander(
  userId: string,
  oracleId: string,
): Promise<PreFilledCommander | null> {
  const [row] = await db.select().from(cards).where(eq(cards.oracleId, oracleId));
  if (!row || !row.commanderLegal || !isCommanderCandidate(row)) return null;

  const owned = (await resolveOwnedPrintings(userId, [row.oracleId])).get(row.oracleId);
  return {
    oracleId: row.oracleId,
    // Each falls back on its own: an owned printing with no image of its own keeps the
    // catalog's, and a copy printing the oracle name carries no printed name at all.
    name: owned?.printedName ?? row.name,
    typeLine: row.typeLine,
    colorIdentity: row.colorIdentity,
    imageUri: owned?.imageUri ?? row.imageUri,
  };
}
