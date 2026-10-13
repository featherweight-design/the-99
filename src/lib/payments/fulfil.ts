import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "../../db";
import { creditGrants, paymentRecords, stripeCustomers, stripeEvents } from "../../db/schema";
import { decideFulfilment, type Decision, type FetchedSession } from "./fulfil-rule";
import { PACKS } from "./packs";

/**
 * The webhook's one job for a completed Checkout Session (payments scope §5.3, §5.5). SERVER-ONLY.
 *
 * 1. An event already recorded is done: answered at once, with no call to Stripe.
 * 2. The Session is RETRIEVED from Stripe, with its line items: the event is a trigger, never a source
 *    of truth. A failed retrieve throws, so the route answers 500 and Stripe retries.
 * 3. One transaction: the event row first (a conflict means another delivery won, and this one does
 *    nothing), the customer's account read through `stripe_customers`, then `decideFulfilment`, then
 *    the lot and the payment record. Both writes are idempotent on Stripe's ids too, so even two events
 *    for one Session grant once.
 */
export type Outcome = "duplicate" | Decision["kind"];

export async function fulfilCheckoutSession(stripe: Stripe, eventId: string, eventType: string, sessionId: string): Promise<{ outcome: Outcome; reason?: string }> {
  const [seen] = await db.select({ id: stripeEvents.eventId }).from(stripeEvents).where(eq(stripeEvents.eventId, eventId));
  if (seen) return { outcome: "duplicate" };

  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["line_items"] });
  const fetched = toFetched(session);

  return db.transaction(async (tx) => {
    const inserted = await tx.insert(stripeEvents).values({ eventId, type: eventType })
      .onConflictDoNothing().returning({ id: stripeEvents.eventId });
    if (inserted.length === 0) return { outcome: "duplicate" as const };
    // FOR SHARE, against the account purge, which deletes this mapping BEFORE the account's lots
    // (`PURGE_ORDER`). Whichever takes the row first, the other waits: a purge that got there first
    // leaves no mapping, so the payment is kept unattributed; a grant that got there first commits
    // before the purge's next statement, which then deletes the lot it wrote.
    const [mapped] = fetched.customerId
      ? await tx.select({ userId: stripeCustomers.userId }).from(stripeCustomers)
        .where(eq(stripeCustomers.stripeCustomerId, fetched.customerId)).for("share")
      : [];
    const decision = decideFulfilment(fetched, mapped?.userId ?? null, priceEnv());
    if (decision.kind === "refuse") return { outcome: "refuse" as const, reason: decision.reason };
    const recorded = await tx.insert(paymentRecords)
      .values({ ...decision.record, status: decision.kind === "grant" ? "granted" : "unattributed" })
      .onConflictDoNothing().returning({ id: paymentRecords.paymentIntentId });
    if (decision.kind === "unattributed") return { outcome: recorded.length > 0 ? "unattributed" as const : "duplicate" as const };
    const granted = await tx.insert(creditGrants)
      .values({ userId: decision.userId, source: "pack", units: decision.units, externalId: decision.record.checkoutSessionId })
      .onConflictDoNothing({ target: creditGrants.externalId }).returning({ id: creditGrants.id });
    // A Session already granted under another event id writes nothing here, and says so.
    return { outcome: granted.length > 0 ? "grant" as const : "duplicate" as const };
  });
}

/** The Price ids the packs name, by member read: the registry's own variables and nothing else. */
function priceEnv(): Record<string, string | undefined> {
  return Object.fromEntries(Object.values(PACKS).map((p) => [p.priceEnv, process.env[p.priceEnv]]));
}

const idOf = (v: string | { id: string } | null | undefined): string | null =>
  v == null ? null : typeof v === "string" ? v : v.id;

/** The facts `decideFulfilment` reads, out of a retrieved Session. Exported for the tests. */
export function toFetched(s: Stripe.Checkout.Session): FetchedSession {
  return {
    id: s.id,
    mode: s.mode,
    paymentStatus: s.payment_status,
    currency: s.currency ?? null,
    amountTotal: s.amount_total ?? null,
    amountTax: s.total_details?.amount_tax ?? null,
    lineItems: (s.line_items?.data ?? []).map((li) => ({ priceId: li.price?.id ?? null, quantity: li.quantity ?? null })),
    customerId: idOf(s.customer as string | { id: string } | null),
    clientReferenceId: s.client_reference_id ?? null,
    metadata: { ...(s.metadata ?? {}) },
    paymentIntentId: idOf(s.payment_intent as string | { id: string } | null),
    country: s.customer_details?.address?.country ?? null,
  };
}

