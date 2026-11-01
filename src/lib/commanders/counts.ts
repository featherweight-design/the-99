import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, collectionItems, commanderScores, commanderSupport, hiddenCommanders } from "../../db/schema";
import { notBuiltBy } from "../decks/built";
import { getCollectionStats } from "../home/summary";
import { notHiddenBy } from "./hidden";

/** The title line's two figures, and the Hidden tab's count (`hidden`, the strip's shipped `tab.count`). */
export type CommanderCounts = { owned: number; discover: number; hidden: number };

/**
 * The two figures on the Commanders place's title line (menu and Home, PR 1): the commanders the reader owns and has
 * not built, and the ones they could discover. Two COUNT statements, so the place's layout never loads the 3,000-row
 * discovery payload to read a number off it.
 *
 * `owned` counts the reader's stored scores (`commander_scores`, the rows `/commanders` ranks), less the commanders a
 * deck is built around: the figure `/commanders` states once it has ranked. It reads 0 before the first ranking is
 * stored, and the head then leaves it out rather than say "0 yours". `discover` is `/discover`'s candidate set
 * (`discoverCandidates`: legal, unbuilt, unowned) counted in the database, so the two agree by construction.
 *
 * Neither counts a commander the reader has hidden: each list leaves those out, so its figure does.
 *
 * Both are per reader and read live, as a count over indexed rows is cheaper than a cache entry the reader's decks
 * would have to invalidate: building a deck moves both figures, and no tag drops on a deck write.
 */
export async function loadCommanderCounts(userId: string): Promise<CommanderCounts> {
  const [owned, discover, hidden] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(commanderScores)
      .where(
        and(
          eq(commanderScores.userId, userId),
          notBuiltBy(userId, commanderScores.oracleId),
          notHiddenBy(userId, commanderScores.oracleId),
        ),
      ),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(commanderSupport)
      .innerJoin(cards, eq(cards.oracleId, commanderSupport.commanderOracleId))
      .where(
        and(
          eq(cards.commanderLegal, true),
          notBuiltBy(userId, commanderSupport.commanderOracleId),
          notHiddenBy(userId, commanderSupport.commanderOracleId),
          sql`not exists (
            select 1 from ${collectionItems}
            where ${collectionItems.userId} = ${userId}
              and ${collectionItems.oracleId} = ${commanderSupport.commanderOracleId}
          )`,
        ),
      ),
    loadHiddenCount(userId),
  ]);
  return { owned: owned[0]?.n ?? 0, discover: discover[0]?.n ?? 0, hidden };
}

/**
 * The Hidden tab's count: every commander the reader has hidden, which is every row the Hidden list draws (the
 * list joins `cards`, and the foreign key means every hidden row has one). Unlike the two list figures it does not
 * depend on the collection: a hide outlives a collection replaced or emptied, and the list still draws it.
 */
export async function loadHiddenCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(hiddenCommanders)
    .where(eq(hiddenCommanders.userId, userId));
  return row?.n ?? 0;
}

/**
 * What the Commanders place head draws, for its layout's first render and for `refreshCommanderCounts`: one rule,
 * so the two never disagree.
 *
 * NO CARDS, NO LIST FIGURES, BUT STILL THE HIDDEN COUNT (hide-commander READINESS Y8). With an empty collection
 * nothing can be ranked, so the title line says nothing (both figures 0, which the line leaves out) and no count is
 * read against a collection that is not there. The Hidden list is drawn whatever the collection holds, though, so
 * its tab counts what it will show: a reader who hid commanders and then emptied their collection still sees how
 * many are waiting there.
 */
export async function loadPlaceCounts(userId: string): Promise<CommanderCounts> {
  const stats = await getCollectionStats(userId);
  if (stats.uniqueCards === 0) return { owned: 0, discover: 0, hidden: await loadHiddenCount(userId) };
  return loadCommanderCounts(userId);
}
