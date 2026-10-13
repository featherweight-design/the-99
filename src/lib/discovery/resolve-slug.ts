import { getRankedList } from "../recs/ranked-list";
import { findScoredCommander } from "../recs/store";
import { loadCandidateSlugRows } from "./candidates";
import { loadDiscoveryPool } from "./list";
import { byFit } from "./novelty";
import { assignDiscoverySlugs } from "./slugs";

export type ResolvedCommander = { oracleId: string; rank: number; anyDegraded: boolean };

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
 * Shared with `retryCoverageFigures` rather than inlined in the page: the retry
 * has to reach the same commander the page rendered, and resolving through the
 * store alone would silently no-op on every discovery-only page.
 */
export async function resolveCommanderSlug(
  userId: string,
  slug: string,
  /** The reader's resolved switches: the stored set and the owned ranking are read under its role
   *  basis, so a slug resolves to the rank the reader's own list shows. */
  env: NodeJS.ProcessEnv = process.env,
): Promise<ResolvedCommander | null> {
  const found = await findScoredCommander(userId, slug, env);
  if (found) return found;

  const { items } = await getRankedList(userId, env);
  const idx = items.findIndex((i) => i.slug === slug);
  if (idx !== -1) {
    return { oracleId: items[idx].oracleId, rank: idx + 1, anyDegraded: false };
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
  return { oracleId: rows[at].oracleId, rank: at + 1, anyDegraded: false };
}
