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
 * first, then the oldest; among packs, the oldest. The welcome lot (D1, 2026-10-18) goes before
 * both: it expires soonest and cannot be bought, so spending it first loses the player nothing. A gift lot
 * (a support credit an admin grants, admin plan A-R5) never expires, so it goes after plan lots, which can,
 * and before packs, which were bought and can be refunded.
 *
 * `src/lib/model/allowance.ts` is the ledger this reads.
 */
import { RESERVATION_TTL_MS, type LedgerRow } from "./allowance-rule";

export type CreditSource = "plan" | "pack" | "welcome" | "gift";

/**
 * The sources a player BUYS. "Paid" means one of these everywhere (purchase history, "has bought", the deletion
 * warning), never "not welcome": a welcome lot and an admin's gift are held and spent, but neither was bought.
 */
export const PAID_SOURCES = ["plan", "pack"] as const satisfies readonly CreditSource[];
export const isPaidSource = (source: string): boolean => (PAID_SOURCES as readonly string[]).includes(source);

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

const SOURCE_RANK: Record<CreditSource, number> = { welcome: 0, plan: 1, gift: 2, pack: 3 };

function spendOrder(a: CreditGrant, b: CreditGrant): number {
  if (a.source !== b.source) return SOURCE_RANK[a.source] - SOURCE_RANK[b.source];
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

/** Credits left per source, for the `Allowance`'s `welcome`, `plan`, `gift` and `pack`. */
export function creditTotals(balances: readonly GrantBalance[]): Record<CreditSource, number> {
  const totals = { welcome: 0, plan: 0, gift: 0, pack: 0 };
  for (const b of balances) totals[b.grant.source] += b.remaining;
  return totals;
}

/** The plan credits that lapse ON `at` (the earliest expiry): the figure L7 warns with, never the whole plan balance. */
export function planCreditsExpiringAt(balances: readonly GrantBalance[], at: Date | null): number {
  if (!at) return 0;
  let n = 0;
  for (const b of balances) {
    if (b.grant.source === "plan" && b.remaining > 0 && b.grant.expiresAt?.getTime() === at.getTime()) n += b.remaining;
  }
  return n;
}

/**
 * The plan credits still held, grouped by the instant they lapse (`at` null: no expiry, a plan whose lots roll over),
 * earliest first, groups with nothing left left out. A plan card dates ITS subscription by that subscription's own
 * period end and counts only the groups landing on it, so an older subscription's lots lapsing sooner are not its credits.
 */
export function planCreditsByExpiry(balances: readonly GrantBalance[]): { at: Date | null; n: number }[] {
  const groups = new Map<number | null, { at: Date | null; n: number }>();
  for (const b of balances) {
    if (b.grant.source !== "plan" || b.remaining <= 0) continue;
    const at = b.grant.expiresAt ?? null;
    const key = at ? at.getTime() : null;
    const g = groups.get(key);
    if (g) g.n += b.remaining;
    else groups.set(key, { at, n: b.remaining });
  }
  return [...groups.values()].sort((x, y) => (x.at?.getTime() ?? Infinity) - (y.at?.getTime() ?? Infinity));
}

/**
 * The earliest `expires_at` among the plan lots that still hold a credit, or null when none expires (a held plan's
 * lots roll over). It is the `Allowance`'s `planExpiresAt`: when the plan credits the player holds begin to lapse.
 */
export function earliestPlanExpiry(balances: readonly GrantBalance[]): Date | null {
  let earliest: Date | null = null;
  for (const b of balances) {
    const at = b.grant.expiresAt;
    if (b.grant.source !== "plan" || b.remaining <= 0 || !at) continue;
    if (!earliest || at.getTime() < earliest.getTime()) earliest = at;
  }
  return earliest;
}
