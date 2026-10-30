// The check-in's rules (flyer trial PR 6; handoff `Survey-Phone`, `Survey-Desktop`). Pure: the state transitions the
// actions run, the due test, and what an answer accepts. Nothing here reaches a model prompt, so none of it goes
// through `playerText`.

/** Due once the first Home load is this many days old AND Home has loaded on this many distinct UTC days. */
export const DUE_AFTER_DAYS = 14;
export const DUE_VISIT_DAYS = 5;
/** Not now brings it back after this many days; the fourth Not now ends the check-in. */
export const SNOOZE_DAYS = 3;
export const MAX_SNOOZES = 3;
/** Validation only; the form draws no counter. */
export const NOTE_MAX = 1000;

/** The six places a reader can say they use most, and the three answers to telling their pod, as the boards list them. */
export const CHECK_IN_USES = ["Collection", "Commanders", "Decks", "Shopping", "Friends", "Precons"] as const;
export const CHECK_IN_PODS = ["Yes", "Maybe", "Already have"] as const;
export type CheckInUse = (typeof CHECK_IN_USES)[number];
export type CheckInPod = (typeof CHECK_IN_PODS)[number];

const DAY_MS = 86_400_000;

/** The check-in state as the table holds it (`check_in_state`). */
export type CheckInState = {
  firstSeenAt: Date;
  visitDays: number;
  /** The latest UTC day with a Home load, `YYYY-MM-DD`. */
  lastVisitDay: string | null;
  snoozes: number;
  snoozedUntil: Date | null;
  endedAt: Date | null;
};

/** The UTC calendar day of an instant, `YYYY-MM-DD`: the unit a visit is counted in. */
export function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** A Home load: counts today once per UTC day. An ended check-in is left alone (nothing more to count for). */
export function countVisit(state: CheckInState, now: Date): CheckInState {
  if (state.endedAt) return state;
  const today = utcDay(now);
  if (state.lastVisitDay === today) return state;
  return { ...state, visitDays: state.visitDays + 1, lastVisitDay: today };
}

/** Whether the check-in should open: not ended, not snoozed, 14 days on, and 5 distinct days of Home loads. */
export function isDue(state: CheckInState, now: Date): boolean {
  if (state.endedAt) return false;
  if (state.snoozedUntil && state.snoozedUntil.getTime() > now.getTime()) return false;
  return now.getTime() - state.firstSeenAt.getTime() >= DUE_AFTER_DAYS * DAY_MS && state.visitDays >= DUE_VISIT_DAYS;
}

/** Not now: the next three snooze for three days; the one after ends the check-in for good. */
export function snooze(state: CheckInState, now: Date): CheckInState {
  if (state.endedAt) return state;
  if (state.snoozes >= MAX_SNOOZES) return end(state, now);
  return { ...state, snoozes: state.snoozes + 1, snoozedUntil: new Date(now.getTime() + SNOOZE_DAYS * DAY_MS) };
}

/** Send or ✕: asked once ever. */
export function end(state: CheckInState, now: Date): CheckInState {
  return state.endedAt ? state : { ...state, endedAt: now, snoozedUntil: null };
}

export type CheckInInput = { rating: unknown; uses: unknown; pod: unknown; note: unknown };
export type ParsedCheckIn = { rating: number; uses: CheckInUse[]; pod: CheckInPod | null; note: string | null };

/**
 * The answers as stored, or null when the rating is not a whole 1 to 5, a use is not one of the six (a repeat is
 * folded), the pod is not one of the three (or null), or the note is not a string (or null) over its cap once trimmed.
 */
export function parseCheckIn(input: CheckInInput): ParsedCheckIn | null {
  const { rating, uses, pod, note } = input;
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) return null;
  if (!Array.isArray(uses)) return null;
  const picked = new Set<string>();
  for (const use of uses) {
    if (!CHECK_IN_USES.includes(use as CheckInUse)) return null;
    picked.add(use as string);
  }
  if (pod !== null && !CHECK_IN_PODS.includes(pod as CheckInPod)) return null;
  if (note !== null && typeof note !== "string") return null;
  const text = note === null ? "" : note.trim();
  if (text.length > NOTE_MAX) return null;
  return {
    rating,
    // In the boards' order, whatever order the pills were pressed in.
    uses: CHECK_IN_USES.filter((use) => picked.has(use)),
    pod: (pod as CheckInPod | null) ?? null,
    note: text.length > 0 ? text : null,
  };
}
