// The admin Payments tab's reads (admin plan A-R6): one UTC month's revenue from `payment_records`, the month's lots
// from `credit_grants` (purchases and gifts; a welcome lot is no admin's doing and is left out), and the gifts' own
// record from `admin_events`. Admin-only: the page that calls this has passed `requireAdmin()`. Reads nothing per
// player beyond ids, which the page masks (`namesFor`).

import { and, desc, eq, gte, inArray, isNotNull, lt, or, sql } from "drizzle-orm";
import { db } from "../../db";
import { adminEvents, creditGrants, paymentDisputes, paymentRecords, stripeCustomers } from "../../db/schema";
import { PAID_SOURCES } from "../model/credit-rule";
import { revenueOf, type Revenue, type RevenueRow } from "./admin-read-rule";

/** The most lots the tab lists for a month: a personal app's scale, with the count beside it when cut. */
export const GRANTS_SHOWN = 200;

export type AdminGrant = { id: string; userId: string; source: "plan" | "pack" | "gift"; units: number; revokedUnits: number; createdAt: Date };
export type AdminGift = { at: Date; actorId: string; userId: string; units: number; note: string };
export type AdminDispute = {
  disputeId: string;
  status: "open" | "won" | "lost";
  unitsRevoked: number;
  createdAt: Date;
  closedAt: Date | null;
  amountCents: number | null;
  currency: string | null;
  /** Null once the account is purged, or for a payment that granted no lot. */
  userId: string | null;
};
export type AdminBlock = { userId: string; at: Date };
export type PaymentsMonth = {
  revenue: Revenue[];
  grants: AdminGrant[];
  grantsTotal: number;
  gifts: AdminGift[];
  disputes: AdminDispute[];
  blocked: AdminBlock[];
};

/**
 * A payment's refund, never more than the payment: the charge's cumulative figure, kept on the payment record itself
 * (`reverseCharge`), so it survives the account's purge and covers a payment that granted no lot.
 */
const refunded = sql`least(${paymentRecords.refundedCents}, ${paymentRecords.amountCents})`;

/** Exported for its test. Grouped by currency, so two currencies are never added together. */
export function revenueQuery(start: Date, end: Date) {
  return db
    .select({
      currency: paymentRecords.currency,
      payments: sql<number>`count(*)::int`,
      grossCents: sql<number>`coalesce(sum(${paymentRecords.amountCents}), 0)::int`,
      taxCents: sql<number>`coalesce(sum(${paymentRecords.taxCents}), 0)::int`,
      unattributed: sql<number>`(count(*) filter (where ${paymentRecords.status} = 'unattributed'))::int`,
      refundedCents: sql<number>`coalesce(sum(${refunded}), 0)::int`,
      refundedTaxCents: sql<number>`coalesce(sum(case when ${paymentRecords.amountCents} > 0 then round(${refunded}::numeric * ${paymentRecords.taxCents} / ${paymentRecords.amountCents}) else 0 end), 0)::int`,
    })
    .from(paymentRecords)
    .where(and(gte(paymentRecords.createdAt, start), lt(paymentRecords.createdAt, end)))
    .groupBy(paymentRecords.currency);
}

/**
 * Exported for its test: every dispute still open, and every one opened or closed in the month, newest first. A
 * dispute has no account id (kept through the purge, as `payment_records` is); its account is reached through the
 * payment's lot, and is null once that account is purged.
 */
export function disputesQuery(start: Date, end: Date) {
  const inMonth = (c: typeof paymentDisputes.createdAt | typeof paymentDisputes.closedAt) => and(gte(c, start), lt(c, end));
  return db
    .select({
      disputeId: paymentDisputes.disputeId,
      status: paymentDisputes.status,
      unitsRevoked: paymentDisputes.unitsRevoked,
      createdAt: paymentDisputes.createdAt,
      closedAt: paymentDisputes.closedAt,
      amountCents: paymentRecords.amountCents,
      currency: paymentRecords.currency,
      userId: creditGrants.userId,
    })
    .from(paymentDisputes)
    .leftJoin(paymentRecords, eq(paymentRecords.paymentIntentId, paymentDisputes.paymentIntentId))
    .leftJoin(creditGrants, eq(creditGrants.externalId, paymentRecords.checkoutSessionId))
    .where(or(eq(paymentDisputes.status, "open"), inMonth(paymentDisputes.createdAt), inMonth(paymentDisputes.closedAt)))
    .orderBy(desc(paymentDisputes.createdAt));
}

/** Exported for its test: every account whose buying is paused (K2), oldest block first. Not by month: a block stands until cleared. */
export function blockedQuery() {
  return db
    .select({ userId: stripeCustomers.userId, at: stripeCustomers.purchaseBlockedAt })
    .from(stripeCustomers)
    .where(isNotNull(stripeCustomers.purchaseBlockedAt))
    .orderBy(stripeCustomers.purchaseBlockedAt);
}

const LISTED = [...PAID_SOURCES, "gift"] as const;

/** Exported for its test: the month's bought and gifted lots, newest first. */
export function grantsQuery(start: Date, end: Date) {
  return db
    .select({
      id: creditGrants.id,
      userId: creditGrants.userId,
      source: creditGrants.source,
      units: creditGrants.units,
      revokedUnits: creditGrants.revokedUnits,
      createdAt: creditGrants.createdAt,
      total: sql<number>`(count(*) over ())::int`,
    })
    .from(creditGrants)
    .where(and(inArray(creditGrants.source, [...LISTED]), gte(creditGrants.createdAt, start), lt(creditGrants.createdAt, end)))
    .orderBy(desc(creditGrants.createdAt))
    .limit(GRANTS_SHOWN);
}

/** Exported for its test: who gave which account how many credits, and why. */
export function giftsQuery(start: Date, end: Date) {
  return db
    .select({ at: adminEvents.at, actorId: adminEvents.actorId, userId: adminEvents.userId, units: adminEvents.newValue, note: adminEvents.note })
    .from(adminEvents)
    .where(and(eq(adminEvents.kind, "credits_granted"), gte(adminEvents.at, start), lt(adminEvents.at, end)))
    .orderBy(desc(adminEvents.at));
}

export async function loadPaymentsMonth(start: Date, end: Date): Promise<PaymentsMonth> {
  const [revenue, grants, gifts, disputes, blocked] = await Promise.all([
    revenueQuery(start, end),
    grantsQuery(start, end),
    giftsQuery(start, end),
    disputesQuery(start, end),
    blockedQuery(),
  ]);
  return {
    revenue: revenueOf(revenue as RevenueRow[]),
    grants: grants.map((g) => ({ id: g.id, userId: g.userId, source: g.source as AdminGrant["source"], units: g.units, revokedUnits: g.revokedUnits, createdAt: g.createdAt })),
    grantsTotal: grants[0]?.total ?? 0,
    // The event's check holds both: a `credits_granted` row always names its account, its units and its note.
    gifts: gifts.map((g) => ({ at: g.at, actorId: g.actorId, userId: g.userId ?? "", units: Number(g.units), note: g.note ?? "" })),
    disputes: disputes.map((d) => ({ ...d, status: d.status as AdminDispute["status"] })),
    // The query keeps only rows with a block, so `at` is set.
    blocked: blocked.map((b) => ({ userId: b.userId, at: b.at! })),
  };
}
