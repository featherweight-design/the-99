import { commanderSlug } from "../edhrec/slug";

/**
 * Slugs keyed on oracle id, never on rank.
 *
 * `finalizeRecommendations` numbers duplicate names in rank order, which is
 * fine for one ranking. Discovery has two, over the same population — a slug
 * that moved when the sort flipped would silently re-point every duplicate's
 * link at the other commander. Ordering the shared-base group by oracle id
 * makes the assignment a property of the data instead of the view.
 */
export function assignDiscoverySlugs<T extends { oracleId: string; name: string }>(
  rows: T[],
): (T & { slug: string })[] {
  const byBase = new Map<string, T[]>();
  for (const r of rows) {
    const base = commanderSlug(r.name);
    const group = byBase.get(base);
    if (group) group.push(r);
    else byBase.set(base, [r]);
  }

  const slugByOracleId = new Map<string, string>();
  for (const [base, group] of byBase) {
    group.sort((a, b) => (a.oracleId < b.oracleId ? -1 : a.oracleId > b.oracleId ? 1 : 0));
    group.forEach((r, i) => slugByOracleId.set(r.oracleId, i === 0 ? base : `${base}-${i + 1}`));
  }

  return rows.map((r) => ({ ...r, slug: slugByOracleId.get(r.oracleId)! }));
}
