// The cards a partner's colors open (#491, the confirm's "N of your {colors} cards are in their decks"):
// what the reader OWNS in the colors the pair adds beyond the deck's own, that the pair's decks run and
// the 99 does not. Read when the confirm opens, one pair at a time, never with the sheet's list (the
// list would pay it for every partner). Reads only; no model spend.

import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import {
  cards, collectionItems, commanderPairSupport, commanderPairSupportCards, commanderSupportCards, deckCards, decks,
} from "../../db/schema";
import { canPair, partnerAbility } from "../decks/partner";
import { canonicalPair } from "../edhrec/pair-order";

export type OpenedCard = { oracleId: string; name: string; imageUri: string | null };

/**
 * The owned cards a pair's decks run whose identity reaches a color the deck lacks and stays inside
 * the pair's. Null when the deck is not the reader's, leads with a pair, or the two cannot pair.
 * The pair's own list where the index holds one, else either half's single list (the loader's rule).
 */
export async function loadOpenedCards(
  deckId: string, userId: string, partnerOracleId: string,
): Promise<{ colors: string[]; cards: OpenedCard[] } | null> {
  const [deck] = await db.select({ commander: decks.commanderOracleId, partner: decks.partnerOracleId })
    .from(decks).where(and(eq(decks.id, deckId), eq(decks.userId, userId)));
  if (!deck || deck.partner) return null;

  const halves = await db.select({
    oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine, oracleText: cards.oracleText,
    colorIdentity: cards.colorIdentity, commanderLegal: cards.commanderLegal,
  }).from(cards).where(inArray(cards.oracleId, [deck.commander, partnerOracleId]));
  const mine = halves.find((c) => c.oracleId === deck.commander);
  const theirs = halves.find((c) => c.oracleId === partnerOracleId);
  if (!mine || !theirs || !theirs.commanderLegal) return null;
  const side = (c: typeof mine) => ({ name: c.name, ability: partnerAbility(c.oracleText, c.typeLine) });
  if (!canPair(side(mine), side(theirs))) return null;

  const opened = theirs.colorIdentity.filter((c) => !mine.colorIdentity.includes(c)).sort();
  if (opened.length === 0) return { colors: [], cards: [] };
  const wide = new Set([...mine.colorIdentity, ...theirs.colorIdentity]);

  const p = canonicalPair(deck.commander, partnerOracleId);
  const [indexed] = await db.select({ a: commanderPairSupport.commanderOracleId })
    .from(commanderPairSupport).where(and(
      eq(commanderPairSupport.commanderOracleId, p.commanderOracleId),
      eq(commanderPairSupport.partnerOracleId, p.partnerOracleId),
      eq(commanderPairSupport.synergyState, "ok"),
    ));
  const support = indexed
    ? await db.select({ id: commanderPairSupportCards.oracleId }).from(commanderPairSupportCards).where(and(
        eq(commanderPairSupportCards.commanderOracleId, p.commanderOracleId),
        eq(commanderPairSupportCards.partnerOracleId, p.partnerOracleId),
      ))
    : await db.select({ id: commanderSupportCards.oracleId }).from(commanderSupportCards)
        .where(inArray(commanderSupportCards.commanderOracleId, [deck.commander, partnerOracleId]));
  const ids = [...new Set(support.map((r) => r.id))];
  if (ids.length === 0) return { colors: opened, cards: [] };

  const [rows, owned, inBody] = await Promise.all([
    db.select({ oracleId: cards.oracleId, name: cards.name, imageUri: cards.imageUri, colorIdentity: cards.colorIdentity })
      .from(cards).where(inArray(cards.oracleId, ids)),
    db.selectDistinct({ oracleId: collectionItems.oracleId }).from(collectionItems)
      .where(and(eq(collectionItems.userId, userId), inArray(collectionItems.oracleId, ids))),
    db.select({ oracleId: deckCards.oracleId }).from(deckCards)
      .where(and(eq(deckCards.deckId, deckId), inArray(deckCards.oracleId, ids))),
  ]);
  const have = new Set(owned.map((r) => r.oracleId));
  const here = new Set(inBody.map((r) => r.oracleId));
  const found = rows
    .filter((r) => have.has(r.oracleId) && !here.has(r.oracleId)
      && r.colorIdentity.some((c) => opened.includes(c)) && r.colorIdentity.every((c) => wide.has(c)))
    .map((r) => ({ oracleId: r.oracleId, name: r.name, imageUri: r.imageUri }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { colors: opened, cards: found };
}
