import { RESERVATION_TTL_MS, type ModelFeature } from "./allowance-rule";
import { featureWorstCaseMicroUsd } from "./prices";

/**
 * The app-wide MODEL SPEND CAP, as arithmetic. Pure and client-safe; `allowance.ts` runs the SQL
 * and calls these.
 *
 * Spend is counted per UTC CALENDAR MONTH, because that is how the bill arrives. Month-to-date is
 * the cost of every `spent` call created this month, plus the WORST CASE of every reservation
 * still in flight (inside `RESERVATION_TTL_MS`): a call in flight has not been billed yet, and
 * counting it at nothing is how a burst of presses would all pass a check none of them could
 * afford together. REFUNDED calls never count, even though their tokens were billed: the cap
 * guards the app's own bugs and a runaway, and a refund is neither.
 */

/** Past this, every model call in the app is refused until the 1st: a bug guard, not a budget. */
export const HARD_STOP_USD = 20;
/** The month's planned spend. The alarms are fractions of this. */
export const BUDGET_USD = 10;
/** Percentages of `BUDGET_USD` at which a settle that crosses them says so in the logs. */
export const ALARM_PCTS = [50, 80] as const;
/** The owner's own month-to-date ceiling, so their testing cannot eat the friends' budget. */
export const OWNER_SHARE_USD = 5;

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

export type LiveReservation = { feature: ModelFeature; model: string | null; createdAt: Date };

/**
 * The worst case of the reservations still in flight at `now`, this month. A reservation past its
 * TTL was stranded and is not counted; one from last month belongs to last month's spend.
 */
export function reservedWorstCaseMicro(rows: readonly LiveReservation[], now: Date): number {
  const start = monthStartUtc(now).getTime();
  let total = 0;
  for (const r of rows) {
    const t = r.createdAt.getTime();
    if (t < start || now.getTime() - t >= RESERVATION_TTL_MS) continue;
    total += featureWorstCaseMicroUsd(r.feature, r.model);
  }
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
}): SpendRefusal | null {
  if (args.appMonthMicro + args.callMicro > usdToMicro(HARD_STOP_USD)) return "paused";
  if (args.ownerMonthMicro !== null && args.ownerMonthMicro + args.callMicro > usdToMicro(OWNER_SHARE_USD)) {
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
