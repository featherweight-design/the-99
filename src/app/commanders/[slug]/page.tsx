import { notFound } from "next/navigation";
import { requireUserId } from "../../../lib/auth";
import { scoreOneCommander } from "../../../lib/recs/recommend";
import { loadFreePool, rankFree } from "../../../lib/recs/free-ranking";
import type { PoolCard } from "../../../lib/recs/score";
import { resolveCommanderSlug } from "../../../lib/discovery/resolve-slug";
import { getRankedList } from "../../../lib/recs/ranked-list";
import { CommanderDetail } from "../../../components/commanders/detail";
import { readCommanderProse } from "../../../lib/prose/read";
import { readSynergyCards } from "./synergy-read";

export default async function CommanderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ avail?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const userId = await requireUserId();
  // The list links here carrying the mode it ranked in. Without it a commander
  // ranked against the free pool opened a page scored against everything owned,
  // and the two screens disagreed about the same commander's fit by whatever
  // the player has sleeved.
  const requested = query.avail === "free" ? "free" : "all";

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

  // Both halves of the free mode or neither. The rank and the score have to come
  // off the same pool, so anything that stops the free ranking being computed —
  // an unreadable availability rollup, or a canonical list that no longer names
  // this commander — drops the whole page back to the canonical mode rather
  // than pairing a free score with a rank from the other list.
  let avail: "all" | "free" = "all";
  let pool: PoolCard[] | undefined;
  if (requested === "free") {
    const { items } = await getRankedList(userId);
    const free = await rankFree(userId, items);
    const idx = free.ok ? free.items.findIndex((i) => i.oracleId === found!.oracleId) : -1;
    // Already loaded and memoised by the ranking above, so this is a map read.
    const freePool = idx === -1 ? null : await loadFreePool(userId);
    if (freePool) {
      avail = "free";
      pool = freePool;
      found = { ...found, rank: idx + 1 };
    }
  }

  const commander = await scoreOneCommander(userId, found.oracleId, slug, pool);
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
      avail={avail}
      synergyCards={synergyCards}
      prose={prose}
    />
  );
}
