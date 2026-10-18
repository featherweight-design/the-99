import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "../../db";
import { creditGrants, paymentRecords, stripeCustomers, stripeEvents, subscriptions } from "../../db/schema";
import { plansConfigured } from "./packs";
import { planPriceEnv } from "./stripe";
import {
  decideInvoice, decideSubscription, holdsPlan, planExpiry, supersedes,
  type FetchedInvoice, type FetchedSubscription,
} from "./subscription-rule";

/**
 * The webhook's jobs for the monthly plan (payments, the subscription PR). SERVER-ONLY. The same discipline as
 * `fulfilCheckoutSession`: the event is a TRIGGER, the invoice and the subscription are RETRIEVED from Stripe and
 * judged there (`decideInvoice`, `decideSubscription`), and a failure to reach Stripe or the database throws, so
 * the route answers 500 and Stripe retries.
 *
 * One transaction per event: the event row first (a conflict means another delivery won), then a transaction
 * advisory lock on the SUBSCRIPTION, then the retrieve. Taking the lock before the retrieve is what makes events
 * converge: two events for one subscription run one after the other, so the later one's retrieval is the later
 * state and its write is the last. Out of order delivery (an update before the invoice, a deleted before an
 * update) therefore cannot lower anything: the state written is always the subscription as it stands NOW, never
 * what the event said when it was cut, and `supersedes` refuses to move an ended subscription or a period back.
 *
 * What a state does to the account's plan lots is `planExpiry`, applied to every LIVE plan lot of the account.
 */
export type SubscribeOutcome = "duplicate" | "grant" | "unattributed" | "applied" | "ignored" | "refuse";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const idOf = (v: string | { id: string } | null | undefined): string | null =>
  v == null ? null : typeof v === "string" ? v : v.id;

/** Whether the plan's Price is configured: the route answers 503 until it is, so a real invoice is retried rather than refused. */
export function planConfigured(): boolean {
  return plansConfigured(planPriceEnv());
}

/** `invoice.paid`: grant the month, store the subscription, apply its expiry. */
export async function fulfilInvoice(
  stripe: Stripe, eventId: string, eventType: string, invoiceId: string, subscriptionId: string, now: Date = new Date(),
): Promise<{ outcome: SubscribeOutcome; reason?: string }> {
  const [seen] = await db.select({ id: stripeEvents.eventId }).from(stripeEvents).where(eq(stripeEvents.eventId, eventId));
  if (seen) return { outcome: "duplicate" };

  return db.transaction(async (tx) => {
    const inserted = await tx.insert(stripeEvents).values({ eventId, type: eventType })
      .onConflictDoNothing().returning({ id: stripeEvents.eventId });
    if (inserted.length === 0) return { outcome: "duplicate" as const };
    await lockSubscription(tx, subscriptionId);
    const invoice = toFetchedInvoice(await stripe.invoices.retrieve(invoiceId, { expand: ["payments"] }));
    const sub = toFetchedSubscription(await stripe.subscriptions.retrieve(subscriptionId));
    // FOR KEY SHARE (not FOR SHARE: K2's dispute path updates this row's purge-block column under the allowance lock, and a
    // plain share lock would deadlock with it) against the account purge, exactly as `fulfilCheckoutSession` does.
    const mapped = await mappedUser(tx, invoice.customerId);
    const decision = decideInvoice(invoice, sub, mapped, planPriceEnv());
    if (decision.kind === "refuse") return { outcome: "refuse" as const, reason: decision.reason };
    const recorded = await tx.insert(paymentRecords)
      .values({ ...decision.record, status: decision.kind === "grant" ? "granted" : "unattributed" })
      .onConflictDoNothing().returning({ id: paymentRecords.paymentIntentId });
    // A payment already recorded is never granted again, whichever way it was kept.
    if (recorded.length === 0) return { outcome: "duplicate" as const };
    if (decision.kind === "unattributed") return { outcome: "unattributed" as const };
    const granted = await tx.insert(creditGrants)
      .values({ userId: decision.userId, source: "plan", units: decision.units, externalId: invoice.id, billingReason: decision.billingReason, subscriptionId: sub.id })
      .onConflictDoNothing({ target: creditGrants.externalId }).returning({ id: creditGrants.id });
    await storeAndExpire(tx, decision.userId, sub, now);
    // A payment happened, so it is granted; but a second live subscription is money for credits twice, and a person
    // has to cancel one. Nothing is cancelled in code. One fixed line, and only when this call granted.
    if (granted.length > 0 && (await otherLiveSubscription(tx, decision.userId, sub.id))) {
      console.error("[payments] second live plan subscription for an account; cancel one by hand");
    }
    return { outcome: granted.length > 0 ? "grant" as const : "duplicate" as const };
  });
}

/** `customer.subscription.updated` and `.deleted`: store the retrieved state and apply its expiry. The event type changes nothing. */
export async function syncSubscription(
  stripe: Stripe, eventId: string, eventType: string, subscriptionId: string, now: Date = new Date(),
): Promise<{ outcome: SubscribeOutcome; reason?: string }> {
  const [seen] = await db.select({ id: stripeEvents.eventId }).from(stripeEvents).where(eq(stripeEvents.eventId, eventId));
  if (seen) return { outcome: "duplicate" };

  return db.transaction(async (tx) => {
    const inserted = await tx.insert(stripeEvents).values({ eventId, type: eventType })
      .onConflictDoNothing().returning({ id: stripeEvents.eventId });
    if (inserted.length === 0) return { outcome: "duplicate" as const };
    await lockSubscription(tx, subscriptionId);
    const sub = toFetchedSubscription(await stripe.subscriptions.retrieve(subscriptionId));
    const mapped = await mappedUser(tx, sub.customerId);
    const decision = decideSubscription(sub, mapped, planPriceEnv());
    if (decision.kind === "refuse") return { outcome: "refuse" as const, reason: decision.reason };
    if (decision.kind === "ignored") return { outcome: "ignored" as const };
    await storeAndExpire(tx, decision.userId, sub, now);
    return { outcome: "applied" as const };
  });
}

async function lockSubscription(tx: Tx, subscriptionId: string): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`plan-subscription:${subscriptionId}`}, 0))`);
}

async function mappedUser(tx: Tx, customerId: string | null): Promise<string | null> {
  if (!customerId) return null;
  const [row] = await tx.select({ userId: stripeCustomers.userId }).from(stripeCustomers)
    .where(eq(stripeCustomers.stripeCustomerId, customerId)).for("key share");
  return row?.userId ?? null;
}

async function otherLiveSubscription(tx: Tx, userId: string, subscriptionId: string): Promise<boolean> {
  const rows = await tx.select({ id: subscriptions.stripeSubscriptionId, userId: subscriptions.userId, status: subscriptions.status })
    .from(subscriptions).where(eq(subscriptions.userId, userId));
  return rows.some((r) => r.userId === userId && r.id !== subscriptionId && holdsPlan(r.status));
}

/**
 * Upsert the subscription row (unless an older state would lower it), then apply the expiry rule to THIS subscription's
 * live plan lots. The rule reads the state that stands after the write: the retrieved one, or, when the write was skipped
 * as superseded, the stored one. A skipped write must still expire: a late `invoice.paid` of an ended subscription has
 * just inserted a lot with no expiry, and it must lapse with the rest.
 *
 * Scoped to the subscription (`subscription_id`) as well as the account, so a late event of an old subscription never
 * moves a newer one's lots. The per-player allowance lock, the one `reserveModelCall` holds while it picks a lot, is
 * taken (after the subscription's own lock) before the update, so a spend never picks a lot as its expiry moves.
 */
async function storeAndExpire(tx: Tx, userId: string, sub: FetchedSubscription, now: Date): Promise<void> {
  const [prev] = await tx.select({ status: subscriptions.status, currentPeriodEnd: subscriptions.currentPeriodEnd, cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd })
    .from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, sub.id));
  let standing: { status: string; cancelAtPeriodEnd: boolean; currentPeriodEnd: Date | null } = sub;
  if (supersedes(sub, prev ?? null)) {
    await tx.insert(subscriptions)
      .values({ stripeSubscriptionId: sub.id, userId, status: sub.status, currentPeriodEnd: sub.currentPeriodEnd, cancelAtPeriodEnd: sub.cancelAtPeriodEnd })
      .onConflictDoUpdate({
        target: subscriptions.stripeSubscriptionId,
        set: { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd, cancelAtPeriodEnd: sub.cancelAtPeriodEnd, updatedAt: now },
      });
  } else if (prev) {
    standing = prev;
  }
  const expiry = planExpiry(standing, now);
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`model-allowance:${userId}`}, 0))`);
  await tx.update(creditGrants)
    .set({ expiresAt: expiry.action === "clear" ? null : expiry.at })
    .where(and(
      eq(creditGrants.userId, userId),
      eq(creditGrants.source, "plan"),
      eq(creditGrants.subscriptionId, sub.id),
      or(isNull(creditGrants.expiresAt), gt(creditGrants.expiresAt, now)),
    ));
}

/** The facts `decideInvoice` reads, out of a retrieved Invoice (API 2026-08-26: the subscription is under `parent`). */
export function toFetchedInvoice(i: Stripe.Invoice): FetchedInvoice {
  const details = i.parent?.subscription_details ?? null;
  const paid = i.payments?.data.find((p) => p.status === "paid" && p.payment.type === "payment_intent");
  return {
    id: i.id!,
    status: i.status ?? null,
    billingReason: i.billing_reason ?? null,
    currency: i.currency,
    amountPaid: i.amount_paid,
    total: i.total,
    totalExcludingTax: i.total_excluding_tax ?? null,
    customerId: idOf(i.customer as string | { id: string } | null),
    subscriptionId: idOf(details?.subscription as string | { id: string } | undefined),
    subscriptionMetadata: { ...(details?.metadata ?? {}) },
    lines: i.lines.data.map((l) => ({
      priceId: idOf(l.pricing?.price_details?.price as string | { id: string } | undefined),
      quantity: l.quantity ?? null,
    })),
    paymentIntentId: idOf(paid?.payment.payment_intent as string | { id: string } | undefined),
    country: i.customer_address?.country ?? null,
  };
}

/** The facts `decideSubscription` reads. The period end lives on the items in this API version: the latest of them. */
export function toFetchedSubscription(s: Stripe.Subscription): FetchedSubscription {
  const ends = s.items.data.map((it) => it.current_period_end).filter((n): n is number => typeof n === "number");
  return {
    id: s.id,
    status: s.status,
    customerId: idOf(s.customer as string | { id: string }),
    metadata: { ...(s.metadata ?? {}) },
    cancelAtPeriodEnd: s.cancel_at_period_end,
    currentPeriodEnd: ends.length > 0 ? new Date(Math.max(...ends) * 1000) : null,
    priceIds: s.items.data.map((it) => it.price.id),
  };
}
