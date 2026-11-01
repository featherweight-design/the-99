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
 * Owner 10, everyone else on the default (`MODEL_DEFAULT_DAILY_ALLOWANCE`, 1 since 2026-10-30; friends 5 through their group) (3 until 2026-10-09, when Hugh raised it): Hugh, via the orchestrator, 2026-09-24. It replaced a flat five (2026-09-23)
 * when an app-wide spend cap arrived (removed 2026-10-17; the Anthropic workspace limits bound the
 * month's dollars now), so the per-player number only has to share the budget fairly, and the owner — who tests every
 * change — gets more presses than anyone on the default. Which account is the owner is `MODEL_OWNER_USER_ID`,
 * read once in `allowance.ts` (`dailyLimitFor`). Since 2026-10-13 a group's allowance and the
 * app-wide default (`MODEL_DAILY_ALLOWANCE`) come first; `dailyLimit` below holds the order.
 */
export const MODEL_OWNER_DAILY_ALLOWANCE = 10;
/**
 * The public default: a player in no group that sets an allowance, with `MODEL_DAILY_ALLOWANCE` unset. One run a day
 * (Hugh, 2026-10-30; it was five, named for friends). Friends get theirs through their group's allowance, never this.
 */
export const MODEL_DEFAULT_DAILY_ALLOWANCE = 1;

/**
 * The owner's daily limit, from `MODEL_OWNER_DAILY_ALLOWANCE` when it is set to a positive whole
 * number. Anything else (unset, blank, zero, negative, fractional, or not a number) falls back to
 * `MODEL_OWNER_DAILY_ALLOWANCE`. It exists so staging can give the owner room to test (Hugh,
 * 2026-10-12) while production stays unset, at ten. It applies to the owner alone; everyone else's
 * limit moves through a group's allowance or `MODEL_DAILY_ALLOWANCE` (`dailyLimit`).
 */
export function ownerDailyAllowanceFrom(raw: string | undefined): number {
  return positiveWholeOr(raw, MODEL_OWNER_DAILY_ALLOWANCE);
}

function positiveWholeOr(raw: string | undefined, fallback: number): number {
  const v = raw?.trim() ?? "";
  if (!/^\d+$/.test(v)) return fallback;
  const n = Number(v);
  return Number.isSafeInteger(n) && n > 0 ? n : fallback;
}

/**
 * The app-wide default for a player in no group that sets an allowance: `MODEL_DAILY_ALLOWANCE` when it
 * is a positive whole number, otherwise `MODEL_DEFAULT_DAILY_ALLOWANCE`.
 */
export function defaultDailyAllowanceFrom(raw: string | undefined): number {
  return positiveWholeOr(raw, MODEL_DEFAULT_DAILY_ALLOWANCE);
}

/**
 * One player's rolling-24-hour limit (payments scope, Hugh's answer to Q16, 2026-10-13), first rung
 * that applies:
 * 1. Their group's `daily_allowance`. An account is in at most one group; should a player ever read
 *    more than one, the highest wins.
 * 2. The owner's own limit (`MODEL_OWNER_DAILY_ALLOWANCE`), while the owner is in no group that sets
 *    one, so the default can drop without dropping the owner.
 * 3. The app-wide default (`defaultDailyAllowanceFrom`).
 * With no group allowance set anywhere and `MODEL_DAILY_ALLOWANCE` unset, a non-owner gets
 * `MODEL_DEFAULT_DAILY_ALLOWANCE` (one since 2026-10-30; five before). Pure.
 */
export function dailyLimit(input: { groupAllowances: readonly number[]; owner: boolean; ownerRaw: string | undefined; defaultRaw: string | undefined }): number {
  // The column is checked 1 to 1000; anything else read here is not an allowance.
  const allowances = input.groupAllowances.filter((n) => Number.isSafeInteger(n) && n > 0);
  if (allowances.length > 0) return Math.max(...allowances);
  return input.owner ? ownerDailyAllowanceFrom(input.ownerRaw) : defaultDailyAllowanceFrom(input.defaultRaw);
}

/**
 * Paid runs per player per rolling 24 hours (Hugh, payments scope board 2026-10-13; plan ruling E2).
 * It bounds what a bought credit can spend in a day, whatever the lot holds, and counts exactly as the
 * free allowance does: the same window, a `reserved` row until its TTL, a `spent` row, never a refund.
 * A group can set its own (`paidLimit`); `paidRoom` takes the limit it is handed.
 */
export const PAID_DAILY_LIMIT = 20;

/**
 * The player's paid limit: their group's, else `PAID_DAILY_LIMIT`. A player is in at most one group
 * (`flag_group_members.user_id` is its key); taking the largest only mirrors `dailyLimit`'s group step. Pure.
 */
export function paidLimit(input: { groupLimits: readonly number[] }): number {
  // The column is checked 1 to 1000; anything else read here is not a limit.
  const limits = input.groupLimits.filter((n) => Number.isSafeInteger(n) && n > 0);
  return limits.length > 0 ? Math.max(...limits) : PAID_DAILY_LIMIT;
}

export const ALLOWANCE_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * How long a `reserved` unit counts before it is taken to be stranded.
 *
 * A reservation counts because it is a run in flight — that is what stops two presses taking
 * the last unit. But a run cannot be in flight longer than the request that reserved it: the deck
 * page's `maxDuration` (600s since Suggested changes v2) bounds the Server Action and its `after()`
 * work, and the unit is reserved inside that request. A reservation older than this was stranded —
 * its process died, or its deck was deleted and took the run with it — and nothing is left to
 * settle it. Counting it anyway would charge the player for a call they never got an answer from,
 * for the rest of the window. Ten minutes is that limit (`limits.test.ts` pins limit <= this); the
 * v2 reaper's 11-minute cutoff is past it, so a dead v2 run's unit stops counting before the
 * reaper refunds it, which charges nothing.
 */
export const RESERVATION_TTL_MS = 10 * 60 * 1000;

/**
 * One `model_calls` row as the counters read it. `units` is what the run costs (`model_calls.units`, 1 or 2; a
 * Suggested changes v2 run over 10 swaps costs 2, `unitsFor`). Absent reads as 1, so a fixture written before units
 * still counts as it did; every database reader selects the column.
 */
export type LedgerRow = { status: "reserved" | "spent" | "refunded"; createdAt: Date; units?: number };

/** The credits one ledger row holds: its `units`, 1 when absent. Every counter sums this, never counts rows. */
export function unitsOf(row: Pick<LedgerRow, "units">): number {
  return row.units ?? 1;
}

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

/** `suggested_changes_v2` is Suggested changes' v2 run (plan 2026-10-27, P1): priced apart, so v10's `tuning` figures, its
 *  `retryable` and `callMicroFor("tuning")` stay as they are until v10 is removed. */
export type ModelFeature = "tuning" | "synopsis" | "intake" | "proposed_cuts" | "fits_read" | "suggested_changes_v2";

export type Allowance = {
  used: number;
  limit: number;
  /** When the oldest counted unit leaves the window. Null while units remain. */
  reopensAt: Date | null;
  /** When the NEXT counted unit leaves the window, spent or not: the credit line's "reset at"
   *  while credits remain as well as once they are gone. Null when nothing counts. */
  nextAt: Date | null;
  /** True for the owner once their month's testing share cannot fit one more call. OPTIONAL, so
   *  an Allowance written without it (every fixture) still type-checks. */
  ownerShare?: boolean;
  /** True while the app-wide model-call switch is off (`MODEL_CALLS_ENABLED`): no press may start, whatever
   *  the credits. A panel treats it as it treats `ownerShare`, with `creditsCopy.paused`. OPTIONAL likewise. */
  paused?: boolean;
  /** Credits left in lots (`credit-rule.ts`), spent only once `used` reaches `limit`, in `SOURCE_RANK`'s order:
   *  the welcome lot first, then plan, then gift, then pack credits. OPTIONAL like `ownerShare`, and absent while
   *  the player holds no lot. */
  welcome?: number;
  plan?: number;
  /** An admin's support grant (admin plan A-R5): held and spent like a lot, never bought. */
  gift?: number;
  pack?: number;
  /** Paid runs counted in the window (`PAID_DAILY_LIMIT`'s counter), present with `plan`/`pack`. */
  paidUsedToday?: number;
  paidLimit?: number;
  /** When the paid limit has room again: the oldest counted paid run leaving the window. Null while it has room. */
  paidBackAt?: Date | null;
  /** When the NEXT counted paid run leaves the window (the paid counter's `nextAt`): the near-limit line's "resets at", where `paidBackAt` is still null. */
  paidNextAt?: Date | null;
  /** When a cancelled plan's remaining credits lapse. Unset until the Subscription PR fills it. */
  planExpiresAt?: Date | null;
  /** When the welcome lot stops funding runs, while it holds a credit (`welcomeLotExpiry`); null or absent otherwise. */
  welcomeExpiresAt?: Date | null;
  /** The plan credits that lapse on `planExpiresAt`: a later subscription's lots do not count. */
  planExpiring?: number;
  /** The plan credits still held, grouped by the instant they lapse (`null`: they roll over). Read server-side by the plan card; not part of `Standing`. */
  planByExpiry?: { at: Date | null; n: number }[];
  /** `PAYMENTS_ENABLED` for this reader, stamped by the read that knows the request's switches. Absent reads as off:
   *  the credit line then draws its shipped forms and never offers `Get more credits` (L8). */
  payments?: boolean;
};

/**
 * THE ONE PLACE "out of credits" IS DECIDED (payments plan, PR L2). Every reader that decides whether a
 * press may start, server gate or panel, asks one of these two, and `credit-gates.test.ts` fails on a
 * comparison of `used` against `limit` anywhere else.
 *
 * `freeRoom`: the free allowance can fund one more run. `hasCredit`: something can, the free allowance
 * or a paid lot (`plan` and `pack`, spent once the free allowance is gone; `credit-rule.ts`). Neither
 * says anything about the owner's share: `ownerShare` refuses a press whatever the credits, and every
 * caller checks it first.
 */
export function freeRoom(a: { used: number; limit: number }, units = 1): boolean {
  // A run costing `units` credits must fit in the free allowance whole: it is never split with a lot.
  return a.used + units <= a.limit;
}

/** Free credits left, never below zero: the count a credit line shows. Never a gate: ask `hasCredit`. */
export function freeCount(a: { used: number; limit: number }): number {
  return Math.max(0, a.limit - a.used);
}

/** Credits held in lots, of any source. */
export type HeldLots = { welcome?: number | null; plan?: number | null; gift?: number | null; pack?: number | null };

/** Credits held in lots (welcome, plan, gift, pack): the one definition of "holds a lot", so no caller sums the sources itself. */
export function heldCredits(a: HeldLots): number {
  return (a.welcome ?? 0) + (a.plan ?? 0) + (a.gift ?? 0) + (a.pack ?? 0);
}

/**
 * THE PAID LIMIT, decided here alone: a paid run may start while fewer than `paidLimit` paid runs count.
 * It gates paid runs only, and `hasCredit` applies it after the free allowance, so it can never refuse a
 * run the free allowance can fund. `credit-gates.test.ts` fails on any other comparison of the two.
 */
export function paidRoom(a: { paidUsed: number; paidLimit: number }, units = 1): boolean {
  // The paid limit counts credits: a 2-credit paid run needs room for both.
  return a.paidUsed + units <= a.paidLimit;
}

/**
 * The paid limit is shut for a player who holds paid credits: they have lots, today's paid runs have reached
 * `paidLimit`. The credit line asks this to say "the limit" (L5, L6) instead of "out of credits", so the
 * comparison stays here with `paidRoom`. A player with no lot, or an Allowance without the counter, is never at it.
 */
export function paidAtLimit(a: HeldLots & { paidUsedToday?: number | null; paidLimit?: number | null }): boolean {
  if (heldCredits(a) <= 0) return false;
  return a.paidUsedToday != null && a.paidLimit != null && !paidRoom({ paidUsed: a.paidUsedToday, paidLimit: a.paidLimit });
}

/** A one-credit run's gate. A run costing 2 (Suggested changes v2 over 10 swaps) is decided on the server by
 *  `reserveModelCall`, with `freeRoom` and `paidRoom` taking its units; the panel asks `runFunding` (Small items 7, SC-Cost). */
export function hasCredit(a: HeldLots & {
  used: number; limit: number;
  paidUsedToday?: number | null; paidLimit?: number | null;
}): boolean {
  if (freeRoom(a)) return true;
  if (heldCredits(a) <= 0) return false;
  // An Allowance without the paid counter (a fixture, a caller that did not read it) has no limit to apply.
  return a.paidUsedToday == null || a.paidLimit == null || paidRoom({ paidUsed: a.paidUsedToday, paidLimit: a.paidLimit });
}

/**
 * Where a run costing `units` credits would be funded, as the panel can tell from the allowance it holds (Small items 7,
 * the 2-credit cue). ONE SOURCE FUNDS THE WHOLE RUN, in `reserveModelCall`'s order: the free allowance when it holds all
 * of it; else the welcome lot; else a paid lot (plan, gift or pack, all shown as paid). Lots are counted by source here,
 * not by lot, so a source split across lots is approximated; the server's `costs: 2` refusal stays the backstop.
 *
 *   free     the free allowance holds the run; `freeAfter` is what it leaves
 *   welcome  the welcome lot holds the run
 *   paid     a paid source holds the run
 *   short    the run costs 2 and nothing can fund 2, though a 1-credit run would start (`freeHoldsOne`: it is the free
 *            allowance that holds the one, the line's "A free credit covers up to 10")
 *   spent    nothing can fund even 1 credit: `hasCredit` is false
 *
 * Says nothing about the owner's share, which every caller checks first. Pure.
 */
export type RunFunding =
  | { source: "free"; units: number; freeLeft: number; freeAfter: number }
  | { source: "welcome" | "paid"; units: number }
  | { source: "short"; units: number; freeHoldsOne: boolean }
  | { source: "spent"; units: number };

export function runFunding(
  a: HeldLots & { used: number; limit: number; paidUsedToday?: number | null; paidLimit?: number | null },
  units = 1,
): RunFunding {
  if (freeRoom(a, units)) {
    const freeLeft = freeCount(a);
    return { source: "free", units, freeLeft, freeAfter: Math.max(0, freeLeft - units) };
  }
  // The paid limit counts a lot-funded run whole, welcome included (`reserveModelCall`'s `paidOk(units)`).
  const paidOk = a.paidUsedToday == null || a.paidLimit == null || paidRoom({ paidUsed: a.paidUsedToday, paidLimit: a.paidLimit }, units);
  if (paidOk) {
    if ((a.welcome ?? 0) >= units) return { source: "welcome", units };
    if ([a.plan, a.gift, a.pack].some((n) => (n ?? 0) >= units)) return { source: "paid", units };
  }
  if (!hasCredit(a)) return { source: "spent", units };
  // A 1-credit run would start; this one cannot (only reachable with units > 1).
  return { source: "short", units, freeHoldsOne: freeRoom(a) };
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
  limit: number = MODEL_DEFAULT_DAILY_ALLOWANCE,
): Allowance {
  // One entry per CREDIT, not per row: a 2-unit run counts twice and frees both credits at its one expiry.
  const expiries = rows
    .filter((r) => counts(r, now))
    .flatMap((r) => Array.from({ length: unitsOf(r) }, () => expiresAt(r)))
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
