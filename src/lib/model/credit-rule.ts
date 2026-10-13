/**
 * PAID CREDITS, as arithmetic (payments plan, PR L, 2026-10-13). Pure and client-safe, beside
 * `allowance-rule.ts`, whose free allowance is always spent first.
 *
 * A lot (`credit_grants`) is spent by the ledger rows that name it. A row counts against its lot by
 * the allowance's own rule with the 24-hour window taken away, because paid credits never roll off:
 * `spent` counts, a `reserved` row counts while it is still a run in flight, and a `refunded` row
 * never does. So a failed run, or a reservation stranded past its TTL, gives its credit back to the
 * lot that funded it, and there is no second refund path.
 *
 * Spend order across lots (Hugh, 2026-10-13): plan credits before pack credits, because plan credits
 * can expire after a cancel and pack credits never do. Among plan lots the soonest to expire goes
 * first, then the oldest; among packs, the oldest.
 *
 * `src/lib/model/allowance.ts` is the ledger this reads.
 */
import { RESERVATION_TTL_MS, type LedgerRow } from "./allowance-rule";

export type CreditSource = "plan" | "pack";

export type CreditGrant = {
  id: string;
  source: CreditSource;
  units: number;
  revokedUnits: number;
  /** Null while it cannot expire: always for a pack, and for a plan lot while subscribed. */
  expiresAt: Date | null;
  createdAt: Date;
};

/** Whether one ledger row still holds a credit of the lot that funded it at `now`. */
export function countsAgainstGrant(row: LedgerRow, now: Date): boolean {
  if (row.status === "spent") return true;
  if (row.status === "reserved") return now.getTime() - row.createdAt.getTime() < RESERVATION_TTL_MS;
  return false;
}

/** Whether a lot can still be spent at `now`: an expired plan lot cannot, whatever it holds. */
export function isLive(grant: CreditGrant, now: Date): boolean {
  return grant.expiresAt === null || now.getTime() < grant.expiresAt.getTime();
}

/**
 * What a lot's ledger rows hold, as the ledger reads it: every `spent` row is counted, so it arrives
 * as a count (a lot's spend grows without bound); the `reserved` rows arrive whole, because whether
 * each still counts is `countsAgainstGrant`'s to decide at `now`. Refunded rows never count and are
 * not read.
 */
export type GrantUsage = { spent: number; reserved: readonly Date[] };

/** Credits a lot has left at `now`. Never below zero, and zero once an expired lot's time is up. */
export function remaining(grant: CreditGrant, usage: GrantUsage, now: Date): number {
  if (!isLive(grant, now)) return 0;
  const inFlight = usage.reserved.filter((createdAt) => countsAgainstGrant({ status: "reserved", createdAt }, now)).length;
  return Math.max(0, grant.units - grant.revokedUnits - usage.spent - inFlight);
}

export type GrantBalance = { grant: CreditGrant; remaining: number };

function spendOrder(a: CreditGrant, b: CreditGrant): number {
  if (a.source !== b.source) return a.source === "plan" ? -1 : 1;
  const ae = a.expiresAt?.getTime() ?? Infinity;
  const be = b.expiresAt?.getTime() ?? Infinity;
  if (ae !== be) return ae - be;
  const ac = a.createdAt.getTime();
  const bc = b.createdAt.getTime();
  return ac !== bc ? ac - bc : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** The lot the next paid run is funded from, or null when no lot has a credit left. */
export function pickGrant(balances: readonly GrantBalance[]): CreditGrant | null {
  const open = balances.filter((b) => b.remaining > 0).map((b) => b.grant).sort(spendOrder);
  return open[0] ?? null;
}

/** Credits left per source, for the `Allowance`'s `plan` and `pack`. */
export function creditTotals(balances: readonly GrantBalance[]): { plan: number; pack: number } {
  let plan = 0;
  let pack = 0;
  for (const b of balances) {
    if (b.grant.source === "plan") plan += b.remaining;
    else pack += b.remaining;
  }
  return { plan, pack };
}
