import { cache } from "react";
import { loadBuiltCommanderIds } from "../discovery/candidates";
import { getCollectionStats } from "../home/summary";
import { recommendCommanders, toListItem, type CommanderListItem } from "./recommend";
import { collectionGeneration, indexGeneration, loadScores, persistScores } from "./store";

export type RankedList = {
  items: CommanderListItem[];
  degraded: boolean;
  uniqueCardsRead: number;
  candidateCount: number;
};

/**
 * Ranked commander list for a user, served from commander_scores when possible.
 *
 * Miss and degraded both recompute the full set. Repairing only the degraded rows
 * would be less work, but a full recompute is the same work the page did before
 * scores were persisted, happens only after an actual EDHREC outage, and avoids a
 * second write path. A user with a collection but no legendary creatures also takes
 * the recompute branch on every load; that costs one collection query and zero
 * EDHREC calls, so it is not worth a sentinel row to avoid.
 *
 * getCollectionStats is React-cached, so sharing it with a caller that already
 * needed stats costs no extra query.
 *
 * This is the list a player picks their *next* commander from, so a commander
 * already helming a deck is excluded. The exclusion applies HERE, at the read,
 * after the stored and recomputed paths have converged, and `recommendCommanders`
 * applies none of its own — the two halves of one rule, and both are load-bearing.
 * Filtering the recompute alone would leave a warm commander_scores cache serving
 * built commanders forever; filtering it as WELL is what shipped, and it deleted
 * the built commander from the store (`persistScores` drops every row the compute
 * does not name) so that deleting the deck never brought it back. The persisted
 * scores stay whole: building a deck must not invalidate the cache, and must not
 * evict from it either.
 */
export const getRankedList = cache(async function getRankedList(
  userId: string,
): Promise<RankedList> {
  // Stats first and alone: an empty collection has nothing to score, so it must
  // reach neither the store nor the decks table. Checked ahead of the stored-rows
  // path so a leftover row set can never outlive the collection it came from, and
  // `getCollectionStats` is React-cached, so a caller that already needed stats
  // pays nothing for this ordering.
  const stats = await getCollectionStats(userId);
  if (stats.uniqueCards === 0) {
    return { items: [], degraded: false, uniqueCardsRead: 0, candidateCount: 0 };
  }

  // The deck read moves up here, ahead of `assemble`, because the stored set's
  // usability now depends on it: see the degraded filter below.
  const [stored, built] = await Promise.all([loadScores(userId), loadBuiltCommanderIds(userId)]);

  // Degradation is a property of the rows this list SHOWS. The store holds built
  // commanders too, and a degraded row among them is a row nobody is looking at:
  // left in, a commander EDHREC does not index and whose deck the player keeps
  // would put the whole set in the recompute branch on every single request, and
  // that branch is the EDHREC fanout. The built row still repairs — it just waits
  // for something that reads it. Its deck being deleted is exactly that: `built`
  // no longer names it, the filter below stops removing it, and this one stops
  // ignoring its degradation.
  const visible = {
    ...stored,
    degradedOracleIds: stored.degradedOracleIds.filter((id) => !built.has(id)),
  };

  const list = await assemble(userId, visible, stats.uniqueCards);

  // The one exclusion both paths pass through. Nothing to exclude from an empty
  // list — a collection can hold cards without supporting a single rankable
  // commander.
  if (list.items.length === 0) return { ...list, candidateCount: 0 };

  const items = list.items.filter((i) => !built.has(i.oracleId));
  // And the flag follows the same rule as the row filter above, for the same
  // reason: `assemble` reports degradation across everything it scored, built
  // commanders included, so an EDHREC outage touching only a built commander
  // would raise the outage banner over a list where every visible row is whole.
  // Read off the rows themselves rather than carried down from the compute —
  // `synergyState` is per row, and it is what the stored path already derives
  // its own degraded set from, so both paths now answer this the same way.
  const degraded = items.some((i) => i.synergyState === "degraded");
  return { ...list, items, degraded, candidateCount: items.length };
});

async function assemble(
  userId: string,
  stored: Awaited<ReturnType<typeof loadScores>>,
  uniqueCards: number,
): Promise<RankedList> {
  if (stored.items.length > 0 && stored.degradedOracleIds.length === 0) {
    return {
      items: stored.items,
      degraded: false,
      uniqueCardsRead: uniqueCards,
      candidateCount: stored.items.length,
    };
  }

  // Both captured before the reads they fingerprint, so persistScores can drop
  // the write if either input moves while this compute is in flight — an upload
  // replacing the collection, or the monthly rebuild replacing the commander
  // index that every synergy figure now comes from.
  const [generation, indexGen] = await Promise.all([
    collectionGeneration(userId),
    indexGeneration(),
  ]);
  const recs = await recommendCommanders(userId);
  // The computed list is already correct; persisting is only an optimisation for
  // the next request, so a transient write failure must not fail this render.
  try {
    await persistScores(userId, recs.results, generation, indexGen);
  } catch {
    // not a fallback: the list is already computed and correct; only its store for next time failed.
    // Next load recomputes.
  }
  return {
    items: recs.results.map(toListItem),
    degraded: recs.degraded,
    uniqueCardsRead: recs.uniqueCardsRead,
    candidateCount: recs.candidateCount,
  };
}
