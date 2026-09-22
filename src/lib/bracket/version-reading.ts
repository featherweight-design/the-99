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

/**
 * THREE STATES FOR THE PREVIOUS VERSION, not two.
 *
 * `deck_versions.permits` is NULLABLE and `commitVersion` writes both snapshot columns null when
 * it has no snapshot — every version committed before those columns existed is in that state, and
 * so is any pull-triggered auto-commit. Such a version REALLY EXISTS and really is the
 * predecessor; it simply has no recorded reading.
 *
 * An earlier version of this type could only say "a reading" or "no previous version", so a
 * caller holding one of those rows had to either fail type-checking or collapse a real version
 * into `null` — which would have made the documented meaning of `null` a lie on every deck with
 * history older than the columns.
 */
export type PreviousVersion =
  /** No predecessor at all: a first commit, or a brew. */
  | { kind: "none" }
  /** A predecessor that exists but recorded no reading. The row says so rather than guessing. */
  | { kind: "unrecorded" }
  | { kind: "read"; reading: VersionReading };

export type VersionComparison = {
  now: VersionReading;
  was: PreviousVersion;
  /**
   * Whether the ordinary declaration ask follows the comparison row.
   *
   * It does when THIS version is a range, because a range is still a question. It does not when
   * this version is a single bracket, whatever the last one was — the row has said everything
   * there is to say. Carried rather than left to the component for the reason every other flag
   * here is: the component would otherwise hold a second copy of the rule.
   */
  stillAsking: boolean;
  /**
   * Whether the row is drawn at all: this version READS differently from the last one.
   *
   * A comparison of two identical readings says nothing, and a predecessor with no recorded
   * reading cannot be compared — "unrecorded" is not "different". Only the ranges are compared,
   * never the declarations: the row is about what the CARDS permit, and a version that reads the
   * same as the last one but was answered differently has nothing to reconcile.
   */
  changed: boolean;
};

function reading(permits: readonly Bracket[], declared: Bracket | null): VersionReading {
  const split = permits.length > 1;
  return { verb: split ? "permits" : "readsAs", permits, declared, split };
}

export function versionComparison(
  now: { permits: readonly Bracket[]; declared: Bracket | null },
  /** `null` for no predecessor; a row whose `permits` is null for one that recorded nothing. */
  was: { permits: readonly Bracket[] | null; declared: Bracket | null } | null,
): VersionComparison {
  const current = reading(now.permits, now.declared);
  const previous = was !== null && was.permits !== null && was.permits.length > 0 ? was.permits : null;
  return {
    now: current,
    // A PREVIOUS VERSION WITH NO DECLARATION STILL READS. The row compares READINGS, not
    // answers, so a version that was never declared still says what it PERMITTED — dropping it
    // would leave the comparison with one side and no reason for the row to exist.
    //
    // But a version with no recorded PERMITS has no reading to show, and saying so is not the
    // same as saying there was no version. Three states, one of them explicit.
    was: was === null
      ? { kind: "none" }
      : was.permits === null || was.permits.length === 0
        ? { kind: "unrecorded" }
        : { kind: "read", reading: reading(was.permits, was.declared) },
    stillAsking: current.split,
    changed: previous !== null && previous.join(",") !== [...now.permits].join(","),
  };
}
