import { notFound } from "next/navigation";
import { requireUserId } from "../../../lib/auth";
import { scoreOneCommander } from "../../../lib/recs/recommend";
import { resolveCommanderSlug } from "../../../lib/discovery/resolve-slug";
import { getRankedList } from "../../../lib/recs/ranked-list";
import { CommanderDetail } from "../../../components/commanders/detail";
import { readCommanderProse } from "../../../lib/prose/read";
import { readSynergyCards } from "./synergy-read";

export default async function CommanderDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const userId = await requireUserId();

  // Only the requested commander is scored — the page used to rank the whole
  // candidate set to render one.
  let found = await resolveCommanderSlug(userId, slug);
  if (!found) notFound();
  if (found.anyDegraded) {
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

  // One explicit primary-key lookup. Nothing this page already reads touches the
  // commander_support header row — scoreOneCommander and readSynergyCards both go to
  // commander_support_cards — so the paragraph does not ride along on an existing read.
  const [synergyCards, prose] = await Promise.all([
    readSynergyCards(userId, commander.oracleId, coveredOracleIds),
    readCommanderProse(commander.oracleId),
  ]);

  return (
    <CommanderDetail
      commander={commander}
      rank={found.rank}
      isBestFit={found.rank === 1}
      synergyCards={synergyCards}
      prose={prose}
    />
  );
}
