import { RESERVATION_TTL_MS, type ModelFeature } from "./allowance-rule";
import { featureWorstCaseMicroUsd } from "./prices";

/**
 * The app-wide MODEL SPEND CAP, as arithmetic. Pure and client-safe; `allowance.ts` runs the SQL
 * and calls these.
 *
 * Spend is counted per UTC CALENDAR MONTH, because that is how the bill arrives.
 *
 * CREDITS COUNT SUCCESSES; DOLLARS COUNT EVERYTHING BILLED (orchestrator ruling, 2026-09-24). The
 * per-player allowance (`allowance-rule.ts`) still ignores refunded calls. Month-to-date SPEND does
 * not: it is
 *  - the recorded `cost_micro_usd` of EVERY call created this month, `spent` and `refunded` alike,
 *    because a refunded call's tokens were billed all the same; plus
 *  - the WORST CASE of every call this month with NO recorded cost that is still inside
 *    `RESERVATION_TTL_MS`, `reserved` or `refunded`. A reservation in flight has not been billed
 *    yet, and a STOPPED call is refunded at once while its upstream request keeps billing until its
 *    outcome lands — so until its meters arrive it counts at its worst case. Counting either at
 *    nothing is how a burst of presses would all pass a check none of them could afford together.
 *    Past the TTL nothing can still be running, and a row that never got meters (the call got no
 *    response, or was never made) stops counting.
 */

/** Past this, every model call in the app is refused until the 1st: a bug guard, not a budget. */
export const HARD_STOP_USD = 20;
/** The month's planned spend. The alarms are fractions of this. */
export const BUDGET_USD = 10;
/** Percentages of `BUDGET_USD` at which a settle that crosses them says so in the logs. */
export const ALARM_PCTS = [50, 80] as const;
/** The owner's own month-to-date ceiling, so their testing cannot eat the friends' budget. */
export const OWNER_SHARE_USD = 5;

/**
 * The owner's monthly share in dollars, from `MODEL_OWNER_MONTHLY_USD` when it is set to a
 * positive decimal number (`25`, `7.5`). Anything else (unset, blank, zero, negative, exponent
 * forms, or not a number) falls back to `OWNER_SHARE_USD`. It exists for staging testing (Hugh,
 * 2026-10-12); production stays unset, at five. `HARD_STOP_USD` still applies to every call, so a
 * share above it can never let the app spend past the stop.
 */
export function ownerShareUsdFrom(raw: string | undefined): number {
  const v = raw?.trim() ?? "";
  if (!/^\d+(\.\d+)?$/.test(v)) return OWNER_SHARE_USD;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : OWNER_SHARE_USD;
}

export const MICRO = 1_000_000;
export const usdToMicro = (usd: number): number => Math.round(usd * MICRO);
export const microToUsd = (micro: number): number => micro / MICRO;

/** The first instant of `now`'s UTC calendar month. */
export function monthStartUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** The first instant of the NEXT UTC calendar month: when a pause lifts. */
export function nextMonthStartUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/** A ledger row with NO recorded cost: priced, if it counts at all, at its worst case. */
export type UnpricedCall = {
  status: "reserved" | "spent" | "refunded";
  feature: ModelFeature;
  model: string | null;
  createdAt: Date;
};

/**
 * Whether an unpriced call counts at its worst case at `now`: reserved or refunded, this month,
 * and still inside its TTL. A `spent` row with no cost predates the meters, and was never a call
 * still billing.
 */
export function countsAtWorstCase(row: UnpricedCall, now: Date): boolean {
  const t = row.createdAt.getTime();
  if (t < monthStartUtc(now).getTime() || now.getTime() - t >= RESERVATION_TTL_MS) return false;
  return row.status === "reserved" || row.status === "refunded";
}

/** The worst case of every unpriced call that still counts at `now`. */
export function unpricedWorstCaseMicro(rows: readonly UnpricedCall[], now: Date): number {
  let total = 0;
  for (const r of rows) if (countsAtWorstCase(r, now)) total += featureWorstCaseMicroUsd(r.feature, r.model);
  return total;
}

export type SpendRefusal = "paused" | "ownerShare";

/**
 * Whether a call whose worst case is `callMicro` may be reserved. `ownerMonthMicro` is the
 * owner's own month-to-date, or null for anyone else — a friend is never held to the share.
 * The hard stop wins: it is about the whole app, and says nothing about who pressed.
 */
export function spendRefusal(args: {
  appMonthMicro: number;
  ownerMonthMicro: number | null;
  callMicro: number;
  /** The owner's share in micro-dollars; `OWNER_SHARE_USD` when omitted. */
  ownerShareMicro?: number;
}): SpendRefusal | null {
  if (args.appMonthMicro + args.callMicro > usdToMicro(HARD_STOP_USD)) return "paused";
  const share = args.ownerShareMicro ?? usdToMicro(OWNER_SHARE_USD);
  if (args.ownerMonthMicro !== null && args.ownerMonthMicro + args.callMicro > share) {
    return "ownerShare";
  }
  return null;
}

/**
 * The alarm percentages a settle crossed: below before, at or above after. Each is crossed at
 * most once a month, by the settle that carried spend over it.
 */
export function crossedAlarms(beforeMicro: number, afterMicro: number): number[] {
  return ALARM_PCTS.filter((pct) => {
    const line = usdToMicro((BUDGET_USD * pct) / 100);
    return beforeMicro < line && afterMicro >= line;
  });
}
