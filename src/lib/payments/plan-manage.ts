import { desc, eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "../../db";
import { stripeCustomers, subscriptions } from "../../db/schema";
import { appOrigin } from "./checkout-rule";
import { customerIsViewers, decidePlanChange, portalConfigId } from "./plan-manage-rule";
import { holdsPlan } from "./subscription-rule";

/**
 * The plan card's server half (payments U3a, plan E4 and E5). SERVER-ONLY. The caller (the action) has decided who the
 * reader is and that `PAYMENTS_ENABLED` is on for them.
 *
 * `setPlanCancelling` finds the reader's live plan in OUR `subscriptions` table (only to learn the id), RE-READS it
 * from Stripe, and writes `cancel_at_period_end` only when that copy is this app's and this account's and still holds a
 * plan. It writes NOTHING of ours: the `customer.subscription.updated` webhook is the single writer of the row and of
 * the lots' expiry. A Stripe or database error THROWS, for the action to answer `failed`.
 *
 * `openCardPortal` makes a billing portal Session for the reader's own Customer on The 99's own portal configuration
 * (`STRIPE_PORTAL_CONFIG`), returning to `APP_ORIGIN/credits`. Without that configuration it makes nothing: never the
 * account's default, which is shared with Concert Crawl.
 */
export type PlanChangeResult =
  | { ok: true; changed: boolean }
  | { ok: false; reason: "not_found" | "foreign" | "ended" };

export async function setPlanCancelling(stripe: Stripe, userId: string, cancel: boolean): Promise<PlanChangeResult> {
  const rows = await db.select({ id: subscriptions.stripeSubscriptionId, status: subscriptions.status }).from(subscriptions)
    .where(eq(subscriptions.userId, userId)).orderBy(desc(subscriptions.createdAt));
  const row = rows.find((r) => holdsPlan(r.status));
  if (!row) return { ok: false, reason: "not_found" };

  const sub = await stripe.subscriptions.retrieve(row.id);
  const decision = decidePlanChange(sub, userId, cancel);
  if (decision === "foreign" || decision === "ended") return { ok: false, reason: decision };
  if (decision === "unchanged") return { ok: true, changed: false };
  await stripe.subscriptions.update(row.id, { cancel_at_period_end: cancel });
  return { ok: true, changed: true };
}

export type PortalResult = { ok: true; url: string } | { ok: false; reason: "unconfigured" | "not_found" };

export async function openCardPortal(stripe: Stripe, userId: string): Promise<PortalResult> {
  const configuration = portalConfigId(process.env.STRIPE_PORTAL_CONFIG);
  const origin = appOrigin(process.env.APP_ORIGIN, process.env.ADMIN_ENV_LABEL);
  if (!configuration || !origin) return { ok: false, reason: "unconfigured" };

  const [row] = await db.select({ id: stripeCustomers.stripeCustomerId }).from(stripeCustomers)
    .where(eq(stripeCustomers.userId, userId));
  if (!row) return { ok: false, reason: "not_found" };
  const customer = await stripe.customers.retrieve(row.id);
  if ("deleted" in customer && customer.deleted) return { ok: false, reason: "not_found" };
  if (!customerIsViewers(customer as Stripe.Customer, userId)) return { ok: false, reason: "not_found" };

  const session = await stripe.billingPortal.sessions.create({
    customer: row.id,
    configuration,
    return_url: `${origin}/credits`,
  });
  if (!session.url) throw new Error("Portal Session has no URL");
  return { ok: true, url: session.url };
}
