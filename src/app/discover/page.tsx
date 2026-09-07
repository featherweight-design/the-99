import { requireUserId } from "../../lib/auth";
import { getCollectionStats } from "../../lib/home/summary";
import { CardFan } from "../../components/marks";
import { DiscoveryView } from "../../components/commanders/discovery-view";
import { loadDiscovery } from "../../lib/discovery/list";
import { parseLaneParams } from "../../lib/commanders/lane-params";
import { searchParamsToQuery } from "../../lib/commanders/search-params";
import { PrimaryButton } from "../../components/ui/button";
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateTitle,
} from "../../components/ui/empty-state";

/**
 * The discover lane: every commander-legal card the player does not own.
 *
 * It has no availability control, and no way to ask for one. Availability was
 * documented as scoring-only, but the novelty floor read whichever pool it
 * selected, so the choice silently removed rows. This lane scores against the
 * whole collection, always.
 */
export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const userId = await requireUserId();
  const params = parseLaneParams(searchParamsToQuery(await searchParams), "discover");
  const stats = await getCollectionStats(userId);

  if (stats.uniqueCards === 0) {
    // No cards → collection-empty analog: send the user to upload. Nothing here
    // can be ranked without a collection to rank it against.
    return (
      <EmptyState>
        {/* Card-fan mark: same construction as collection empty state */}
        <CardFan variant="mobile" className="mb-[22px] sm:hidden" />
        <CardFan variant="desktop" className="mb-[26px] hidden sm:block" />

        <EmptyStateTitle className="text-[28px]">
          No collection yet
        </EmptyStateTitle>

        <EmptyStateBody className="mt-3 max-w-[420px] text-[16px]">
          Upload your cards and we&apos;ll rank every commander you can build.
        </EmptyStateBody>

        <PrimaryButton
          href="/collection"
          className="mt-6 px-[24px] py-[12px] text-[14px]"
        >
          Upload collection
        </PrimaryButton>
      </EmptyState>
    );
  }

  // Discovery does NOT call getRankedList, rankFree or receiptCountsByCommander:
  // all three are shaped for the owned lane's few hundred rows, and two of them
  // walk the collection once per commander. `loadDiscovery` answers the same
  // questions from the offline index in one pass over ~3,300 candidates.
  // The requested ranking, not necessarily the one that comes back:
  // `loadDiscovery` reads the played tags either way, and downgrades `new` to
  // `fit` when there is no deck to measure distance from.
  const discovery = await loadDiscovery(userId, {
    sort: params.scope === "new" ? "new" : "fit",
  });

  return (
    <section className="flex flex-col min-h-screen">
      {/* `avail` is `all` and cannot be anything else: the lane scores the whole
          collection, and the view's own control goes when its rack is rebuilt. */}
      <DiscoveryView discovery={discovery} avail="all" />
    </section>
  );
}
