import { and, eq, inArray, ne, sql } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "../../db";
import { creditGrants, modelCalls, paymentDisputes, paymentRecords, stripeCustomers, stripeEvents } from "../../db/schema";
import type { LedgerRow } from "../model/allowance-rule";
import { PAYMENTS_APP } from "./packs";
import {
  applyRevocation, claimCents, disputeStatusOf, heldOnGrant, planDispute, refundTarget, type DisputeStatus,
} from "./refund-rule";

/**
 * Refunds and disputes (payments scope §5.5, K2). SERVER-ONLY. The event is a TRIGGER: the charge, the
 * dispute and (when needed) the PaymentIntent are RETRIEVED from Stripe and judged there, as
 * `fulfilCheckoutSession` does for a Session.
 *
 * - A charge is OURS when its PaymentIntent has a `payment_records` row. With none, the PaymentIntent is
 *   read from Stripe: tagged as this app's, it has simply not been recorded yet (out of order), so the
 *   answer is `retry` (the route answers 500, Stripe redelivers); anything else is another app's (the
 *   account is shared with Concert Crawl) and is `ignored`.
 * - One transaction per event: the event row first (a conflict is a duplicate), then the SAME per-player lock
 *   `reserveModelCall` takes (so a revoke and a reserve take turns), then the lot FOR UPDATE.
 * - Lock order matches the purge's (`stripe_customers` before `credit_grants`), so neither deadlocks the other.
 * - Rules are `refund-rule.ts`'s. A refund re-derives the target from the charge's cumulative `amount_refunded`
 *   and never lowers a revocation. An OPEN dispute holds the whole lot at risk, so a refund arriving meanwhile
 *   targets the whole lot too. The unspent part is revoked; the spent part is recorded as `unrecovered_units`.
 * - A dispute's row is its state machine (`planDispute`); the purchase block is set when one opens or is lost,
 *   and is never cleared here.
 */
export type ReverseOutcome =
  | "duplicate" | "ignored" | "retry" | "unmatched" | "no_grant" | "refund"
  | "dispute_opened" | "dispute_won" | "dispute_lost" | "dispute_unchanged";
/** How long a charge of ours may wait for its payment record before we stop asking Stripe to retry: 72 hours, Stripe's
 *  own redelivery horizon. A valid Checkout whose fulfilment is failing (config, database) is retried by Stripe for up to
 *  3 days, and a hand refund arriving before it fulfils must not be recorded as `unmatched` and then let the delayed grant
 *  through un-revoked. The cost: a Checkout that was REFUSED has a tagged PaymentIntent and will never get a record, so
 *  its hand refund is retried (500) for up to 72 hours, then recorded `unmatched` (bounded, noisy, accepted).
 *  `reconcile:payments` lists what it leaves. */
export const RECORD_GRACE_MS = 72 * 60 * 60 * 1000;
export type ReverseResult = { outcome: ReverseOutcome; shortfall?: boolean };

export type GrantRow = { id: string; userId: string; units: number; revokedUnits: number; unrecoveredUnits: number; refundedCents: number };
export type DisputeRow = { status: DisputeStatus; unitsRevoked: number };

/** The database half, as one port so the rules above it can be played against a fake. */
export interface ReverseTx {
  insertEvent(eventId: string, type: string): Promise<boolean>;
  paymentRecord(paymentIntentId: string): Promise<{ checkoutSessionId: string } | null>;
  grantOwner(checkoutSessionId: string): Promise<string | null>;
  /** Raises the payment's account-free cumulative refund to at least `cents` (`greatest`, so replays and out-of-order events never lower it). */
  recordRefund(paymentIntentId: string, cents: number): Promise<void>;
  lockPlayer(userId: string): Promise<void>;
  blockPurchases(userId: string): Promise<void>;
  lockGrant(checkoutSessionId: string): Promise<GrantRow | null>;
  ledgerRows(grantId: string): Promise<LedgerRow[]>;
  /** The statuses of the OTHER disputes on this payment (all but `exceptDisputeId`). */
  otherDisputes(paymentIntentId: string, exceptDisputeId?: string | null): Promise<DisputeStatus[]>;
  dispute(disputeId: string): Promise<DisputeRow | null>;
  /**
   * THE one dispute transition, one race-safe statement used by every exit (no lot, lot gone mid-event, normal):
   * inserts the row, or advances an existing OPEN row to `status`. A terminal row stays terminal and every
   * existing row keeps its `units_revoked` (the audit record). True when this call created the row.
   */
  advanceDispute(disputeId: string, paymentIntentId: string, status: DisputeStatus, unitsRevoked: number): Promise<boolean>;
  /** Writes the lot's revocation and raises its monotonic refund claim to at least `claimCents`. */
  setRevocation(grantId: string, revoked: number, unrecovered: number, claimCents: number): Promise<void>;
}

export type ReverseStore = {
  eventSeen(eventId: string): Promise<boolean>;
  paymentRecord(paymentIntentId: string): Promise<{ checkoutSessionId: string } | null>;
  /** Record an event with nothing else done (an `unmatched` charge): false when it was already recorded. */
  recordEvent(eventId: string, type: string): Promise<boolean>;
  transaction<T>(run: (tx: ReverseTx) => Promise<T>): Promise<T>;
};

const idOf = (v: string | { id: string } | null | undefined): string | null => (v == null ? null : typeof v === "string" ? v : v.id);

type Facts = { paymentIntentId: string; chargeCreated: Date; charge: { amount: number; refunded: number }; dispute: DisputeStatus | null; disputeId: string | null };

/** Handle a `charge.refunded`, `charge.dispute.created` or `charge.dispute.closed` event. */
export async function reverseCharge(
  stripe: Stripe, eventId: string, eventType: string, objectId: string, now: Date = new Date(), store: ReverseStore = dbStore,
): Promise<ReverseResult> {
  if (await store.eventSeen(eventId)) return { outcome: "duplicate" };

  // Retrieved, never the event's copy.
  let facts: Facts;
  if (eventType === "charge.refunded") {
    const charge = await stripe.charges.retrieve(objectId);
    const pi = idOf(charge.payment_intent as string | { id: string } | null);
    if (!pi) return { outcome: "ignored" };
    facts = { paymentIntentId: pi, chargeCreated: new Date(charge.created * 1000), charge: { amount: charge.amount, refunded: charge.amount_refunded }, dispute: null, disputeId: null };
  } else {
    const dispute = await stripe.disputes.retrieve(objectId);
    const charge = await stripe.charges.retrieve(idOf(dispute.charge as string | { id: string })!);
    const pi = idOf(dispute.payment_intent as string | { id: string } | null) ?? idOf(charge.payment_intent as string | { id: string } | null);
    if (!pi) return { outcome: "ignored" };
    facts = {
      paymentIntentId: pi, chargeCreated: new Date(charge.created * 1000), charge: { amount: charge.amount, refunded: charge.amount_refunded },
      dispute: disputeStatusOf(dispute.status), disputeId: dispute.id,
    };
  }

  if (!(await store.paymentRecord(facts.paymentIntentId))) {
    const intent = await stripe.paymentIntents.retrieve(facts.paymentIntentId);
    if (intent.metadata?.app !== PAYMENTS_APP) return { outcome: "ignored" };
    // Ours, with no record: not recorded YET (out of order), or never to be (its Checkout was refused). Stripe
    // retries only while the charge is young; past that the event is recorded and left to the reconcile.
    if (now.getTime() - facts.chargeCreated.getTime() < RECORD_GRACE_MS) return { outcome: "retry" };
    await store.recordEvent(eventId, eventType);
    return { outcome: "unmatched" };
  }

  return store.transaction(async (tx) => {
    if (!(await tx.insertEvent(eventId, eventType))) return { outcome: "duplicate" as const };
    const record = await tx.paymentRecord(facts.paymentIntentId);
    // The refund is kept on the PAYMENT too, which has no account: it survives the purge and covers a payment with no lot.
    if (record) await tx.recordRefund(facts.paymentIntentId, facts.charge.refunded);
    const owner = record ? await tx.grantOwner(record.checkoutSessionId) : null;
    const keepDispute = () => (facts.disputeId && facts.dispute ? tx.advanceDispute(facts.disputeId, facts.paymentIntentId, facts.dispute, 0) : Promise.resolve(false));
    // An unattributed payment, or an account already purged, has no lot to take from. A dispute is still kept,
    // and still closed: its state keeps advancing with no lot behind it.
    if (!record || !owner) {
      await keepDispute();
      return { outcome: "no_grant" as const };
    }
    await tx.lockPlayer(owner);

    const existing = facts.disputeId ? await tx.dispute(facts.disputeId) : null;
    const plan = facts.disputeId && facts.dispute ? planDispute(existing, facts.dispute) : null;
    if (plan?.kind === "none") return { outcome: "dispute_unchanged" as const };
    // The block first, in the purge's own order, then the lot.
    const blocks = plan?.kind === "lose" || (plan?.kind === "open" && plan.status !== "won");
    if (blocks) await tx.blockPurchases(owner);
    const grant = await tx.lockGrant(record.checkoutSessionId);
    if (!grant) {
      // The lot was deleted between the owner read and the lock (the purge): same transition, no lot.
      await keepDispute();
      return { outcome: "no_grant" as const };
    }

    const held = heldOnGrant(await tx.ledgerRows(grant.id), now);
    // The refund figure is the MONOTONIC claim stored under this lock, never the raw snapshot fetched before it:
    // an older snapshot delivered late cannot lower a revocation or the shortfall.
    const claim = claimCents(grant.refundedCents, facts.charge.refunded);
    const refund = refundTarget(grant.units, facts.charge.amount, claim);
    const others = await tx.otherDisputes(facts.paymentIntentId, facts.disputeId);
    // Two separate guards. A refund is held at the whole lot while a dispute is OPEN; a WIN restores nothing while
    // any other dispute on the payment is open OR lost (a lost one is money gone).
    const disputeOpen = (facts.disputeId && facts.dispute === "open") || others.includes("open");
    const winBlocked = others.includes("open") || others.includes("lost");
    const standing = (extra: number) => Math.max(extra, disputeOpen ? grant.units : 0);

    if (plan === null) {
      const next = applyRevocation({ units: grant.units, revoked: grant.revokedUnits, held, target: standing(refund) });
      // The SHORTFALL is read from the strongest standing claim: a LOST dispute is a whole-lot claim too, so a late
      // half-refund cannot overwrite the loss's shortfall with 0. The revocation target is not raised by it (credits
      // freed after the loss are not swept: the accepted snapshot), only the shortfall is kept honest.
      const whole = disputeOpen || others.includes("lost");
      const unrecovered = whole ? Math.max(0, grant.units - next.revoked) : next.unrecovered;
      await tx.setRevocation(grant.id, next.revoked, unrecovered, claim);
      return { outcome: "refund" as const, shortfall: unrecovered > 0 };
    }

    if (plan.kind === "restore") {
      await tx.advanceDispute(facts.disputeId!, facts.paymentIntentId, "won", 0);
      // RECOMPUTED from the refund claim alone (never `revoked - took`, which a refund during the dispute would
      // strand): what the dispute took is only the audit record. Untouched while another dispute holds the lot.
      const next = winBlocked
        ? { revoked: grant.revokedUnits, unrecovered: grant.unrecoveredUnits }
        : applyRevocation({ units: grant.units, revoked: 0, held, target: refund });
      await tx.setRevocation(grant.id, next.revoked, next.unrecovered, claim);
      return { outcome: "dispute_won" as const, shortfall: next.unrecovered > 0 };
    }

    // A dispute that is open or lost holds the whole lot at risk: revoke everything unspent.
    const wonOnSight = plan.kind === "open" && plan.status === "won";
    const next = wonOnSight && !winBlocked
      ? applyRevocation({ units: grant.units, revoked: 0, held, target: refund })
      : applyRevocation({ units: grant.units, revoked: grant.revokedUnits, held, target: wonOnSight ? standing(refund) : grant.units });
    const took = next.revoked - grant.revokedUnits;
    if (plan.kind === "open") {
      if (!(await tx.advanceDispute(facts.disputeId!, facts.paymentIntentId, plan.status, took))) return { outcome: "dispute_unchanged" as const };
    } else {
      await tx.advanceDispute(facts.disputeId!, facts.paymentIntentId, "lost", 0);
    }
    await tx.setRevocation(grant.id, next.revoked, next.unrecovered, claim);
    const outcome = plan.kind === "lose" ? "dispute_lost" : plan.status === "won" ? "dispute_won" : plan.status === "lost" ? "dispute_lost" : "dispute_opened";
    return { outcome: outcome as ReverseOutcome, shortfall: next.unrecovered > 0 };
  });
}

/** The real port: Drizzle against the app's database. */
export const dbStore: ReverseStore = {
  async eventSeen(eventId) {
    const [row] = await db.select({ id: stripeEvents.eventId }).from(stripeEvents).where(eq(stripeEvents.eventId, eventId));
    return Boolean(row);
  },
  async paymentRecord(pi) {
    const [row] = await db.select({ checkoutSessionId: paymentRecords.checkoutSessionId }).from(paymentRecords).where(eq(paymentRecords.paymentIntentId, pi));
    return row ?? null;
  },
  async recordEvent(eventId, type) {
    const rows = await db.insert(stripeEvents).values({ eventId, type }).onConflictDoNothing().returning({ id: stripeEvents.eventId });
    return rows.length > 0;
  },
  transaction: (run) => db.transaction((tx) => run(txPort(tx))),
};

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function txPort(tx: Tx): ReverseTx {
  return {
    async insertEvent(eventId, type) {
      const rows = await tx.insert(stripeEvents).values({ eventId, type }).onConflictDoNothing().returning({ id: stripeEvents.eventId });
      return rows.length > 0;
    },
    async paymentRecord(pi) {
      const [row] = await tx.select({ checkoutSessionId: paymentRecords.checkoutSessionId }).from(paymentRecords).where(eq(paymentRecords.paymentIntentId, pi));
      return row ?? null;
    },
    async grantOwner(checkoutSessionId) {
      const [row] = await tx.select({ userId: creditGrants.userId }).from(creditGrants).where(eq(creditGrants.externalId, checkoutSessionId));
      return row?.userId ?? null;
    },
    async recordRefund(pi, cents) {
      await tx.update(paymentRecords).set({ refundedCents: sql`greatest(${paymentRecords.refundedCents}, ${cents})` }).where(eq(paymentRecords.paymentIntentId, pi));
    },
    // The key `reserveModelCall` takes (allowance.ts), so a revoke and a reserve for one player take turns.
    async lockPlayer(userId) {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`model-allowance:${userId}`}, 0))`);
    },
    async blockPurchases(userId) {
      await tx.update(stripeCustomers).set({ purchaseBlockedAt: sql`coalesce(${stripeCustomers.purchaseBlockedAt}, now())` }).where(eq(stripeCustomers.userId, userId));
    },
    async lockGrant(checkoutSessionId) {
      const [row] = await tx.select({
        id: creditGrants.id, userId: creditGrants.userId, units: creditGrants.units,
        revokedUnits: creditGrants.revokedUnits, unrecoveredUnits: creditGrants.unrecoveredUnits,
        refundedCents: creditGrants.refundedCents,
      }).from(creditGrants).where(eq(creditGrants.externalId, checkoutSessionId)).for("update");
      return row ?? null;
    },
    async ledgerRows(grantId) {
      const rows = await tx.select({ status: modelCalls.status, createdAt: modelCalls.createdAt }).from(modelCalls)
        .where(and(eq(modelCalls.creditGrantId, grantId), inArray(modelCalls.status, ["reserved", "spent"])));
      return rows as LedgerRow[];
    },
    async otherDisputes(pi, exceptDisputeId) {
      const rows = await tx.select({ status: paymentDisputes.status }).from(paymentDisputes)
        .where(and(eq(paymentDisputes.paymentIntentId, pi), exceptDisputeId ? ne(paymentDisputes.disputeId, exceptDisputeId) : undefined));
      return rows.map((r) => r.status as DisputeStatus);
    },
    async dispute(disputeId) {
      const [row] = await tx.select({ status: paymentDisputes.status, unitsRevoked: paymentDisputes.unitsRevoked })
        .from(paymentDisputes).where(eq(paymentDisputes.disputeId, disputeId)).for("update");
      return row ? { status: row.status as DisputeStatus, unitsRevoked: row.unitsRevoked } : null;
    },
    // Explicit names: a bare column inside DO UPDATE is ambiguous with `excluded`.
    async advanceDispute(disputeId, pi, status, unitsRevoked) {
      const rows = await tx.insert(paymentDisputes)
        .values({ disputeId, paymentIntentId: pi, unitsRevoked, status, closedAt: status === "open" ? null : sql`now()` })
        .onConflictDoUpdate({
          target: paymentDisputes.disputeId,
          set: {
            status: sql`case when "payment_disputes"."status" = 'open' then excluded."status" else "payment_disputes"."status" end`,
            closedAt: sql`case when "payment_disputes"."status" = 'open' and excluded."status" <> 'open' then now() else "payment_disputes"."closed_at" end`,
          },
        })
        .returning({ created: sql<boolean>`(xmax = 0)` });
      return rows[0]?.created === true;
    },
    async setRevocation(grantId, revoked, unrecovered, claim) {
      await tx.update(creditGrants).set({
        revokedUnits: revoked, unrecoveredUnits: unrecovered,
        refundedCents: sql`greatest(${creditGrants.refundedCents}, ${claim})`,
      }).where(eq(creditGrants.id, grantId));
    },
  };
}
