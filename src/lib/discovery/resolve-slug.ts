import { loadHiddenIds } from "../commanders/hidden";
import { getRankedList } from "../recs/ranked-list";
import { findScoredCommander } from "../recs/scored-commander";
import { isSchemaLagError } from "../recs/store";
import { loadCandidateSlugRows } from "./candidates";
import { loadDiscoveryPool } from "./list";
import { byFit } from "./novelty";
import { assignDiscoverySlugs } from "./slugs";

export type ResolvedCommander = {
  oracleId: string;
  /** Its place in the list it was clicked from. Null while the player has it hidden: no list draws it. */
  rank: number | null;
  hidden: boolean;
  anyDegraded: boolean;
  /** The player's hidden ids, when a fallback below already read them: handed on so the page's own
   *  re-ranks do not read them a second time. Absent when the store answered. */
  hiddenIds?: ReadonlySet<string>;
};

/**
 * The place the row at `at` takes in a list that leaves hidden commanders out, counted over a list that
 * still holds them. The two fallbacks below, and the commander page's own re-ranks, index lists that
 * keep hidden rows (slug assignment shares them, so they cannot be filtered before it), while the lists
 * the reader clicked from drop them. Counting every row would put a commander one place lower per hidden
 * row ahead of it. A hidden row has no place.
 */
export function rankAmongShown(
  rows: readonly { oracleId: string }[],
  at: number,
  hiddenIds: ReadonlySet<string>,
): { rank: number | null; hidden: boolean } {
  if (hiddenIds.has(rows[at].oracleId)) return { rank: null, hidden: true };
  let rank = 1;
  for (let i = 0; i < at; i++) if (!hiddenIds.has(rows[i].oracleId)) rank++;
  return { rank, hidden: false };
}

/**
 * A commander detail slug, from whichever of the three rankings owns it.
 *
 * 1. The persisted scores. Matching there keeps a URL valid across a re-rank,
 *    which a freshly-derived slug would not: dedup suffixes follow rank order.
 * 2. The computed owned ranking. `persistScores` is best-effort, so a store
 *    miss must not 404 a commander that ranks perfectly well in memory.
 * 3. The discovery ranking, for a commander the player has not built. It has
 *    no persisted score and no place in the owned list, but the discovery list
 *    links to it all the same — roughly 3,100 rows resolve nowhere else.
 *
 * A HIDDEN COMMANDER RESOLVES, with no rank: its page still opens. The hidden ids are read only when a
 * fallback runs; the store answers the flag in its own statement.
 *
 * Shared with `retryCoverageFigures` rather than inlined in the page: the retry
 * has to reach the same commander the page rendered, and resolving through the
 * store alone would silently no-op on every discovery-only page.
 */
export async function resolveCommanderSlug(
  userId: string,
  slug: string,
  /** The reader's resolved switches: the stored set and the owned ranking are read under its role
   *  basis, so a slug resolves to the rank the reader's own list shows. */
  env: NodeJS.ProcessEnv,
): Promise<ResolvedCommander | null> {
  const found = await findScoredCommander(userId, slug, env);
  if (found) return found;

  // Read once, beside the owned list, and shared with the discovery fallback below. Schema lag reads as
  // nothing hidden, as `findScoredCommander` reads it as a miss: a late migration slows the page rather
  // than failing it.
  const [{ items }, hiddenList] = await Promise.all([
    getRankedList(userId, env),
    loadHiddenIds(userId).catch((err: unknown) => {
      if (!isSchemaLagError(err)) throw err;
      return [];
    }),
  ]);
  const hiddenIds: ReadonlySet<string> = new Set(hiddenList);
  const idx = items.findIndex((i) => i.slug === slug);
  if (idx !== -1) {
    return { oracleId: items[idx].oracleId, ...rankAmongShown(items, idx, hiddenIds), anyDegraded: false, hiddenIds };
  }

  // The whole collection, because that is what the discover list ranks against.
  // Slugs and rank both follow list position, so a resolver scoring a different
  // population hands back the commander next to the one that was clicked. Only
  // the pool is shared with the list — prices, played tags and the rollup are
  // the list's work and nothing on this path reads them.
  const { collection } = await loadDiscoveryPool(userId);
  // `unplayedCount` is `byFit`'s required input and never read by it, so it is
  // filled once per row here rather than in the comparator, which would
  // otherwise allocate two objects per comparison.
  const rows = assignDiscoverySlugs(
    (
      await loadCandidateSlugRows(
        userId,
        collection.map((c) => c.oracleId),
      )
    ).map((r) => ({ ...r, unplayedCount: 0 })),
  ).sort(byFit);
  const at = rows.findIndex((r) => r.slug === slug);
  if (at === -1) return null;

  // The rank the row itself showed: position in the fit ranking, which is
  // discovery's default and the only ordering this page can name.
  return { oracleId: rows[at].oracleId, ...rankAmongShown(rows, at, hiddenIds), anyDegraded: false, hiddenIds };
}
