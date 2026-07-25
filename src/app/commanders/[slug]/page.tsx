import { notFound } from "next/navigation";
import { requireUserId } from "../../../lib/auth";
import { scoreOneCommander } from "../../../lib/recs/recommend";
import { getRankedList } from "../../../lib/recs/ranked-list";
import { findScoredCommander } from "../../../lib/recs/store";
import { CommanderDetail } from "../../../components/commanders/detail";

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
    if (idx === -1) notFound();
    found = { oracleId: items[idx].oracleId, rank: idx + 1, anyDegraded: false };
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

  return (
    <CommanderDetail commander={commander} rank={found.rank} isBestFit={found.rank === 1} />
  );
}
