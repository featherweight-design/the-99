import { cache } from "react";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, collectionItems, csvUploads, deckCards, decks } from "../../db/schema";

/**
 * Thin, logic-free queries for the home dashboard.
 * Follows the untested-query pattern (see recommend.ts) — pure logic gets tests,
 * shape-shifting SQL does not.
 */

export const getCollectionStats = cache(async function getCollectionStats(
  userId: string,
): Promise<{ totalCards: number; uniqueCards: number }> {
  const [row] = await db
    .select({
      totalCards: sql<number>`coalesce(sum(${collectionItems.quantity}), 0)::int`,
      uniqueCards: sql<number>`count(distinct ${collectionItems.oracleId})::int`,
    })
    .from(collectionItems)
    .where(eq(collectionItems.userId, userId));
  return { totalCards: row?.totalCards ?? 0, uniqueCards: row?.uniqueCards ?? 0 };
});

/**
 * Whether the reader has any deck, for the shell's lock note at zero cards (no-collection entry, call 6): the note
 * adds `Your decks are on Home until then.` with a deck, and Go to step 1 belongs to first run alone, which is no
 * cards AND no decks. One indexed probe, read only while the nav is locked with that switch on.
 */
export const hasAnyDeck = cache(async function hasAnyDeck(userId: string): Promise<boolean> {
  const [row] = await db.select({ id: decks.id }).from(decks).where(eq(decks.userId, userId)).limit(1);
  return row !== undefined;
});

export async function getCollectionLastUpdated(userId: string): Promise<Date | null> {
  const [row] = await db
    .select({ confirmedAt: csvUploads.confirmedAt })
    .from(csvUploads)
    .where(and(eq(csvUploads.userId, userId), isNotNull(csvUploads.confirmedAt)))
    .orderBy(desc(csvUploads.confirmedAt))
    .limit(1);
  return row?.confirmedAt ?? null;
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
      cardCount: sql<number>`coalesce(sum(${deckCards.quantity}), 0)::int`,
      createdAt: decks.createdAt,
    })
    .from(decks)
    .innerJoin(cards, eq(decks.commanderOracleId, cards.oracleId))
    .leftJoin(deckCards, eq(deckCards.deckId, decks.id))
    .where(eq(decks.userId, userId))
    .groupBy(decks.id, decks.name, cards.name, cards.colorIdentity, decks.createdAt)
    .orderBy(desc(decks.createdAt))
    .limit(limit);
  return rows;
}
