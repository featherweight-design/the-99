import { countsAgainstGrant } from "../model/credit-rule";
import { unitsOf, type LedgerRow } from "../model/allowance-rule";

/**
 * What a refund or a dispute takes back from a paid lot (payments scope §5.5, K2). Pure.
 *
 * - The target is read from the charge's CUMULATIVE `amount_refunded`, an absolute figure, never from an
 *   event's own delta: a replayed event, or partial refunds delivered out of order, converge on the same
 *   number and nothing is counted twice. It is rounded UP and capped at the lot, so a tiny pack never
 *   under-revokes by a rounding.
 * - What a lot can give back is what is not already spent or in flight on it (`countsAgainstGrant`, the
 *   ledger's one counting rule). The part already spent is NOT clawed back; the shortfall is kept in
 *   `unrecovered_units` for the admin view.
 * - `revoked_units` only ever rises here, apart from a won dispute giving back exactly what that dispute took.
 */
export function refundTarget(units: number, amount: number, amountRefunded: number): number {
  if (!(amount > 0) || !(amountRefunded > 0)) return 0;
  const refunded = Math.min(amountRefunded, amount);
  return Math.min(units, Math.ceil((units * refunded) / amount));
}

/** The monotonic refund claim: the largest `amount_refunded` any event has reported. Never lowered by an older snapshot. */
export function claimCents(stored: number, fetched: number): number {
  return Math.max(0, stored, fetched);
}

/** Credits of one lot its ledger rows still hold at `now`: each counting row's `units`, never a row count. */
export function heldOnGrant(rows: readonly LedgerRow[], now: Date): number {
  return rows.filter((r) => countsAgainstGrant(r, now)).reduce((n, r) => n + unitsOf(r), 0);
}

export type RevokeInput = { units: number; revoked: number; held: number; target: number };
export type RevokeResult = { revoked: number; unrecovered: number };

/** The lot's new `revoked_units` and `unrecovered_units` for a wanted revocation of `target`. */
export function applyRevocation({ units, revoked, held, target }: RevokeInput): RevokeResult {
  const want = Math.min(Math.max(0, target), units);
  const room = Math.max(0, units - held);
  const next = Math.min(units, Math.max(revoked, Math.min(want, room)));
  return { revoked: next, unrecovered: Math.max(0, want - next) };
}

export type DisputeStatus = "open" | "won" | "lost";

/** Stripe's dispute status, as the three states kept. A closed inquiry (`warning_closed`) is a win. */
export function disputeStatusOf(stripeStatus: string): DisputeStatus {
  if (stripeStatus === "won" || stripeStatus === "warning_closed") return "won";
  if (stripeStatus === "lost") return "lost";
  return "open";
}

export type DisputePlan =
  | { kind: "none" }
  | { kind: "open"; status: DisputeStatus }
  | { kind: "restore"; units: number }
  | { kind: "lose" };

/**
 * What a dispute's CURRENT state (as retrieved) does given the row kept for it (null when none). The event
 * type is only a trigger: a `closed` delivered before its `created` still opens the row in its final state,
 * and a `created` delivered after a `closed` never revokes a dispute already won.
 * A dispute already `won` or `lost` is final.
 */
export function planDispute(row: { status: DisputeStatus; unitsRevoked: number } | null, current: DisputeStatus): DisputePlan {
  if (row === null) return { kind: "open", status: current };
  if (row.status !== "open") return { kind: "none" };
  if (current === "won") return { kind: "restore", units: row.unitsRevoked };
  if (current === "lost") return { kind: "lose" };
  return { kind: "none" };
}
