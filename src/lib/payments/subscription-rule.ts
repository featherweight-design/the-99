import type Stripe from "stripe";
import { isOurSession, PAYMENTS_APP, planForPrice, type PlanId } from "./packs";
import type { PaymentRecord } from "./fulfil-rule";

/**
 * The plan's rules (payments, the subscription PR). Pure. Like `decideFulfilment`, every rule reads an object
 * as RETRIEVED from Stripe, never an event's own copy: the event is only a trigger.
 *
 * - `decideInvoice`: whether a paid invoice grants a plan month, and to whom.
 * - `decideSubscription`: whether a subscription is ours and whose, so its state may be stored.
 * - `supersedes`: an older state never lowers a newer one.
 * - `planExpiry`: what a subscription's state does to the account's plan lots.
 */

/** Stripe's statuses that end a subscription for good. An ended id never comes back: a resubscribe is a new id. */
export function isEnded(status: string): boolean {
  return status === "canceled" || status === "incomplete_expired";
}

/** Statuses in which the player holds a plan, so Checkout refuses a second one (`already`). `incomplete` counts: its first payment is still being settled. */
export function holdsPlan(status: string): boolean {
  return status === "active" || status === "trialing" || status === "past_due" || status === "unpaid" || status === "incomplete";
}

export type FetchedSubscription = {
  id: string;
  status: string;
  customerId: string | null;
  metadata: Record<string, string>;
  cancelAtPeriodEnd: boolean;
  /** The latest end among the subscription's items, or null when Stripe reports none. */
  currentPeriodEnd: Date | null;
  priceIds: readonly string[];
};

export type FetchedInvoice = {
  id: string;
  status: string | null;
  billingReason: string | null;
  currency: string;
  amountPaid: number;
  total: number;
  /** The total less tax, which is what the Price must equal (the Price is tax-exclusive). */
  totalExcludingTax: number | null;
  customerId: string | null;
  subscriptionId: string | null;
  /** The snapshot of the subscription's metadata on the invoice. */
  subscriptionMetadata: Record<string, string>;
  lines: readonly { priceId: string | null; quantity: number | null }[];
  paymentIntentId: string | null;
  country: string | null;
};

export type InvoiceRefusal =
  | "not_ours" | "not_paid" | "billing_reason" | "no_subscription" | "no_payment_intent" | "line_items" | "unknown_price"
  | "plan_mismatch" | "currency" | "amount" | "no_customer" | "attribution";

export type InvoiceDecision =
  | { kind: "grant"; userId: string; plan: PlanId; units: number; billingReason: string; record: PaymentRecord }
  | { kind: "unattributed"; record: PaymentRecord }
  | { kind: "refuse"; reason: InvoiceRefusal };

/** The only invoices that are a plan month: the first, and a renewal. A change of plan or a manual invoice grants nothing. */
const PLAN_MONTHS = new Set(["subscription_create", "subscription_cycle"]);

export function decideInvoice(
  inv: FetchedInvoice,
  sub: FetchedSubscription,
  mappedUserId: string | null,
  env: Record<string, string | undefined>,
): InvoiceDecision {
  if (!isOurSession(inv.subscriptionMetadata) || !isOurSession(sub.metadata)) return { kind: "refuse", reason: "not_ours" };
  if (inv.status !== "paid" || inv.amountPaid <= 0 || inv.amountPaid !== inv.total) return { kind: "refuse", reason: "not_paid" };
  if (!inv.billingReason || !PLAN_MONTHS.has(inv.billingReason)) return { kind: "refuse", reason: "billing_reason" };
  if (!inv.subscriptionId || inv.subscriptionId !== sub.id) return { kind: "refuse", reason: "no_subscription" };
  if (!inv.paymentIntentId) return { kind: "refuse", reason: "no_payment_intent" };
  if (inv.lines.length !== 1 || inv.lines[0].quantity !== 1 || !inv.lines[0].priceId) return { kind: "refuse", reason: "line_items" };
  const plan = planForPrice(inv.lines[0].priceId, env);
  if (!plan) return { kind: "refuse", reason: "unknown_price" };
  if (sub.metadata.plan !== plan.id || inv.subscriptionMetadata.plan !== plan.id) return { kind: "refuse", reason: "plan_mismatch" };
  if (inv.currency !== plan.currency) return { kind: "refuse", reason: "currency" };
  if (inv.totalExcludingTax === null || inv.totalExcludingTax !== plan.priceCents || inv.amountPaid < plan.priceCents) {
    return { kind: "refuse", reason: "amount" };
  }
  if (!inv.customerId || sub.customerId !== inv.customerId) return { kind: "refuse", reason: "no_customer" };
  const record: PaymentRecord = {
    paymentIntentId: inv.paymentIntentId,
    checkoutSessionId: inv.id,
    amountCents: inv.amountPaid,
    taxCents: inv.amountPaid - inv.totalExcludingTax,
    currency: inv.currency,
    country: inv.country,
  };
  if (mappedUserId === null) return { kind: "unattributed", record };
  if (sub.metadata.user_id !== mappedUserId || inv.subscriptionMetadata.user_id !== mappedUserId) {
    return { kind: "refuse", reason: "attribution" };
  }
  return { kind: "grant", userId: mappedUserId, plan: plan.id, units: plan.units, billingReason: inv.billingReason, record };
}

export type SubscriptionRefusal = "not_ours" | "unknown_price" | "plan_mismatch" | "no_customer" | "attribution";

export type SubscriptionDecision =
  | { kind: "apply"; userId: string }
  | { kind: "ignored" }
  | { kind: "refuse"; reason: SubscriptionRefusal };

/**
 * Whether a retrieved subscription is ours and whose. A customer that maps to no account is `ignored`: there is
 * no one to store it for (an account deleted since), and nothing was paid by this event.
 */
export function decideSubscription(
  sub: FetchedSubscription,
  mappedUserId: string | null,
  env: Record<string, string | undefined>,
): SubscriptionDecision {
  if (!isOurSession(sub.metadata)) return { kind: "refuse", reason: "not_ours" };
  if (!sub.customerId) return { kind: "refuse", reason: "no_customer" };
  if (sub.priceIds.length !== 1) return { kind: "refuse", reason: "unknown_price" };
  const plan = planForPrice(sub.priceIds[0], env);
  if (!plan) return { kind: "refuse", reason: "unknown_price" };
  if (sub.metadata.plan !== plan.id) return { kind: "refuse", reason: "plan_mismatch" };
  if (mappedUserId === null) return { kind: "ignored" };
  if (sub.metadata.user_id !== mappedUserId) return { kind: "refuse", reason: "attribution" };
  return { kind: "apply", userId: mappedUserId };
}

export type StoredSubscription = { status: string; currentPeriodEnd: Date | null };

/**
 * Whether a state read from Stripe may replace the stored one. An ended subscription is terminal for its id, and
 * a period end only moves forward, so an update that arrives late (or a retried one) cannot lower what a newer
 * event already wrote. The state is always the RETRIEVED one, serialised per subscription, so this is the second
 * line: it holds even if a retrieval were ever older than the row.
 */
export function supersedes(next: StoredSubscription, prev: StoredSubscription | null): boolean {
  if (!prev) return true;
  if (isEnded(prev.status)) return false;
  if (isEnded(next.status)) return true;
  const n = next.currentPeriodEnd?.getTime() ?? null;
  const p = prev.currentPeriodEnd?.getTime() ?? null;
  if (n !== null && p !== null && n < p) return false;
  return true;
}

export type PlanExpiry = { action: "clear" } | { action: "set"; at: Date };

/**
 * What a subscription's state does to every LIVE plan lot of the account (a lot already expired stays expired).
 * Held and not cancelling: the lots roll over, so any expiry is cleared (a keep, a renewal, a resubscribe).
 * Cancelling at period end: they expire when the paid period does. Ended: at the period end if that is still
 * ahead, else now. A subscription with no period end that is cancelling or ended expires its lots now.
 */
export function planExpiry(sub: { status: string; cancelAtPeriodEnd: boolean; currentPeriodEnd: Date | null }, now: Date): PlanExpiry {
  if (isEnded(sub.status)) return { action: "set", at: laterOf(sub.currentPeriodEnd, now) };
  if (sub.cancelAtPeriodEnd) return { action: "set", at: laterOf(sub.currentPeriodEnd, now) };
  return { action: "clear" };
}

function laterOf(end: Date | null, now: Date): Date {
  return end && end.getTime() > now.getTime() ? end : now;
}

export type PlanEvent = Extract<Stripe.Event, { type: "invoice.paid" | "customer.subscription.updated" | "customer.subscription.deleted" }>;

/**
 * What the route needs from a plan event's OWN copy, which is enough to decide whether it is this app's (the event is
 * signed): the subscription it concerns and, for an invoice, the invoice. Null when the object is not tagged as this
 * app's (the account is shared with Concert Crawl) or an invoice belongs to no subscription.
 */
export function planEventTarget(event: PlanEvent): { subscriptionId: string; invoiceId: string | null } | null {
  if (event.type === "invoice.paid") {
    const details = event.data.object.parent?.subscription_details ?? null;
    const sref = details?.subscription;
    const subscriptionId = typeof sref === "string" ? sref : sref?.id ?? null;
    if (details?.metadata?.app !== PAYMENTS_APP || !subscriptionId || !event.data.object.id) return null;
    return { subscriptionId, invoiceId: event.data.object.id };
  }
  const sub = event.data.object;
  return sub.metadata?.app === PAYMENTS_APP ? { subscriptionId: sub.id, invoiceId: null } : null;
}
