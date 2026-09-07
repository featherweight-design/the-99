// The Ready-to-build set — plan ruling 1.
//
// Design's READINESS blocks a green on "a threshold nobody has set". There is
// one, and it predates the refresh: the headline this section replaces read
// "Nine commanders you can build now". So the set is a RANK cut, not a score
// cut, and the drawn frame falls straight out of it — two cards at 74 and 71,
// then `7 more scored 70 or better`, where 70 is the ninth commander's score.
//
// A score cut would need a threshold, and this app has deliberately never had
// one (see src/components/home/commander-count.tsx). Do not add one here.

/** How many commanders are "ready to build". Nine, since the first Home. */
export const READY_COUNT = 9;

/** How many of them get a card. The rest are the `N more` line. */
export const READY_SHOWN = 2;

export type ReadySlice<T> = {
  shown: T[];
  /** Commanders in the set behind the shown ones. 0 means: print no line. */
  moreCount: number;
  /**
   * The lowest rankScore IN THE SET — never a rounder number, per the copy
   * file. Null only when the set is empty, where there is no line to print.
   */
  floor: number | null;
};

export function readySlice<T extends { rankScore: number }>(items: readonly T[]): ReadySlice<T> {
  // Sorted here rather than trusted from the caller: getRankedList orders by
  // rankScore today, and a floor taken from an unsorted list would be some
  // arbitrary ninth element rather than the smallest of the nine.
  //
  // Ties keep the caller's order, because Array.prototype.sort is stable and
  // this comparator returns 0 for them. That is what makes the shown pair
  // deterministic without duplicating compareRanked's oracleId tie-break here:
  // the ranked list arrives already broken on it.
  const set = [...items].sort((a, b) => b.rankScore - a.rankScore).slice(0, READY_COUNT);
  return {
    shown: set.slice(0, READY_SHOWN),
    moreCount: Math.max(0, set.length - READY_SHOWN),
    floor: set.length === 0 ? null : set[set.length - 1].rankScore,
  };
}
