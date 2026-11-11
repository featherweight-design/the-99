// The Feedback tab's pure rules (flyer trial, admin Feedback PR A): the filter, the row the page draws, what a stored
// `answers` blob is allowed to become, the header figures and the relative time. No database and no Clerk here, and
// no copy: the page owns the words. A row is read from jsonb a player's form wrote, so `coerceAnswers` never throws.

import { CHECK_IN_PODS, CHECK_IN_USES, NOTE_MAX } from "../feedback/check-in-rule";
import { DOING_MAX, WHAT_MAX } from "../feedback/report-rule";

export const FEEDBACK_FILTERS = ["all", "problem", "check_in"] as const;
export type FeedbackFilter = (typeof FEEDBACK_FILTERS)[number];
export type FeedbackKind = "problem" | "check_in";

/** Anything but a known filter reads as `all`. */
export function parseFeedbackFilter(value: unknown): FeedbackFilter {
  return typeof value === "string" && (FEEDBACK_FILTERS as readonly string[]).includes(value) ? (value as FeedbackFilter) : "all";
}

/** The pod answer is one of three phrases; a stored one is capped like a note in case an older build wrote free text. */
export const POD_MAX = Math.max(...CHECK_IN_PODS.map((p) => p.length), 64);
export { NOTE_MAX };

export type ProblemAnswers = { what: string; doing: string };
export type CheckInAnswers = { rating: number | null; uses: string[]; pod: string; note: string };

export type FeedbackRow = {
  id: string;
  kind: FeedbackKind;
  /** The masked name, or null for a report filed signed out. Never an id or an address. */
  name: string | null;
  group: string | null;
  /** ISO instant. */
  at: string;
  unread: boolean;
  page: string | null;
  device: string | null;
  /** The first eight characters of the error digest. */
  digest: string | null;
  source: string | null;
  answers: ProblemAnswers | CheckInAnswers;
};

const text = (value: unknown, max: number): string => (typeof value === "string" ? value.slice(0, max) : "");
const asRecord = (raw: unknown): Record<string, unknown> =>
  raw !== null && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};

export function coerceAnswers(kind: "problem", raw: unknown): ProblemAnswers;
export function coerceAnswers(kind: "check_in", raw: unknown): CheckInAnswers;
export function coerceAnswers(kind: FeedbackKind, raw: unknown): ProblemAnswers | CheckInAnswers;
export function coerceAnswers(kind: FeedbackKind, raw: unknown): ProblemAnswers | CheckInAnswers {
  const a = asRecord(raw);
  if (kind === "problem") return { what: text(a.what, WHAT_MAX), doing: text(a.doing, DOING_MAX) };
  const r = a.rating;
  const known: readonly string[] = CHECK_IN_USES;
  const uses = Array.isArray(a.uses) ? [...new Set(a.uses.filter((u): u is string => typeof u === "string" && known.includes(u)))] : [];
  return {
    rating: typeof r === "number" && Number.isInteger(r) && r >= 1 && r <= 5 ? r : null,
    uses,
    pod: text(a.pod, POD_MAX),
    note: text(a.note, NOTE_MAX),
  };
}

/** The header's figures: unread count and the check-ins' average rating (null with none), rounded to one place. */
export function summaryOf(fresh: number, avg: number | null): { fresh: number; avg: number | null } {
  return { fresh, avg: avg === null || !Number.isFinite(avg) ? null : Math.round(avg * 10) / 10 };
}

export type RelativeTime =
  | { kind: "minutes"; n: number }
  | { kind: "hours"; n: number }
  | { kind: "yesterday" }
  | { kind: "date"; month: number; day: number };

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/**
 * Under an hour: minutes (at least 1); under a day: hours; a day to under 48 hours: yesterday; then the UTC month
 * (1..12) and day. A future instant (clock skew) reads as one minute.
 */
export function relativeTime(nowMs: number, thenMs: number): RelativeTime {
  const age = nowMs - thenMs;
  if (age < HOUR) return { kind: "minutes", n: Math.max(1, Math.floor(age / MIN)) };
  if (age < DAY) return { kind: "hours", n: Math.floor(age / HOUR) };
  if (age < 2 * DAY) return { kind: "yesterday" };
  const d = new Date(thenMs);
  return { kind: "date", month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}
