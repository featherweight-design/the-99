import { dailyPicks } from "./daily-pick";

// The Ready-to-build set — plan ruling 1.
//
// WHICH TWO OF THE SET get cards rotates daily; see `daily-pick.ts` for why, and
// for why it is a cycle over a per-account shuffle rather than a daily hash. The
// SET is untouched by that, and so are both figures drawn beside it.
//
// Design's READINESS blocks a green on "a threshold nobody has set". There is
// one, and it predates the refresh: the headline this section replaces read
// "Nine commanders you can build now". So the set is a RANK cut, not a score
// cut, and the drawn frame falls straight out of it — two cards at 74 and 71,
// then `7 more scored 70 or better`, where 70 was the ninth commander's score.
// The set is two weeks deep now (`READY_COUNT`); the rule and the line are unchanged,
// and the floor is the last commander in the set, whatever its size.
//
// A score cut would need a threshold, and this app has deliberately never had
// one: no surface has ever told a player their commander scores below a bar,
// because a score is a ranking device and not a verdict on a deck they own.
// Do not add one here.

/** How many of them get a card. The rest are the `N more` line. */
export const READY_SHOWN = 2;

/**
 * How many commanders are "ready to build": two weeks of pairs. It was nine from the first Home
 * until 2026-09-27, when Hugh said "I've seen the same few rotate in and out over the last couple
 * of weeks": nine at two a day is a full tour every four and a half days, so a fortnight showed
 * the same nine three or four times each. At 28 a fortnight shows 28, each once (measured on his
 * staging account by `scripts/measure-home-rotation.mts`). Still a RANK cut, as ruled above, and
 * the depth costs little fit there: rank 1 scored 76, rank 28 scored 66.
 */
export const READY_COUNT = READY_SHOWN * 14;

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

export function readySlice<T extends { rankScore: number; oracleId: string }>(
  items: readonly T[],
  /**
   * Who is looking, and when. The set and its floor are the same for everyone;
   * only WHICH two of the set get cards depends on these — see `dailyPicks`.
   *
   * `unplayed` is how many of each commander's themes none of the reader's decks play
   * (`loadUnplayedCounts`), which the rotation leans on. A commander missing from it counts 0,
   * and no map at all is the plain per-account shuffle: a failed read costs the lean, never the
   * section.
   */
  rotation: { userId: string; now: Date; unplayed?: ReadonlyMap<string, number> | null },
): ReadySlice<T> {
  // Sorted here rather than trusted from the caller: getRankedList orders by
  // rankScore today, and a floor taken from an unsorted list would be some
  // arbitrary last element rather than the smallest of the set.
  //
  // Ties keep the caller's order, because Array.prototype.sort is stable and
  // this comparator returns 0 for them. That is what makes the shown pair
  // deterministic without duplicating the oracleId tie-break from
  // byScoreThenOracleId (recommend.ts:101) here: the ranked list arrives
  // already broken on it.
  const set = [...items].sort((a, b) => b.rankScore - a.rankScore).slice(0, READY_COUNT);
  return {
    // The two cards ROTATE within the set; the set itself does not move. That
    // keeps `moreCount` and `floor` exactly what they were — the others in the
    // set, and the set's own lowest score — because both are facts about the
    // set and neither was ever a fact about the two.
    shown: dailyPicks(
      set,
      rotation.userId,
      rotation.now,
      READY_SHOWN,
      rotation.unplayed ? (c) => rotation.unplayed!.get(c.oracleId) ?? 0 : undefined,
    ),
    moreCount: Math.max(0, set.length - READY_SHOWN),
    floor: set.length === 0 ? null : set[set.length - 1].rankScore,
  };
}
