import { eq } from "drizzle-orm";
import { db } from "../../db";
import { cards, collectionItems } from "../../db/schema";
import { getEdhrecData } from "../edhrec/client";
import { isCommanderCandidate, scoreCommander, type CommanderScore, type PoolCard } from "./score";

export async function recommendCommanders(
  userId: string,
): Promise<{ results: CommanderScore[]; degraded: boolean }> {
  const owned = await db
    .selectDistinctOn([cards.oracleId], {
      oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine,
      oracleText: cards.oracleText, keywords: cards.keywords,
      colorIdentity: cards.colorIdentity, commanderLegal: cards.commanderLegal,
    })
    .from(collectionItems)
    .innerJoin(cards, eq(collectionItems.oracleId, cards.oracleId))
    .where(eq(collectionItems.userId, userId))
    // Postgres requires DISTINCT ON expressions to lead the ORDER BY.
    .orderBy(cards.oracleId);

  // Score against commander-legal cards only, matching the deck-suggestion and
  // search pools — banned/not-legal cards must not inflate pool size, role
  // counts, or EDHREC overlap.
  const collection: PoolCard[] = owned.filter((c) => c.commanderLegal);
  const candidates = collection.filter((c) => isCommanderCandidate(c));

  // Fetch EDHREC data with bounded concurrency: sequential awaits would make
  // cold loads with dozens of candidates exceed the page's time budget.
  const CONCURRENCY = 5;
  let degraded = false;
  const results: CommanderScore[] = [];
  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const scored = await Promise.all(
      candidates.slice(i, i + CONCURRENCY).map(async (commander) => {
        const edhrec = await getEdhrecData(commander.oracleId, commander.name);
        if (edhrec === null) degraded = true;
        return scoreCommander({ commander, collection, edhrecTopCards: edhrec?.topCards ?? null });
      }),
    );
    results.push(...scored);
  }
  results.sort((a, b) => b.score - a.score);
  return { results, degraded };
}
