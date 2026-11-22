import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { cards, decks } from "../../db/schema";
import { commanderDisplayName } from "../cards/printed-name";
import { deckIdentity } from "./format";
import { resolveCommanderPrintingsByDeck } from "./printings";
import type { LeanOpenFacts } from "./open-entry";

const partnerCards = alias(cards, "partner_cards");

/**
 * The header facts of ONE deck for a direct load, with no stats: the deck row, its commander (drawn from the copy the
 * player owns, like the list's tile) and its partner. One indexed single-row read plus the commander's printing
 * resolution, which the list read already runs for every deck. It is what the deck page awaits before it draws the
 * header skeleton with the name placed once, while the body's own reads are still running.
 *
 * Owner-scoped in its SQL: a deck that is not the reader's answers null and the page leaves through `notFound()`.
 * Not cached: the name and tagline are written by actions that revalidate the page's path rather than the reader's
 * list tag, so a cached copy could draw a stale name for a moment and move it on landing.
 */
export async function readDeckOpenFacts(deckId: string, userId: string): Promise<LeanOpenFacts | null> {
  const [row] = await db
    .select({
      id: decks.id,
      name: decks.name,
      intent: decks.intent,
      commanderOracleId: decks.commanderOracleId,
      commanderName: cards.name,
      commanderColorIdentity: cards.colorIdentity,
      commanderArtCropUri: cards.artCropUri,
      partnerName: partnerCards.name,
      partnerColorIdentity: partnerCards.colorIdentity,
    })
    .from(decks)
    .innerJoin(cards, eq(decks.commanderOracleId, cards.oracleId))
    .leftJoin(partnerCards, eq(decks.partnerOracleId, partnerCards.oracleId))
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
    .limit(1);
  if (!row) return null;
  // Fail-soft inside: an unresolved commander keeps the oracle art, as on the list.
  const own = (await resolveCommanderPrintingsByDeck(userId, [{ deckId, commanderOracleId: row.commanderOracleId }])).get(deckId);
  return {
    id: row.id,
    name: row.name,
    commander: commanderDisplayName({ name: row.commanderName, printedName: own?.printedName ?? null }),
    partnerName: row.partnerName,
    identity: deckIdentity(row.commanderColorIdentity, row.partnerColorIdentity),
    artCropUri: own?.artCropUri ?? row.commanderArtCropUri,
    artIdentity: row.commanderColorIdentity,
    partner: row.partnerName !== null,
    intent: row.intent,
  };
}
