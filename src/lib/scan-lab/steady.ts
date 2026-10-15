import type { Reading } from "./reading";

// What the lab SHOWS, as opposed to what the camera read last. In low light the top-1 flickers between cards from one
// frame to the next, and a verdict can land on a guess that replaced the right one as the finger came down (Hugh,
// 2026-10-15, on Grizzled Angler). So the guess on screen changes only when a new top-1 has held, frame after frame,
// for `DWELL_MS`; a reading that does not hold never replaces a steady one. When the guess on screen has not been the
// top-1 for `LOSE_MS` and nothing else has held, the screen says it is unsure (a null reading) rather than keep a guess
// nothing supports. A frame with no card is a reading like any other: it too must hold to clear the screen.

/** How long a new top-1 must hold before it replaces the guess on screen. The loop reads a frame every ~150-300ms on a
 * phone (two model runs and a 60ms pause), so this is three or four frames, and never fewer than two. */
export const DWELL_MS = 700;
/** How long the guess on screen may go unseen before the screen falls to unsure. */
export const LOSE_MS = 2 * DWELL_MS;
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

export type SteadyState = Display & {
  /** A different top-1 and when its unbroken run began. */
  candidate: { key: string; since: number } | null;
  /** When the reading on screen was last the camera's own top-1. */
  seenAt: number;
};

const keyOf = (r: Reading): string => (r.kind === "card" ? (r.guesses[0]?.oracleId ?? "none") : "none");

export function startSteady(now: number): SteadyState {
  return { reading: null, changedAt: now, before: null, candidate: null, seenAt: now };
}

/** The display after one more reading arrives at `now`. Pure. */
export function nextSteady(s: SteadyState, r: Reading, now: number): SteadyState {
  const key = keyOf(r);
  // The same answer as the screen: keep it, with this frame's own figures and crop.
  if (s.reading !== null && keyOf(s.reading) === key) return { ...s, reading: r, candidate: null, seenAt: now };
  const candidate = s.candidate?.key === key ? s.candidate : { key, since: now };
  if (now - candidate.since >= DWELL_MS) {
    return { reading: r, changedAt: now, before: s.reading, candidate: null, seenAt: now };
  }
  if (s.reading !== null && now - s.seenAt >= LOSE_MS) {
    return { reading: null, changedAt: now, before: s.reading, candidate, seenAt: now };
  }
  return { ...s, candidate };
}

/** What a verdict pressed at `pressAt` is recorded against, and how long before the press the screen last changed. A
 * change inside `CHANGE_GRACE_MS` is one the player was not yet reacting to, so the verdict goes to the reading shown
 * before it, and `shown` keeps what was on screen at the press. */
export function tapTarget(d: Display, pressAt: number): { reading: Reading | null; changedMsBeforeTap: number; shown: Reading | null } {
  const changedMsBeforeTap = Math.max(0, Math.round(pressAt - d.changedAt));
  const reading = changedMsBeforeTap < CHANGE_GRACE_MS ? d.before : d.reading;
  return { reading, changedMsBeforeTap, shown: d.reading };
}
