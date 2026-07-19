import { desc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, collectionItems, deckCards, decks } from "../../db/schema";

/**
 * Thin, logic-free queries for the home dashboard.
 * Follows the untested-query pattern (see recommend.ts) — pure logic gets tests,
 * shape-shifting SQL does not.
 */

export async function getCollectionStats(
  userId: string,
): Promise<{ totalCards: number; uniqueCards: number }> {
  const [row] = await db
    .select({
      totalCards: sql<number>`coalesce(sum(${collectionItems.quantity}), 0)::int`,
      uniqueCards: sql<number>`count(*)::int`,
    })
    .from(collectionItems)
    .where(eq(collectionItems.userId, userId));
  return { totalCards: row?.totalCards ?? 0, uniqueCards: row?.uniqueCards ?? 0 };
}

export type RecentDeck = {
  id: string;
  name: string;
  commanderName: string;
  colorIdentity: string[];
  cardCount: number;
  createdAt: Date;
};

export async function listRecentDecks(
  userId: string,
  limit = 3,
): Promise<RecentDeck[]> {
  const rows = await db
    .select({
      id: decks.id,
      name: decks.name,
      commanderName: cards.name,
      colorIdentity: cards.colorIdentity,
      cardCount: sql<number>`coalesce((
        select sum(${deckCards.quantity})::int
        from ${deckCards}
        where ${deckCards.deckId} = ${decks.id}
      ), 0)`,
      createdAt: decks.createdAt,
    })
    .from(decks)
    .innerJoin(cards, eq(decks.commanderOracleId, cards.oracleId))
    .where(eq(decks.userId, userId))
    .orderBy(desc(decks.createdAt))
    .limit(limit);
  return rows;
}
