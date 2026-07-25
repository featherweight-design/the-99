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
    // No persisted rows yet — first visit, or arriving here before /commanders.
    // Resolve from the computed ranking rather than re-reading the store:
    // persistScores is best-effort, so a second store miss would 404 a commander
    // that ranks perfectly well in memory.
    const { items } = await getRankedList(userId);
    const rank = items.findIndex((i) => i.slug === slug) + 1;
    if (rank === 0) notFound();
    found = { oracleId: items[rank - 1].oracleId, rank };
  }

  const commander = await scoreOneCommander(userId, found.oracleId, slug);
  if (!commander) notFound();

  return (
    <CommanderDetail commander={commander} rank={found.rank} isBestFit={found.rank === 1} />
  );
}
