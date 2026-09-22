import type { Bracket } from "./types";

/**
 * How this version reads, beside how the last one did.
 *
 * THIS REPLACES THE DRIFT MATRIX. `declaredOutsidePermits` was drawn as a standing statement the
 * deck had outgrown; per version there is no such statement. The block states what THIS version
 * reads as and what the LAST one read as, and that is all.
 *
 * DIRECTION IS GONE, and that is the load-bearing simplification. The earlier turn needed
 * "moved past" and "brought inside" because a claim about a deck can be wrong in one direction.
 * A comparison of two readings is directionless: one sentence covers a deck tuned up and a deck
 * tuned down, and neither asks the player to revise something that was true when they wrote it.
 *
 * CARDINALITY IS THE ONLY AXIS LEFT. A range PERMITS; a single bracket READS AS — in the
 * sentence and in the mark label — and the split pill appears only where there are two marks.
 */
export type VersionReading = {
  /** `permits` for a range, `readsAs` for one bracket. The only axis the sentence turns on. */
  verb: "permits" | "readsAs";
  permits: readonly Bracket[];
  declared: Bracket | null;
  /** Two marks and a split pill, or one mark and none. */
  split: boolean;
};

export type VersionComparison = {
  now: VersionReading;
  /** Null when there is no previous version to compare against — a first commit, or a brew. */
  was: VersionReading | null;
  /**
   * Whether the ordinary declaration ask follows the comparison row.
   *
   * It does when THIS version is a range, because a range is still a question. It does not when
   * this version is a single bracket, whatever the last one was — the row has said everything
   * there is to say. Carried rather than left to the component for the reason every other flag
   * here is: the component would otherwise hold a second copy of the rule.
   */
  stillAsking: boolean;
};

function reading(permits: readonly Bracket[], declared: Bracket | null): VersionReading {
  const split = permits.length > 1;
  return { verb: split ? "permits" : "readsAs", permits, declared, split };
}

export function versionComparison(
  now: { permits: readonly Bracket[]; declared: Bracket | null },
  was: { permits: readonly Bracket[]; declared: Bracket | null } | null,
): VersionComparison {
  const current = reading(now.permits, now.declared);
  return {
    now: current,
    // A PREVIOUS VERSION WITH NO DECLARATION STILL READS. The row compares READINGS, not
    // answers, so a version that was never declared still says what it permitted — dropping it
    // would leave the comparison with one side and no reason for the row to exist.
    was: was ? reading(was.permits, was.declared) : null,
    stillAsking: current.split,
  };
}
