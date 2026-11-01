import { and, eq, ilike, inArray } from "drizzle-orm";
import { db } from "../../db";
import { cards, collectionItems, commanderScores, hiddenCommanders } from "../../db/schema";
import { notBuiltBy } from "../decks/built";
import { escapeLike, loadCandidateSlugRows } from "../discovery/candidates";
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
 * The commanders this player has hidden FROM FOR YOU whose name contains `query`, by name: hidden, in
 * their collection, commander-legal and unbuilt, which is For you's own population. A hidden commander
 * outside it (unowned, hidden on Discover) is not this list's to report: unhiding it would not put it
 * here, so "you hid it" would be a false held claim, and the search falls through to the list's own
 * miss state. A built one is left out for the same reason: built is the outer cause
 * (`classifyMatches`). Null past the cap, as `loadNameMatches` answers it.
 *
 * Ownership is a join on the reader's `collection_items`, DISTINCT because a commander held in several
 * printings has a row for each: the oracle ids alone, never the collection's wide rows.
 */
export async function loadOwnedHiddenNameMatches(
  userId: string,
  query: string,
): Promise<{ oracleId: string; name: string }[] | null> {
  const rows = await ownedHiddenNameQuery(userId, query);
  return rows.length > HIDDEN_MATCH_LIMIT ? null : rows;
}

/** The statement `loadOwnedHiddenNameMatches` runs, apart so a test can read the SQL it emits: the
    lane boundary is the whole of the fix it carries, and only the SQL shows it. One row past the cap. */
export function ownedHiddenNameQuery(userId: string, query: string) {
  return db
    .selectDistinct({ oracleId: cards.oracleId, name: cards.name })
    .from(hiddenCommanders)
    .innerJoin(cards, eq(cards.oracleId, hiddenCommanders.oracleId))
    .innerJoin(
      collectionItems,
      and(eq(collectionItems.oracleId, hiddenCommanders.oracleId), eq(collectionItems.userId, userId)),
    )
    .where(
      and(
        eq(hiddenCommanders.userId, userId),
        eq(cards.commanderLegal, true),
        ilike(cards.name, `%${escapeLike(query)}%`),
        notBuiltBy(userId, hiddenCommanders.oracleId),
      ),
    )
    .orderBy(cards.name)
    .limit(HIDDEN_MATCH_LIMIT + 1);
}

/**
 * The slug each hidden commander's page resolves at, found the way `resolveCommanderSlug` resolves
 * one, in its order: the persisted scores first (an owned commander, the slug For you linked to before
 * the hide), then the discovery ranking's (an unowned one, keyed on oracle id and so the same whichever
 * sort the list was on).
 *
 * The discovery slugs are assigned over the whole candidate population, never over the hidden ids
 * alone: a dedup suffix depends on every commander sharing the name, and a population one row narrower
 * than the list's would hand back the slug of the commander beside this one. So the population is read
 * by `loadCandidateSlugRows`, the reader `resolveCommanderSlug` uses, and cannot drift from it. Its
 * owned-support aggregate is asked over no owned ids (the slugs never read it), and the read is made
 * only when an unowned id is asked about.
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
  return (await loadHiddenPages(userId, oracleIds, collectionOracleIds, env)).slugs;
}

/**
 * `loadHiddenSlugs`, and also which of the ids For you ranks: those with a row in the reader's rankable
 * stored scores (`rankableScoreRows`, the set `/commanders` draws from). The Hidden list needs both, and
 * the slug lookup already reads exactly that set, so asking it again would be the same statement twice.
 */
export async function loadHiddenPages(
  userId: string,
  oracleIds: string[],
  collectionOracleIds: string[],
  env: NodeJS.ProcessEnv,
): Promise<{ slugs: Map<string, string>; ranked: Set<string> }> {
  const slugs = new Map<string, string>();
  const ranked = new Set<string>();
  if (oracleIds.length === 0) return { slugs, ranked };

  const scored = await db
    .select({ oracleId: commanderScores.oracleId, slug: commanderScores.slug })
    .from(commanderScores)
    .where(and(rankableScoreRows(userId, env), inArray(commanderScores.oracleId, oracleIds)));
  for (const r of scored) {
    slugs.set(r.oracleId, r.slug);
    ranked.add(r.oracleId);
  }

  const owned = new Set(collectionOracleIds);
  const unowned = oracleIds.filter((id) => !slugs.has(id) && !owned.has(id));
  if (unowned.length === 0) return { slugs, ranked };

  const population = await loadCandidateSlugRows(userId, [], collectionOracleIds);
  const wanted = new Set(unowned);
  for (const r of assignDiscoverySlugs(population)) if (wanted.has(r.oracleId)) slugs.set(r.oracleId, r.slug);
  return { slugs, ranked };
}
