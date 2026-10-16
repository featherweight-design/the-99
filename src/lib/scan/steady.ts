import type { Reading } from "./reading";
import { nextTrack, startTrack, type Tracked } from "./track";

// What the lab SHOWS, as opposed to what the camera read last. In low light the top-1 flickers between cards from one
// frame to the next, and a verdict can land on a guess that replaced the right one as the finger came down (Hugh,
// 2026-10-15, on Grizzled Angler). So the guess on screen changes only when a new top-1 has held, frame after frame,
// for `DWELL_MS`; a reading that does not hold never replaces a steady one. When the guess on screen has not been the
// top-1 for `LOSE_MS` and nothing else has held, the screen says it is unsure (a null reading) rather than keep a guess
// nothing supports. A frame with no card is a reading like any other: it too must hold to clear the screen.

export { DWELL_MS, LOSE_MS } from "./track";
/** A verdict pressed within this long of the guess on screen changing is recorded against the guess before it. */
export const CHANGE_GRACE_MS = 700;

export type Display = {
  /** The reading on screen; null while nothing holds (the screen says it is unsure). */
  reading: Reading | null;
  /** When the screen last changed what it says (`performance.now()` time). */
  changedAt: number;
  /** What the screen said before that change. */
  before: Reading | null;
};

/** The display and the dwell under it: the tracker (`track.ts`) keyed by the top-1 card. */
export type SteadyState = Display & { track: Tracked<Reading> };

const keyOf = (r: Reading): string => (r.kind === "card" ? (r.guesses[0]?.oracleId ?? "none") : "none");

/** Whether two readings give the same answer: the same top-1 card, both no card, or both unsure. */
export function sameAnswer(a: Reading | null, b: Reading | null): boolean {
  return a === null || b === null ? a === b : keyOf(a) === keyOf(b);
}

export function startSteady(now: number): SteadyState {
  const track = startTrack<Reading>(now);
  return { reading: null, changedAt: now, before: null, track };
}

/** The display after one more reading arrives at `now`. Pure. */
export function nextSteady(s: SteadyState, r: Reading, now: number): SteadyState {
  const track = nextTrack(s.track, r, now, (a, b) => keyOf(a) === keyOf(b));
  return { reading: track.value, changedAt: track.changedAt, before: track.before, track };
}

/** What a verdict pressed at `pressAt` is recorded against, and how long before the press the screen last changed. A
 * change inside `CHANGE_GRACE_MS` is one the player was not yet reacting to, so the verdict goes to the reading shown
 * before it, and `shown` keeps what was on screen at the press. */
export function tapTarget(d: Display, pressAt: number): { reading: Reading | null; changedMsBeforeTap: number; shown: Reading | null; pressedAt: number } {
  const changedMsBeforeTap = Math.max(0, Math.round(pressAt - d.changedAt));
  const reading = changedMsBeforeTap < CHANGE_GRACE_MS ? d.before : d.reading;
  return { reading, changedMsBeforeTap, shown: d.reading, pressedAt: pressAt };
}
