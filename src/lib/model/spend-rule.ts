import { RESERVATION_TTL_MS, type ModelFeature } from "./allowance-rule";
import { featureWorstCaseMicroUsd } from "./prices";

/**
 * MONTH-TO-DATE MODEL SPEND, as arithmetic, and the one cap still read from it: the owner's own
 * testing share. Pure and client-safe; `allowance.ts` runs the SQL and calls these.
 *
 * There is NO app-wide limit here (Hugh, 2026-10-17). The $20 hard stop, the $10 plan and its
 * 50/80% alarms were removed: the Anthropic workspace limits ($150 for The 99, $250 for the
 * organisation) carry the app-wide bound now. Per-account allowances (`allowance-rule.ts`) and
 * per-run reservations stay.
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

/** The owner's own month-to-date ceiling, so their testing cannot eat the friends' budget. */
export const OWNER_SHARE_USD = 5;

/**
 * The owner's monthly share in dollars, from `MODEL_OWNER_MONTHLY_USD` when it is set to a
 * positive decimal number (`25`, `7.5`) that is at least one micro-dollar. Anything else (unset,
 * blank, zero, negative, exponent forms, a value that rounds to zero, or not a number) falls back to `OWNER_SHARE_USD`. It exists for staging testing (Hugh,
 * 2026-10-12); production stays unset, at five.
 */
export function ownerShareUsdFrom(raw: string | undefined): number {
  const v = raw?.trim() ?? "";
  if (!/^\d+(\.\d+)?$/.test(v)) return OWNER_SHARE_USD;
  const n = Number(v);
  // Positive in MICRO-dollars, not just in dollars: a share that rounds to zero would refuse every
  // owner call rather than fall back.
  return Number.isFinite(n) && usdToMicro(n) > 0 ? n : OWNER_SHARE_USD;
}

export const MICRO = 1_000_000;
export const usdToMicro = (usd: number): number => Math.round(usd * MICRO);
export const microToUsd = (micro: number): number => micro / MICRO;

/** The first instant of `now`'s UTC calendar month. */
export function monthStartUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
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

export type SpendRefusal = "ownerShare";

/**
 * Whether a call whose worst case is `callMicro` may be reserved. `ownerMonthMicro` is the
 * owner's own month-to-date, or null for anyone else — a friend is never held to the share.
 */
export function spendRefusal(args: {
  ownerMonthMicro: number | null;
  callMicro: number;
  /** The owner's share in micro-dollars; `OWNER_SHARE_USD` when omitted. */
  ownerShareMicro?: number;
}): SpendRefusal | null {
  const share = args.ownerShareMicro ?? usdToMicro(OWNER_SHARE_USD);
  if (args.ownerMonthMicro !== null && args.ownerMonthMicro + args.callMicro > share) {
    return "ownerShare";
  }
  return null;
}
