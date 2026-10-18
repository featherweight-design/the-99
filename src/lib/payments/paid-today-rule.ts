import { paidRoom } from "../model/allowance-rule";

/**
 * The /credits page's daily paid line and meter (P5, P5b). Pure. Drawn only from 15 paid runs in the rolling day (the
 * handoff's "from 15 of 20", engineering's suggestion kept) so a reader far from the limit is never told about it;
 * at the limit the meter turns `--warning` (never `--danger`) and the line says nothing banked is lost. Whether the
 * limit is reached is `paidRoom`'s alone (`allowance-rule.ts`): this file never compares the pair.
 */
export const PAID_TODAY_SHOWN_FROM = 15;

export type PaidToday = {
  used: number;
  limit: number;
  atLimit: boolean;
  /** The meter's fill, 0 to 100. */
  percent: number;
  /** When the paid limit has room again, ms since epoch, or null. */
  backAtMs: number | null;
};

export function paidToday(a: { paidUsedToday?: number | null; paidLimit?: number | null; paidBackAt?: Date | null }): PaidToday | null {
  const used = a.paidUsedToday;
  const limit = a.paidLimit;
  if (used == null || limit == null || limit <= 0) return null;
  const atLimit = !paidRoom({ paidUsed: used, paidLimit: limit });
  if (!atLimit && used < PAID_TODAY_SHOWN_FROM) return null;
  return { used, limit, atLimit, percent: Math.min(100, Math.round((used / limit) * 100)), backAtMs: a.paidBackAt ? a.paidBackAt.getTime() : null };
}
