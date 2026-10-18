import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "../../db";
import { stripeCustomers } from "../../db/schema";
import { PAYMENTS_APP } from "./packs";

/**
 * Account deletion reaching Stripe (payments scope §6.3). SERVER-ONLY, and the one place the purge touches
 * Stripe. `purgeAccount` calls it BEFORE its database transaction ("Stripe first, database second"): a Stripe
 * call cannot join a transaction, and deleting the mapping first would strand the Customer for ever.
 *
 * - No `stripe_customers` row: nothing to do. A player who never started a Checkout costs no Stripe call and
 *   needs no key (`getStripe` is not even called).
 * - A row: the Customer is retrieved first and deleted ONLY when it is this app's and this account's
 *   (`metadata.app` and `metadata.user_id`, exactly what `ensureCustomer` tags). The Stripe account is shared
 *   with Concert Crawl, so anything else is refused: an error-level line and a throw, which stops the purge.
 * - `customers.del` permanently deletes the Customer and "immediately cancels any active subscriptions on the
 *   customer" (the pinned SDK's own doc comment on `CustomersResource.del`), so a deleted account is never
 *   charged again.
 * - Already gone (404 / `resource_missing`, or a Customer Stripe reports `deleted`) is DONE. Any other failure,
 *   and a mapping with no usable Stripe key, THROW: the purge does nothing, the webhook answers 500 and Clerk
 *   retries, and the sweep re-runs it. The mapping row is still there, so the retry finds the Customer.
 * - Idempotent. After the purge the mapping is gone, so a re-run (the sweep's, for a day) makes no call.
 *
 * Races with a late payment: between this delete and the purge's transaction, a `checkout.session.completed`
 * can still find the mapping and grant; the purge then deletes that lot (`credit_grants` follows
 * `stripe_customers` in `PURGE_ORDER`, and `fulfil.ts` reads the mapping FOR SHARE). Once the purge has
 * committed there is no mapping, so a later event for the deleted Customer is kept unattributed.
 *
 * Logs are fixed words: never an id, an email or an amount. Reads no feature switch.
 */
export async function deleteStripeCustomerFor(userId: string, getStripe: () => Stripe | null): Promise<"none" | "deleted" | "gone"> {
  const [row] = await db.select({ id: stripeCustomers.stripeCustomerId }).from(stripeCustomers)
    .where(eq(stripeCustomers.userId, userId));
  if (!row) return "none";
  const stripe = getStripe();
  if (!stripe) {
    console.error("[payments] account deletion: a Stripe customer exists but no usable Stripe key; purge deferred");
    throw new Error("Stripe customer cannot be deleted: no usable Stripe key");
  }
  let found: Stripe.Customer | Stripe.DeletedCustomer;
  try {
    found = await stripe.customers.retrieve(row.id);
  } catch (error) {
    return failed(error);
  }
  if ("deleted" in found && found.deleted) return "gone";
  const meta = (found as Stripe.Customer).metadata ?? {};
  if (meta.app !== PAYMENTS_APP || meta.user_id !== userId) {
    console.error("[payments] account deletion: the mapped Stripe customer is not tagged as this app's and this account's; refused");
    throw new Error("Stripe customer is not this app's");
  }
  try {
    await stripe.customers.del(row.id);
  } catch (error) {
    return failed(error);
  }
  console.info("[payments] account deletion: Stripe customer deleted");
  return "deleted";
}

/** A missing Customer is done; anything else stops the purge. */
function failed(error: unknown): "gone" {
  if (isMissing(error)) return "gone";
  console.error("[payments] account deletion: the Stripe customer could not be deleted; purge deferred");
  throw new Error("Stripe customer deletion failed");
}

function isMissing(error: unknown): boolean {
  const e = error as { code?: unknown; statusCode?: unknown } | null;
  return e?.code === "resource_missing" || e?.statusCode === 404;
}
