import { cache } from "react";
import { getCollectionStats } from "../home/summary";
import { recommendCommanders, toListItem, type CommanderListItem } from "./recommend";
import { loadScores, persistScores } from "./store";

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
 */
export const getRankedList = cache(async function getRankedList(
  userId: string,
): Promise<RankedList> {
  const [stored, stats] = await Promise.all([loadScores(userId), getCollectionStats(userId)]);

  if (stored.items.length > 0 && stored.degradedOracleIds.length === 0) {
    return {
      items: stored.items,
      degraded: false,
      uniqueCardsRead: stats.uniqueCards,
      candidateCount: stored.items.length,
    };
  }

  const recs = await recommendCommanders(userId);
  // The computed list is already correct; persisting is only an optimisation for
  // the next request, so a transient write failure must not fail this render.
  try {
    await persistScores(userId, recs.results);
  } catch {
    // Next load recomputes.
  }
  return {
    items: recs.results.map(toListItem),
    degraded: recs.degraded,
    uniqueCardsRead: recs.uniqueCardsRead,
    candidateCount: recs.candidateCount,
  };
});
