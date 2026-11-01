import { and, eq, ilike, inArray } from "drizzle-orm";
import { db } from "../../db";
import { cards, commanderScores, commanderSupport, hiddenCommanders } from "../../db/schema";
import { notBuiltBy } from "../decks/built";
import { discoverCandidates, escapeLike } from "../discovery/candidates";
import { assignDiscoverySlugs } from "../discovery/slugs";
import { rankableScoreRows } from "../recs/store";

// The lists' search, asked about the player's own hides: which hidden commanders a name query matches,
// and the slug each one's page opens at. Kept out of `hidden.ts`'s writes and out of `store.ts`, which
// sits on Home's and /decks' cached import path (scripts/lib/list-cache-tables.test.mts): only the two
// lists' server actions reach this module, and they cache nothing.

/** The most hidden name matches one lookup answers, the same cap `loadNameMatches` holds, and for its
    reason: past it the held state counts rather than names, and a truncated set would under-count. */
const HIDDEN_MATCH_LIMIT = 200;

/**
 * The commanders this player has hidden whose name contains `query`, by name. A commander they have
 * since built is left out: built is the outer cause (`classifyMatches`), and a hide is not what keeps it
 * off a list. Null past the cap, as `loadNameMatches` answers it.
 */
export async function loadHiddenNameMatches(
  userId: string,
  query: string,
): Promise<{ oracleId: string; name: string }[] | null> {
  const rows = await db
    .select({ oracleId: cards.oracleId, name: cards.name })
    .from(hiddenCommanders)
    .innerJoin(cards, eq(cards.oracleId, hiddenCommanders.oracleId))
    .where(
      and(
        eq(hiddenCommanders.userId, userId),
        ilike(cards.name, `%${escapeLike(query)}%`),
        notBuiltBy(userId, hiddenCommanders.oracleId),
      ),
    )
    .orderBy(cards.name)
    .limit(HIDDEN_MATCH_LIMIT + 1);
  return rows.length > HIDDEN_MATCH_LIMIT ? null : rows;
}

/**
 * The slug each hidden commander's page resolves at, found the way `resolveCommanderSlug` resolves
 * one, in its order: the persisted scores first (an owned commander, the slug For you linked to before
 * the hide), then the discovery ranking's (an unowned one, keyed on oracle id and so the same whichever
 * sort the list was on).
 *
 * The discovery slugs are assigned over the whole candidate population, never over the hidden ids
 * alone: a dedup suffix depends on every commander sharing the name, and a population one row narrower
 * than the list's would hand back the slug of the commander beside this one. The population read is the
 * light projection, two columns and no aggregate, and is made only when an unowned id is asked about.
 *
 * An id neither ranking holds (scores not yet persisted, or not a candidate at all) is absent from the
 * map, and its held state offers no page rather than a link that 404s.
 */
export async function loadHiddenSlugs(
  userId: string,
  oracleIds: string[],
  collectionOracleIds: string[],
  /** The reader's resolved switches: the stored set is read under its writer version. */
  env: NodeJS.ProcessEnv,
): Promise<Map<string, string>> {
  const slugs = new Map<string, string>();
  if (oracleIds.length === 0) return slugs;

  const scored = await db
    .select({ oracleId: commanderScores.oracleId, slug: commanderScores.slug })
    .from(commanderScores)
    .where(and(rankableScoreRows(userId, env), inArray(commanderScores.oracleId, oracleIds)));
  for (const r of scored) slugs.set(r.oracleId, r.slug);

  const owned = new Set(collectionOracleIds);
  const unowned = oracleIds.filter((id) => !slugs.has(id) && !owned.has(id));
  if (unowned.length === 0) return slugs;

  const population = await db
    .select({ oracleId: commanderSupport.commanderOracleId, name: cards.name })
    .from(commanderSupport)
    .innerJoin(cards, eq(cards.oracleId, commanderSupport.commanderOracleId))
    .where(discoverCandidates(userId, collectionOracleIds));
  const wanted = new Set(unowned);
  for (const r of assignDiscoverySlugs(population)) if (wanted.has(r.oracleId)) slugs.set(r.oracleId, r.slug);
  return slugs;
}
