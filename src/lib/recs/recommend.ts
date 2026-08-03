import { eq } from "drizzle-orm";
import { db } from "../../db";
import { cards, collectionItems, decks } from "../../db/schema";
import { ownedCardsWhere } from "../collection/owned-cards";
import { commanderSlug } from "../edhrec/slug";
import { readEdhrecCache, resolveEdhrecData } from "../edhrec/client";
import { synergyStateFrom, type SynergyState } from "./synergy-state";
import { isCommanderCandidate, scoreCommander, type CommanderScore, type PoolCard } from "./score";
import { receiptsPreview } from "./format";

export type RankedCommander = CommanderScore & { slug: string; synergyState: SynergyState };

/**
 * Slim payload for the client-side list view. The full RankedCommander carries
 * heavy detail-only fields (oracleText, roleCards, overlapMissing) that the
 * list never renders — stripping them keeps the serialized RSC payload small.
 */
export type CommanderListItem = Pick<
  RankedCommander,
  | "oracleId"
  | "slug"
  | "name"
  | "colorIdentity"
  | "colorPoolSize"
  | "roleCounts"
  | "edhrecOwnedCount"
  | "edhrecTotal"
  | "fitPool"
  | "fitRoles"
  | "fitSynergy"
  | "synergyState"
  | "score"
  | "imageUri"
> & {
  /** Preformatted receipts line — overlapOwned can be large, so only the
      rendered preview string ships to the client. */
  receipts: string;
};

export function toListItem(r: RankedCommander): CommanderListItem {
  return {
    oracleId: r.oracleId,
    slug: r.slug,
    name: r.name,
    colorIdentity: r.colorIdentity,
    colorPoolSize: r.colorPoolSize,
    roleCounts: r.roleCounts,
    edhrecOwnedCount: r.edhrecOwnedCount,
    edhrecTotal: r.edhrecTotal,
    receipts: receiptsPreview(r.overlapOwned),
    fitPool: r.fitPool,
    fitRoles: r.fitRoles,
    fitSynergy: r.fitSynergy,
    synergyState: r.synergyState,
    score: r.score,
    imageUri: r.imageUri,
  };
}

export type RecommendResult = {
  results: RankedCommander[];
  degraded: boolean;
  uniqueCardsRead: number;
  candidateCount: number;
};

/**
 * oracleId breaks score ties so the compute order matches `score desc, oracle_id`
 * in loadScores/findScoredCommander. Without it, tied commanders (common after
 * rounding) could swap places between a fresh compute and a persisted read,
 * moving both their rank and their dedup slug suffix. Comparing the canonical
 * UUID strings matches Postgres' byte ordering — the dashes sit at fixed offsets.
 */
export function byScoreThenOracleId(
  a: { score: number; oracleId: string },
  b: { score: number; oracleId: string },
): number {
  if (b.score !== a.score) return b.score - a.score;
  if (a.oracleId === b.oracleId) return 0;
  return a.oracleId < b.oracleId ? -1 : 1;
}

/**
 * Pure post-processing step: assigns unique slugs in rank order and wraps
 * counts. Exported for unit testing without a live database.
 */
export function finalizeRecommendations(
  results: (CommanderScore & { synergyState: SynergyState })[],
  uniqueCardsRead: number,
  candidateCount: number,
): Omit<RecommendResult, "degraded"> {
  const seen = new Map<string, number>();
  const ranked: RankedCommander[] = results.map((r) => {
    const base = commanderSlug(r.name);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return { ...r, slug: n === 1 ? base : `${base}-${n}` };
  });
  return { results: ranked, uniqueCardsRead, candidateCount };
}

/**
 * The scoring pool for one user. Extracted so the detail page can score a
 * single commander without re-running the whole fanout.
 */
export async function loadCollectionPool(
  userId: string,
): Promise<{ collection: PoolCard[]; uniqueCardsRead: number }> {
  const owned = await db
    .selectDistinctOn([cards.oracleId], {
      oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine,
      oracleText: cards.oracleText, keywords: cards.keywords,
      colorIdentity: cards.colorIdentity, commanderLegal: cards.commanderLegal,
      imageUri: cards.imageUri, manaCost: cards.manaCost,
    })
    .from(collectionItems)
    .innerJoin(cards, eq(collectionItems.oracleId, cards.oracleId))
    // Not commanderLegalOnly: uniqueCardsRead below counts the whole
    // collection, so legality is filtered in JS rather than in SQL.
    .where(ownedCardsWhere(userId, { commanderLegalOnly: false }))
    // Postgres requires DISTINCT ON expressions to lead the ORDER BY.
    .orderBy(cards.oracleId);

  // Score against commander-legal cards only, matching the deck-suggestion and
  // search pools — banned/not-legal cards must not inflate pool size, role
  // counts, or EDHREC overlap.
  return { collection: owned.filter((c) => c.commanderLegal), uniqueCardsRead: owned.length };
}

export async function recommendCommanders(
  userId: string,
): Promise<RecommendResult> {
  const { collection, uniqueCardsRead } = await loadCollectionPool(userId);

  // A commander you have already built a deck around is not a recommendation —
  // the page's whole question is "what should I build next", and answering it
  // with a deck the user is already holding wastes the top of the list. The
  // detail page deliberately does not filter: arriving there from a deck link
  // should still render.
  const built = new Set(
    (await db
      .select({ oracleId: decks.commanderOracleId })
      .from(decks)
      .where(eq(decks.userId, userId))
    ).map((d) => d.oracleId),
  );

  const candidates = collection.filter(
    (c) => isCommanderCandidate(c) && !built.has(c.oracleId),
  );

  // One cache read for the whole fanout — a per-commander SELECT here meant
  // ~196 round-trips on every compute, warm or cold.
  const cache = await readEdhrecCache(candidates.map((c) => c.oracleId));

  // Fetch EDHREC data with bounded concurrency: sequential awaits would make
  // cold loads with dozens of candidates exceed the page's time budget.
  const CONCURRENCY = 5;
  let degraded = false;
  const results: (CommanderScore & { synergyState: SynergyState })[] = [];
  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const scored = await Promise.all(
      candidates.slice(i, i + CONCURRENCY).map(async (commander) => {
        const result = await resolveEdhrecData(
          commander.oracleId, commander.name, cache.get(commander.oracleId),
        );
        // `unreachable` only flips true on real service outage (5xx/network/timeout
        // with no cache). 4xx (commander not on EDHREC) is a per-commander data
        // absence, not a service issue — data === null but unreachable === false.
        if (result.unreachable) degraded = true;
        return {
          ...scoreCommander({
            commander, collection, edhrecTopCards: result.data?.topCards ?? null,
          }),
          synergyState: synergyStateFrom(result),
        };
      }),
    );
    results.push(...scored);
  }
  results.sort(byScoreThenOracleId);

  const finalized = finalizeRecommendations(results, uniqueCardsRead, candidates.length);
  return { ...finalized, degraded };
}

/**
 * Full score for a single commander, for the detail page. Costs one collection
 * query plus one EDHREC resolve instead of the ~196 the fanout would do.
 * Returns null when the commander is no longer in the user's collection.
 */
export async function scoreOneCommander(
  userId: string,
  oracleId: string,
  slug: string,
): Promise<RankedCommander | null> {
  const { collection } = await loadCollectionPool(userId);
  const commander = collection.find((c) => c.oracleId === oracleId);
  if (!commander) return null;

  const cache = await readEdhrecCache([oracleId]);
  const result = await resolveEdhrecData(oracleId, commander.name, cache.get(oracleId));
  return {
    ...scoreCommander({ commander, collection, edhrecTopCards: result.data?.topCards ?? null }),
    slug,
    synergyState: synergyStateFrom(result),
  };
}
