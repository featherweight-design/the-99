import { requireUserId } from "../../lib/auth";
import { helpMeChooseEnabled } from "../../lib/intake/flag";
import { getCollectionStats } from "../../lib/home/summary";
import { CardFan } from "../../components/marks";
import { DiscoveryView } from "../../components/commanders/discovery-view";
import { cutToWindow, decodeDiscovery } from "../../lib/discovery/encode";
import { loadDiscoveryPayload } from "../../lib/discovery/payload";
import { discoveryRows, settleOrder } from "../../lib/discovery/window";
import { REVEAL_STEP } from "../../lib/commanders/reveal-step";
import { filePrintedIn } from "../../lib/sets/printed-in";
import { lanePrintedInFor } from "../../lib/sets/lane-printed-in";
import { discoverSort, parseLaneParams } from "../../lib/commanders/lane-params";
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
  const sort = discoverSort(params.order);
  // Encoded inside the cache entry rather than after it: the encoded form is
  // what fits under the data cache's per-entry ceiling, and it is also what the
  // view wants. Encoding here rather than inside `loadDiscovery` keeps the list
  // a list for every other reader of it — slug resolution and the tests read
  // `DiscoveryItem`s, not tuples.
  //
  // The row ids ride in the same entry, because `Printed in ▾`'s index is aligned to the rows by
  // POSITION: the encoded rows carry no oracle id. The index itself is crossed with them OUTSIDE
  // the entry, per request: its read can fail, and a failure filed here would hide the control
  // for the entry's whole life. `loadCommanderPrintings` is memoised per catalog generation, so
  // the per-request cost is the crossing, not the read.
  const { encoded, oracleIds } = await loadDiscoveryPayload(userId, sort);
  const printedIn = await lanePrintedInFor(oracleIds.map((oracleId) => ({ oracleId })));

  // THE URL'S OWN FIRST WINDOW keeps its draw columns and every other row ships without them
  // (list payload plan, PR 3): only 25 of about 3,000 rows are drawn on arrival, and the art,
  // the sentence and the fit parts were 70% of the payload. The window is found by the same
  // steps the view runs (`lib/discovery/window`), over the same index, with the order settled
  // against the ranking that actually came back, so the rows the page draws first are the rows
  // it shipped whole. The rest arrive in the background from `/api/discovery-fields`.
  const decoded = decodeDiscovery(encoded);
  const codesBySlug = printedIn
    ? filePrintedIn(new Map(), decoded.items.map((r) => r.slug), printedIn)
    : null;
  const first = discoveryRows(decoded.items, settleOrder(params, decoded.sort), codesBySlug)
    .slice(0, REVEAL_STEP);
  const shipped = cutToWindow(encoded, new Set(first.map((r) => r.slug)));

  return (
    <section className="flex flex-col min-h-screen">
      {/* The view decodes once. */}
      <DiscoveryView encoded={shipped} printedIn={printedIn} chooseLink={helpMeChooseEnabled()} />
    </section>
  );
}
