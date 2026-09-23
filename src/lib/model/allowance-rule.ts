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
 * Model runs per player per rolling 24 hours, across every feature.
 *
 * A PLACEHOLDER until a call's cost is measured. The rule that sets it is fixed in the deck
 * tuning plan's Cost section: floor(B / (2 × c)), where `c` is one attempt's measured cost and
 * `B` is the per-player daily spend Hugh names — the 2 covers a run that needed its retry.
 */
export const MODEL_DAILY_ALLOWANCE = 5;

export const ALLOWANCE_WINDOW_MS = 24 * 60 * 60 * 1000;

export type ModelFeature = "tuning" | "synopsis";

export type Allowance = {
  used: number;
  limit: number;
  /** When the oldest counted unit leaves the window. Null while units remain. */
  reopensAt: Date | null;
};

/**
 * `callTimes` are the created_at of the rows that COUNT — reserved and spent, never refunded.
 * Rows outside the window are ignored here too, so a caller that over-reads cannot over-count.
 */
export function allowanceFrom(
  callTimes: readonly Date[],
  now: Date,
  limit: number = MODEL_DAILY_ALLOWANCE,
): Allowance {
  const since = now.getTime() - ALLOWANCE_WINDOW_MS;
  const inWindow = callTimes
    .map((t) => t.getTime())
    .filter((t) => t > since)
    .sort((a, b) => a - b);
  const used = inWindow.length;
  if (used < limit) return { used, limit, reopensAt: null };
  // Spent: the next unit returns when enough of the oldest leave for one to be free — the
  // (used - limit)th oldest, which is the oldest when the count sits exactly at the limit.
  return { used, limit, reopensAt: new Date(inWindow[used - limit] + ALLOWANCE_WINDOW_MS) };
}
