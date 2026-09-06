import { notFound } from "next/navigation";
import { requireUserId } from "../../../lib/auth";
import { loadCollectionPool, scoreOneCommander } from "../../../lib/recs/recommend";
import { loadCandidates } from "../../../lib/discovery/candidates";
import { assignDiscoverySlugs } from "../../../lib/discovery/slugs";
import { byFit } from "../../../lib/discovery/novelty";
import { getRankedList } from "../../../lib/recs/ranked-list";
import { findScoredCommander } from "../../../lib/recs/store";
import { CommanderDetail } from "../../../components/commanders/detail";
import { readSynergyCards } from "./synergy-read";

export default async function CommanderDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const userId = await requireUserId();

  // Resolving the slug is one query returning one row, and only the requested
  // commander is scored — the page used to rank the whole candidate set to
  // render one.
  // Matching on the persisted slug also keeps this URL valid across a re-rank,
  // which a freshly-derived slug would not (dedup suffixes follow rank order).
  let found = await findScoredCommander(userId, slug);
  if (!found) {
    // No persisted row — first visit, or arriving here before /commanders. Resolve
    // from the computed ranking rather than re-reading the store: persistScores is
    // best-effort, so a second store miss would 404 a commander that ranks
    // perfectly well in memory.
    const { items } = await getRankedList(userId);
    const idx = items.findIndex((i) => i.slug === slug);
    if (idx !== -1) {
      found = { oracleId: items[idx].oracleId, rank: idx + 1, anyDegraded: false };
    } else {
      // Third and last: the discovery ranking. A commander the player has not
      // built has no persisted score and no place in the owned list, but its
      // row on /commanders?scope=play links here — resolving it anywhere else
      // would 404 roughly 3,100 rows.
      const { collection } = await loadCollectionPool(userId);
      // `unplayedCount` is a required field of `byFit`'s input but never read by
      // it, so the comparator is handed two small literals rather than copies of
      // rows carrying each commander's whole `tags` array.
      const rows = assignDiscoverySlugs(
        await loadCandidates(userId, collection.map((c) => c.oracleId)),
      ).sort((a, b) => byFit(
        { oracleId: a.oracleId, ownedSupport: a.ownedSupport, unplayedCount: 0 },
        { oracleId: b.oracleId, ownedSupport: b.ownedSupport, unplayedCount: 0 },
      ));
      const at = rows.findIndex((r) => r.slug === slug);
      if (at === -1) notFound();
      // The rank the row itself showed: position in the fit ranking, which is
      // discovery's default and the only ordering this page can name.
      found = { oracleId: rows[at].oracleId, rank: at + 1, anyDegraded: false };
    }
  } else if (found.anyDegraded) {
    // The persisted ranks came from an outage-era compute, so the rank shown beside
    // a freshly-scored commander would disagree with the list. Refresh the rank
    // only — matched by oracleId, because a recompute can reassign this slug to a
    // different commander (duplicate names take rank-order suffixes) and the URL
    // belongs to whichever commander the persisted row named.
    const { items } = await getRankedList(userId);
    const idx = items.findIndex((i) => i.oracleId === found!.oracleId);
    if (idx !== -1) found = { ...found, rank: idx + 1, anyDegraded: false };
  }

  const commander = await scoreOneCommander(userId, found.oracleId, slug);
  if (!commander) notFound();

  // Derive the oracle ids of owned cards that Role Coverage already covers.
  // Exclusion rule: an owned card drawn in any role list does not appear in the
  // synergy panel a second time. Unowned role staples are NOT excluded — they
  // have no presence elsewhere on the page and the player still needs to see them.
  const coveredOracleIds = Object.values(commander.roleCards)
    .flat()
    .map((rc) => rc.oracleId);

  const synergyCards = await readSynergyCards(userId, commander.oracleId, coveredOracleIds);

  return (
    <CommanderDetail
      commander={commander}
      rank={found.rank}
      isBestFit={found.rank === 1}
      synergyCards={synergyCards}
    />
  );
}
