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
 *   with Concert Crawl, so anything else is NEVER deleted: one error-level line, result `"foreign"`, and the purge goes on with
 *   its database half (a throw here would repeat on every retry and sweep for ever and the account would never
 *   be purged). The Customer is left in place for someone to check in Stripe.
 * - `customers.del` permanently deletes the Customer and "immediately cancels any active subscriptions on the
 *   customer" (the pinned SDK's own doc comment on `CustomersResource.del`), so a deleted account is never
 *   charged again.
 * - Already gone (404 / `resource_missing`, or a Customer Stripe reports `deleted`) is DONE. Any other failure,
 *   and a mapping with no usable Stripe key, THROW: the purge does nothing, the webhook answers 500 and Clerk
 *   retries, and the sweep re-runs it. The mapping row is still there, so the retry finds the Customer.
 * - Returns the Customer id it handled (null with no mapping): the purge's transaction deletes the mapping
 *   `returning` its id and rolls back on one this call did not handle (a Checkout that stored a mapping after
 *   the read above), so the retry deletes that Customer.
 * - Idempotent. After the purge the mapping is gone, so a re-run (the sweep's, for a day) makes no call.
 *
 * Races with a late payment: between this delete and the purge's transaction the mapping still exists, so a
 * `checkout.session.completed` can still grant, and the purge then deletes that lot with the account
 * (`credit_grants` follows `stripe_customers` in `PURGE_ORDER`; `fulfil.ts` reads the mapping FOR SHARE). One
 * completing AFTER the commit finds no mapping and is kept unattributed (refund by hand). A Checkout started
 * in the instant between this delete and the transaction fails at `ensureCustomer`: the account is being
 * deleted, and that is accepted.
 *
 * Logs are fixed words: never an id, an email or an amount. Reads no feature switch.
 */
export async function deleteStripeCustomerFor(userId: string, getStripe: () => Stripe | null): Promise<{ outcome: "none" | "deleted" | "gone" | "foreign"; customerId: string | null }> {
  const [row] = await db.select({ id: stripeCustomers.stripeCustomerId }).from(stripeCustomers)
    .where(eq(stripeCustomers.userId, userId));
  if (!row) return { outcome: "none", customerId: null };
  const stripe = getStripe();
  if (!stripe) {
    console.error("[payments] account deletion: a Stripe customer exists but no usable Stripe key; purge deferred");
    throw new Error("Stripe customer cannot be deleted: no usable Stripe key");
  }
  let found: Stripe.Customer | Stripe.DeletedCustomer;
  try {
    found = await stripe.customers.retrieve(row.id);
  } catch (error) {
    return failed(error, row.id);
  }
  if ("deleted" in found && found.deleted) return { outcome: "gone", customerId: row.id };
  const meta = (found as Stripe.Customer).metadata ?? {};
  if (meta.app !== PAYMENTS_APP || meta.user_id !== userId) {
    console.error("[payments] account deletion: stripe customer not tagged as this app's; left in place, check Stripe");
    return { outcome: "foreign", customerId: row.id };
  }
  try {
    await stripe.customers.del(row.id);
  } catch (error) {
    return failed(error, row.id);
  }
  console.info("[payments] account deletion: Stripe customer deleted");
  return { outcome: "deleted", customerId: row.id };
}

/** A missing Customer is done; anything else stops the purge. */
function failed(error: unknown, customerId: string) {
  if (isMissing(error)) return { outcome: "gone" as const, customerId };
  console.error("[payments] account deletion: the Stripe customer could not be deleted; purge deferred");
  throw new Error("Stripe customer deletion failed");
}

function isMissing(error: unknown): boolean {
  const e = error as { code?: unknown; statusCode?: unknown } | null;
  return e?.code === "resource_missing" || e?.statusCode === 404;
}
