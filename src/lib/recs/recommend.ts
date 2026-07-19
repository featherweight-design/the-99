import { eq } from "drizzle-orm";
import { db } from "../../db";
import { cards, collectionItems } from "../../db/schema";
import { commanderSlug } from "../edhrec/slug";
import { getEdhrecData } from "../edhrec/client";
import { isCommanderCandidate, scoreCommander, type CommanderScore, type PoolCard } from "./score";

export type RankedCommander = CommanderScore & { slug: string };

export type RecommendResult = {
  results: RankedCommander[];
  degraded: boolean;
  uniqueCardsRead: number;
  candidateCount: number;
};

/**
 * Pure post-processing step: assigns unique slugs in rank order and wraps
 * counts. Exported for unit testing without a live database.
 */
export function finalizeRecommendations(
  results: CommanderScore[],
  uniqueCardsRead: number,
  candidateCount: number,
): Omit<RecommendResult, "degraded"> & { degraded: boolean } {
  const seen = new Map<string, number>();
  const ranked: RankedCommander[] = results.map((r) => {
    const base = commanderSlug(r.name);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return { ...r, slug: n === 1 ? base : `${base}-${n}` };
  });
  return { results: ranked, degraded: false, uniqueCardsRead, candidateCount };
}

export async function recommendCommanders(
  userId: string,
): Promise<RecommendResult> {
  const owned = await db
    .selectDistinctOn([cards.oracleId], {
      oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine,
      oracleText: cards.oracleText, keywords: cards.keywords,
      colorIdentity: cards.colorIdentity, commanderLegal: cards.commanderLegal,
      imageUri: cards.imageUri, manaCost: cards.manaCost,
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

  const finalized = finalizeRecommendations(results, owned.length, candidates.length);
  return { ...finalized, degraded };
}
