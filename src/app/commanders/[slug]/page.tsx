import { notFound, redirect } from "next/navigation";
import { requireUserId } from "../../../lib/auth";
import { scoreOneCommander } from "../../../lib/recs/recommend";
import { loadFreePool, rankFree } from "../../../lib/recs/free-ranking";
import type { PoolCard } from "../../../lib/recs/score";
import { resolveCommanderSlug } from "../../../lib/discovery/resolve-slug";
import { resolveOwnedPrintings, withOwnedCardArt } from "../../../lib/collection/owned-printings";
import { getRankedList } from "../../../lib/recs/ranked-list";
import { CommanderDetail } from "../../../components/commanders/detail";
import { readCommanderProse } from "../../../lib/prose/read";
import { readSynergyCards } from "./synergy-read";
import { loadAvailability } from "../../../lib/decks/availability-query";
import { withAvailability, type Availability } from "../../../lib/decks/availability";
import { loadPrices } from "../../../lib/decks/price-query";
import type { RoleName, RoleCard } from "../../../lib/recs/score";
import { chainArt, withChainArt } from "../../../lib/cards/chain-art";

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

    // A commander the free ranking READ CLEANLY and does not hold is not a
    // failure of this page: it is the mode's own answer, now that free mode
    // lists from the free pool. Its own card is sleeved, so there is no free
    // rank to pair a free score with and there never will be until a deck gives
    // it back. The URL is sent to the mode the page is actually going to draw,
    // rather than left saying `free` over a canonical score — which is the state
    // the list can no longer link to, and which a bookmark otherwise reaches.
    //
    // `free.ok` is what keeps this off the outage path. There the free read
    // failed, the fallback is transient, and stripping the parameter would throw
    // away the reader's stated intent on a condition that clears by itself.
    if (free.ok && idx === -1) redirect(`/commanders/${slug}`);

    // Already loaded and memoised by the ranking above, so this is a map read.
    const freePool = idx === -1 ? null : await loadFreePool(userId);
    if (freePool) {
      avail = "free";
      pool = freePool;
      found = { ...found, rank: idx + 1 };
    }
  }

  const scored = await scoreOneCommander(userId, found.oracleId, slug, pool);
  if (!scored) notFound();
  // The head of this page is the row's own link target, so it draws what the row drew: a
  // row captioned with the copy the reader owns leading to a page headed with the oracle
  // name and another printing's art is the mismatch, arriving one click later. ONE oracle
  // id, so the lookup is a single-row read rather than the lane's whole list. The page's
  // card rows take their owned art further down, in one read beside the claims.
  const [commander] = await withOwnedCardArt(userId, [scored]);

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
  const [synergyRead, prose] = await Promise.all([
    // With images: each synergy row previews its card, and card details is the other half of that row.
    readSynergyCards(userId, [commander.oracleId], coveredOracleIds, true),
    readCommanderProse(commander.oracleId),
  ]);
  // The printing the player owns for the cards they own, which is the one card details opens.
  const synergyCards = withChainArt(
    synergyRead,
    await chainArt(userId, null, synergyRead.filter((c) => c.owned).map((c) => c.oracleId)),
  );

  // ONE claim read for the whole page, off-decklist vantage — there is no
  // current deck here to exclude, so every figure is the unexcluded one — and
  // narrowed to the cards the page draws. Both surfaces read it: Role Coverage's
  // chips and the synergy panel's slot.
  //
  // Never cached, and not for want of a key: a claim is point-in-time by
  // contract. Another deck can commit between this read and the reader's next
  // click, which is why nothing on this page authorizes a write.
  //
  // TWO INDEPENDENT READS, TOGETHER. Neither needs the other's answer, and run
  // in sequence they added a database round trip to every commander response —
  // the deck page already pairs the same two.
  //
  // Both FAIL-SOFT, as every other availability-bearing route is: `/collection`
  // and the deck page both catch this claim read. Enrichment must not take a
  // commander's page down with it — an empty map means every card reads null,
  // which is already the no-marker path, and an absent price draws a bare `buy`,
  // which `BuyTag` already handles.
  //
  // The price read is narrowed to UNOWNED synergy ids: Role Coverage is built
  // from the owned pool and has nothing to buy (ruling 6). `loadPrices` rather
  // than a hand-rolled join, because it already encodes foil-only, sold-out and
  // never-stocked, and a second expression of those rules would drift from it
  // one round at a time.
  //
  // ROLE COVERAGE DRAWS THE COPY THE READER OWNS (Hugh, 2026-10-05): its cards' neighbor plates drew
  // nothing while the card details drew the owned printing. One read over the role cards (all owned:
  // Role Coverage is built from the owned pool), beside the other two, carrying the art and the name
  // printed on it together. The synergy panel is read without images, so it asks for none.
  // Fail-soft through `resolveOwnedPrintings`: a failed read keeps what was there.
  const [availability, { prices, newestAsOf }, ownedArt] = await Promise.all([
    loadAvailability(userId, {
      oracleIds: [...new Set([...coveredOracleIds, ...synergyCards.map((c) => c.oracleId)])],
    }).catch(() => new Map<string, Availability>()),
    loadPrices(synergyCards.filter((c) => !c.owned).map((c) => c.oracleId)).catch(() => ({
      prices: new Map(),
      newestAsOf: null,
    })),
    resolveOwnedPrintings(userId, [...new Set(coveredOracleIds)]),
  ]);

  const synergyWithClaims = withAvailability(synergyCards, availability).map((c) => ({
    ...c,
    price: prices.get(c.oracleId) ?? null,
  }));

  const withClaims = {
    ...commander,
    roleCards: Object.fromEntries(
      Object.entries(commander.roleCards).map(([role, cards]) => [
        role,
        withAvailability(cards, availability).map((c) => ({
          ...c,
          imageUri: ownedArt.get(c.oracleId)?.imageUri ?? null,
          printedName: ownedArt.get(c.oracleId)?.printedName ?? null,
        })),
      ]),
    ) as Record<RoleName, RoleCard[]>,
  };

  return (
    <CommanderDetail
      commander={withClaims}
      rank={found.rank}
      isBestFit={found.rank === 1}
      avail={avail}
      synergyCards={synergyWithClaims}
      newestAsOf={newestAsOf}
      prose={prose}
    />
  );
}
