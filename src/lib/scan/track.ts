// The dwell every scanner screen runs on, pure. A value the camera reads replaces the settled one only once it has
// held, frame after frame, for `DWELL_MS`; a value that does not hold never replaces a settled one. When the settled
// value has not been read for `LOSE_MS` and nothing else has held, the tracker settles on nothing (unsure) rather than
// keep a value nothing supports. What "the same value" means is the caller's: the lab compares top-1 cards
// (`steady.ts`), and a scanner that matches on the server compares the card's own embedding frame to frame.

/** How long a new value must hold before it replaces the settled one. The loop reads a frame every ~150-300ms on a
 * phone (two model runs and a 60ms pause), so a change settles on the fourth to sixth frame of an unbroken run, never
 * sooner than the second. */
export const DWELL_MS = 700;
/** How long the settled value may go unread before the tracker falls to unsure. */
export const LOSE_MS = 2 * DWELL_MS;

export type Tracked<T> = {
  /** The settled value; null while nothing holds. */
  value: T | null;
  /** When the settled value last changed (`performance.now()` time). */
  changedAt: number;
  /** The settled value before that change. */
  before: T | null;
  /** A different value and when its unbroken run began. */
  candidate: { value: T; since: number } | null;
  /** When the settled value was last the camera's own reading. */
  seenAt: number;
};

export function startTrack<T>(now: number): Tracked<T> {
  return { value: null, changedAt: now, before: null, candidate: null, seenAt: now };
}

/**
 * The tracker at `now` when a frame was read but gave it no value (a scanner still waiting on an answer): only the
 * lose rule runs, so a settled value nothing supports falls to unsure on time, and no candidate is started. Pure.
 */
export function ageTrack<T>(s: Tracked<T>, now: number): Tracked<T> {
  if (s.value === null || now - s.seenAt < LOSE_MS) return s;
  return { value: null, changedAt: now, before: s.value, candidate: s.candidate, seenAt: now };
}

/** The tracker after one more value is read at `now`. Pure. */
export function nextTrack<T>(s: Tracked<T>, v: T, now: number, same: (a: T, b: T) => boolean): Tracked<T> {
  // The same as the settled value: keep it, as this frame read it.
  if (s.value !== null && same(s.value, v)) return { ...s, value: v, candidate: null, seenAt: now };
  const since = s.candidate && same(s.candidate.value, v) ? s.candidate.since : now;
  if (now - since >= DWELL_MS) return { value: v, changedAt: now, before: s.value, candidate: null, seenAt: now };
  const candidate = { value: v, since };
  if (s.value !== null && now - s.seenAt >= LOSE_MS) return { value: null, changedAt: now, before: s.value, candidate, seenAt: now };
  return { ...s, candidate };
}
