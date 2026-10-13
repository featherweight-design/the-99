/**
 * The per-player model allowance, as arithmetic. Pure and client-safe, so a panel can say how
 * much is left and when it comes back without importing the database.
 *
 * ONE allowance, shared by every model feature — deck tuning and the deck synopsis spend the
 * same units (Hugh, 2026-09-23), so there is one counter and one number. Only a successful
 * answer spends a unit; a failed or stopped run is refunded (Hugh, 2026-09-23). The window is a
 * rolling 24 hours rather than a calendar day, because a fixed reset has to pick a time zone and
 * a rolling one names an honest time for the next unit.
 *
 * `src/lib/model/allowance.ts` is the ledger this reads.
 */

/**
 * Model runs per player per rolling 24 hours, across every feature, shared by tuning and the
 * synopsis.
 *
 * Owner 10, friends 5 (3 until 2026-10-09, when Hugh raised it): Hugh, via the orchestrator, 2026-09-24. It replaced a flat five (2026-09-23)
 * when the app-wide spend cap arrived (`spend-rule.ts`): the cap bounds the month's dollars, so
 * the per-player number only has to share the budget fairly, and the owner — who tests every
 * change — gets more presses than a friend. Which account is the owner is `MODEL_OWNER_USER_ID`,
 * read once in `allowance.ts` (`dailyLimitFor`); unset, everyone gets the friend's five.
 */
export const MODEL_OWNER_DAILY_ALLOWANCE = 10;
export const MODEL_FRIEND_DAILY_ALLOWANCE = 5;

/**
 * The owner's daily limit, from `MODEL_OWNER_DAILY_ALLOWANCE` when it is set to a positive whole
 * number. Anything else (unset, blank, zero, negative, fractional, or not a number) falls back to
 * `MODEL_OWNER_DAILY_ALLOWANCE`. It exists so staging can give the owner room to test (Hugh,
 * 2026-10-12) while production stays unset, at ten. It applies to the owner alone: a friend's
 * five has no override.
 */
export function ownerDailyAllowanceFrom(raw: string | undefined): number {
  const v = raw?.trim() ?? "";
  if (!/^\d+$/.test(v)) return MODEL_OWNER_DAILY_ALLOWANCE;
  const n = Number(v);
  return Number.isSafeInteger(n) && n > 0 ? n : MODEL_OWNER_DAILY_ALLOWANCE;
}

export const ALLOWANCE_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * How long a `reserved` unit counts before it is taken to be stranded.
 *
 * A reservation counts because it is a run in flight — that is what stops two presses taking
 * the last unit. But a run cannot be in flight longer than its call's deadline plus the outcome
 * write, and deck tuning's reaper fails any pending run after five minutes. A reservation older
 * than this was stranded — its process died, or its deck was deleted and took the run with it —
 * and nothing is left to settle it. Counting it anyway would charge the player for a call they
 * never got an answer from, for the rest of the window. Ten minutes is twice the reaper's cutoff.
 */
export const RESERVATION_TTL_MS = 10 * 60 * 1000;

export type LedgerRow = { status: "reserved" | "spent" | "refunded"; createdAt: Date };

/** Whether one ledger row counts against the allowance at `now`. */
export function counts(row: LedgerRow, now: Date): boolean {
  const age = now.getTime() - row.createdAt.getTime();
  if (age >= ALLOWANCE_WINDOW_MS) return false;
  if (row.status === "spent") return true;
  if (row.status === "reserved") return age < RESERVATION_TTL_MS;
  return false;
}

/**
 * Why a call was refunded, as `model_calls.refund_reason` stores it: `failed` (the call itself failed),
 * `nothing_valid` (it answered, and nothing in the answer survived validation), `late_success` (a success
 * came back after its reservation had gone stale and is not charged, `settleModelCall`) or `reaped` (the
 * reaper took it as abandoned). Only the paths that know their cause name one: Help me choose names
 * `failed` and `nothing_valid`, every reaper `reaped`, and `settleModelCall` itself `late_success` for every
 * feature. Tuning, fits and synopsis refund for mixed causes (a thin answer, a partly valid one) that
 * these labels would misstate, so theirs stay null.
 */
export type RefundReason = "failed" | "nothing_valid" | "late_success" | "reaped";

export type ModelFeature = "tuning" | "synopsis" | "intake" | "proposed_cuts" | "fits_read";

export type Allowance = {
  used: number;
  limit: number;
  /** When the oldest counted unit leaves the window. Null while units remain. */
  reopensAt: Date | null;
  /** When the NEXT counted unit leaves the window, spent or not: the credit line's "reset at"
   *  while credits remain as well as once they are gone. Null when nothing counts. */
  nextAt: Date | null;
  /** Present while the app-wide spend cap refuses every call: until the 1st of next UTC month.
   *  OPTIONAL, so an Allowance written without it (every fixture) still type-checks. */
  paused?: { until: Date };
  /** True for the owner once their month's testing share cannot fit one more call. */
  ownerShare?: boolean;
  /** Paid credits left (`credit-rule.ts`), spent only once `used` reaches `limit`: plan credits
   *  first, then pack credits. OPTIONAL like `paused`, and absent while the player holds no lot. */
  plan?: number;
  pack?: number;
};

/**
 * THE ONE PLACE "out of credits" IS DECIDED (payments plan, PR L2). Every reader that decides whether a
 * press may start, server gate or panel, asks one of these two, and `credit-gates.test.ts` fails on a
 * comparison of `used` against `limit` anywhere else.
 *
 * `freeRoom`: the free allowance can fund one more run. `hasCredit`: something can, the free allowance
 * or a paid lot (`plan` and `pack`, spent once the free allowance is gone; `credit-rule.ts`). Neither
 * says anything about the spend cap: `paused` and `ownerShare` refuse a press whatever the credits,
 * and every caller checks them first.
 */
export function freeRoom(a: { used: number; limit: number }): boolean {
  return a.used < a.limit;
}

/** Free credits left, never below zero: the count a credit line shows. Never a gate: ask `hasCredit`. */
export function freeCount(a: { used: number; limit: number }): number {
  return Math.max(0, a.limit - a.used);
}

export function hasCredit(a: { used: number; limit: number; plan?: number | null; pack?: number | null }): boolean {
  return freeRoom(a) || (a.plan ?? 0) + (a.pack ?? 0) > 0;
}

/** When a counted row stops counting: a spent unit at the window's edge, a reservation at its TTL. */
function expiresAt(row: LedgerRow): number {
  const ttl = row.status === "reserved" ? RESERVATION_TTL_MS : ALLOWANCE_WINDOW_MS;
  return row.createdAt.getTime() + ttl;
}

/**
 * The allowance at `now`, from the player's ledger rows. Rows that do not count — refunded,
 * outside the window, a reservation past its TTL — are dropped here, so a caller that
 * over-reads cannot over-count.
 */
export function allowanceFrom(
  rows: readonly LedgerRow[],
  now: Date,
  limit: number = MODEL_FRIEND_DAILY_ALLOWANCE,
): Allowance {
  const expiries = rows
    .filter((r) => counts(r, now))
    .map(expiresAt)
    .sort((a, b) => a - b);
  const used = expiries.length;
  const nextAt = used > 0 ? new Date(expiries[0]) : null;
  if (used < limit) return { used, limit, reopensAt: null, nextAt };
  // A limit of 0 with nothing counted: the allowance is shut, and no unit is waiting to expire,
  // so there is no honest time to name. (Indexing below would read past the end.)
  if (used === 0) return { used, limit, reopensAt: null, nextAt };
  // Spent: a unit is free once enough rows stop counting that one fewer than `limit` remain —
  // the (used - limit)th earliest EXPIRY, which is the earliest when the count sits at the
  // limit. By expiry, not by age: a reservation frees its unit ten minutes in, not a day in.
  return { used, limit, reopensAt: new Date(expiries[used - limit]), nextAt };
}
