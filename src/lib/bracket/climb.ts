import type { Bracket } from "./types";

/**
 * The three rungs the climb draws, and which role each one plays.
 *
 * THREE ONLY, and that is the rule rather than a layout choice: the brackets a deck is nowhere
 * near are not drawn, which is what removed the repeated "ruled out" line the earlier turn had.
 * So the climb is the deck's own bracket, the one below it and the one above — clamped to the
 * 1-5 range, which is why a deck at 1 or at 5 draws two rungs rather than a blank.
 */
export type ClimbRole = "below" | "yours" | "above";

export type ClimbRung = { bracket: Bracket; role: ClimbRole };

/**
 * `yours` is the bracket the cards REACH, which for a range is its lower member — the deck is at
 * the bottom of what it permits until the player says otherwise, and `[4,5]`'s rung is 4 with the
 * declare line above it rather than 5 with nothing below.
 */
export function climb(permits: readonly Bracket[]): ClimbRung[] {
  const yours = permits[0];
  if (yours === undefined) throw new Error("climb: an empty permitted range has no rungs");
  const rungs: ClimbRung[] = [];
  if (yours > 1) rungs.push({ bracket: (yours - 1) as Bracket, role: "below" });
  rungs.push({ bracket: yours, role: "yours" });
  if (yours < 5) rungs.push({ bracket: (yours + 1) as Bracket, role: "above" });
  return rungs;
}

/**
 * A finding's state, which decides what its tile draws.
 *
 * `notALimit` is the tutors case and it is NOT a violation dressed differently: no bracket limits
 * how many tutors a deck plays, so the count is reported with a `no limit` chip and nothing is
 * ruled out by it. Collapsing it into `present` would let a reader infer a cap that does not
 * exist — which is the whole reason the chip is on the title line.
 */
export type FindingState = "empty" | "present" | "notALimit";

export function findingState(count: number, limited: boolean): FindingState {
  // EMPTY FIRST. A tutor list with nothing in it draws the empty tile, not a `no limit` chip
  // over a zero — the chip answers "how many may I play", and nobody asked.
  if (count === 0) return "empty";
  return limited ? "present" : "notALimit";
}
