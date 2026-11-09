// The demo's Top off selection, as pure rules: what is ticked, and what a tap does. Local state only, and the same rules the
// signed-in list reads (`top-off-list.tsx`): a declined row is never ticked, and ticks stop at the open slots, the survivors
// being the first ones in rank order. The bulk pair is the same too: the two plans the fixture's read stored, intersected with
// the rows a press may tick, worded as the signed-in list words them (`bulkFillOptions` is the stored plan's source).

import { topOffCopy } from "../../../lib/copy/top-off";
import { bulkConcession, type BulkPlan } from "../../../lib/decks/bulk-concession";
import { canSeed, type TopOffCandidateWithFacts } from "../../../lib/decks/last-slots";
import { formatCents, summarisePrices } from "../../../lib/decks/price";
import { sameSelection } from "../../decks/top-off-frame";

/** The ticks that count: not declined, in pool order, no more than the open slots. */
export function liveTicks(poolIds: readonly string[], ticked: ReadonlySet<string>, declined: ReadonlySet<string>, openSlots: number): Set<string> {
  return new Set(poolIds.filter((id) => ticked.has(id) && !declined.has(id)).slice(0, Math.max(openSlots, 0)));
}

/** A tap on a row's box: unticks a ticked row, ticks any other unless the open slots are all taken. */
export function toggleTick(live: ReadonlySet<string>, id: string, openSlots: number): Set<string> {
  const next = new Set(live);
  if (next.has(id)) next.delete(id);
  else if (next.size < openSlots) next.add(id);
  return next;
}

/** Setting a row aside takes its tick with it. */
export function declineRow(live: ReadonlySet<string>, declined: ReadonlySet<string>, id: string): { ticked: Set<string>; declined: Set<string> } {
  const ticked = new Set(live);
  ticked.delete(id);
  return { ticked, declined: new Set(declined).add(id) };
}

/** What a bulk control draws and what its press ticks. The press is the host's: it only sets its own ticks. */
export type DemoBulkControl = { ids: string[]; label: string; ariaLabel: string; note: string };

type BulkRow = Pick<TopOffCandidateWithFacts, "oracleId" | "owned" | "availability" | "price">;

/**
 * The bulk pair, as `top-off-list.tsx` decides it from the same two plans. The collection control may tick only a card with a
 * free copy (`canSeed`); the best control ticks any pool row, owned or not, because it buys. Both skip a row set aside. A control
 * whose press would tick nothing is absent (b9), and the best control is absent when it would tick what the collection one does
 * (b3, compared as sets), the survivor then saying "nothing to buy". At the cap with a hand-made selection in the way, both notes
 * say what a press would replace (b11).
 */
export function demoBulk(args: {
  pool: readonly BulkRow[];
  plans: { collection: BulkPlan; best: BulkPlan };
  declined: ReadonlySet<string>;
  tickedCount: number;
  atCap: boolean;
  newestAsOf: Date | null;
}): { collection: DemoBulkControl | null; best: DemoBulkControl | null } {
  const { pool, plans, declined, tickedCount, atCap, newestAsOf } = args;
  const sleevable = new Set(pool.filter((c) => canSeed(c) && !declined.has(c.oracleId)).map((c) => c.oracleId));
  const anyLegal = new Set(pool.filter((c) => !declined.has(c.oracleId)).map((c) => c.oracleId));
  const collectionIds = plans.collection.oracleIds.filter((id) => sleevable.has(id));
  const bestIds = plans.best.oracleIds.filter((id) => anyLegal.has(id));
  const showsCollection = collectionIds.length > 0;
  const showsBest = bestIds.length > 0 && !sameSelection(collectionIds, bestIds);

  const replaces =
    atCap && tickedCount > 0
      ? tickedCount === 1
        ? topOffCopy.bulk.replacesOne
        : topOffCopy.bulk.replaces(String(tickedCount))
      : null;
  const collectionNote = replaces ?? bulkConcession({ shortfalls: plans.collection.shortfalls, measured: plans.collection.measuredTypes, nothingToBuy: !showsBest });
  const bestSet = new Set(bestIds);
  const buying = pool.filter((c) => bestSet.has(c.oracleId) && !c.owned);
  const money = summarisePrices(buying.map((c) => ({ quantity: 1, price: c.price })), newestAsOf);
  const bestNote = replaces ?? topOffCopy.bulk.buy(String(buying.length), money.pricedCopies > 0 ? formatCents(money.totalCents) : null);

  return {
    collection: showsCollection
      ? {
          ids: collectionIds,
          label: topOffCopy.bulk.collection(String(collectionIds.length)),
          ariaLabel: topOffCopy.bulk.collectionAria(String(collectionIds.length), collectionNote),
          note: collectionNote,
        }
      : null,
    best: showsBest
      ? {
          ids: bestIds,
          label: topOffCopy.bulk.best(String(bestIds.length)),
          ariaLabel: topOffCopy.bulk.bestAria(String(bestIds.length), bestNote),
          note: bestNote,
        }
      : null,
  };
}
