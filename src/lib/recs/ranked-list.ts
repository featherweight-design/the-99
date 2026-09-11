import { cache } from "react";
import { loadBuiltCommanderIds } from "../discovery/candidates";
import { getCollectionStats } from "../home/summary";
import { recommendCommanders, toListItem, type CommanderListItem } from "./recommend";
import { collectionGeneration, loadScores, persistScores } from "./store";

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
  const [stored, stats] = await Promise.all([loadScores(userId), getCollectionStats(userId)]);

  // An empty collection has nothing to score, so skip both the pool query and the
  // best-effort write. Checked ahead of the stored-rows path so a leftover row set
  // can never outlive the collection it was derived from.
  if (stats.uniqueCards === 0) {
    return { items: [], degraded: false, uniqueCardsRead: 0, candidateCount: 0 };
  }

  const list = await assemble(userId, stored, stats.uniqueCards);

  // The one exclusion both paths pass through. Nothing to exclude from an empty
  // list, and a collection can hold cards without supporting a single rankable
  // commander, so the deck read is skipped rather than asked and discarded.
  if (list.items.length === 0) return { ...list, candidateCount: 0 };

  const built = await loadBuiltCommanderIds(userId);
  const items = list.items.filter((i) => !built.has(i.oracleId));
  return { ...list, items, candidateCount: items.length };
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

  // Captured before the pool read so persistScores can drop the write if an upload
  // replaces the collection while this compute is in flight.
  const generation = await collectionGeneration(userId);
  const recs = await recommendCommanders(userId);
  // The computed list is already correct; persisting is only an optimisation for
  // the next request, so a transient write failure must not fail this render.
  try {
    await persistScores(userId, recs.results, generation);
  } catch {
    // Next load recomputes.
  }
  return {
    items: recs.results.map(toListItem),
    degraded: recs.degraded,
    uniqueCardsRead: recs.uniqueCardsRead,
    candidateCount: recs.candidateCount,
  };
}
