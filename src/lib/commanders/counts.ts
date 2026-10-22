import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, collectionItems, commanderScores, commanderSupport } from "../../db/schema";
import { notBuiltBy } from "../decks/built";

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
 * Both are per reader and read live, as a count over indexed rows is cheaper than a cache entry the reader's decks
 * would have to invalidate: building a deck moves both figures, and no tag drops on a deck write.
 */
export async function loadCommanderCounts(userId: string): Promise<{ owned: number; discover: number }> {
  const [owned, discover] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(commanderScores)
      .where(and(eq(commanderScores.userId, userId), notBuiltBy(userId, commanderScores.oracleId))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(commanderSupport)
      .innerJoin(cards, eq(cards.oracleId, commanderSupport.commanderOracleId))
      .where(
        and(
          eq(cards.commanderLegal, true),
          notBuiltBy(userId, commanderSupport.commanderOracleId),
          sql`not exists (
            select 1 from ${collectionItems}
            where ${collectionItems.userId} = ${userId}
              and ${collectionItems.oracleId} = ${commanderSupport.commanderOracleId}
          )`,
        ),
      ),
  ]);
  return { owned: owned[0]?.n ?? 0, discover: discover[0]?.n ?? 0 };
}
