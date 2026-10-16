import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "../../db";
import { stripeCustomers } from "../../db/schema";
import { recordHit } from "../rate/observe";
import { overLimit, RATE_RULES } from "../rate/rules";
import { appOrigin, packCheckoutParams, priceIdFor } from "./checkout-rule";
import { PAYMENTS_APP, type PackId } from "./packs";
import { packPriceEnv } from "./stripe";

/**
 * Creating a Checkout Session for a pack (payments scope §5.4, K1b). SERVER-ONLY. The caller (the action)
 * has already decided who the reader is, that `PAYMENTS_ENABLED` is on for them and that their email is
 * verified; this decides everything about the Session itself.
 *
 * 1. The pack must be configured (its Price variable set) and the app's origin known (`APP_ORIGIN`).
 * 2. THROTTLED, and enforced: the 11th Session in an hour is refused (`checkout` in `RATE_RULES`), counted
 *    in the database because serverless instances share no memory.
 * 3. The reader's Stripe Customer, made once (`ensureCustomer`). The mapping in `stripe_customers` is what
 *    the webhook attributes a payment by, so it exists before any Session can be paid.
 * 4. The Session, built by `packCheckoutParams`, under an idempotency key from the press's own id, so a
 *    double-tap or a retried request makes one Session. Every attempt still counts against the hourly limit
 *    (step 2): the limit counts attempts, not Sessions, which is the stricter reading for card testing.
 *
 * Returns the hosted Checkout URL to send the reader to. Nothing is granted here: only the signed webhook
 * grants (§5.5).
 */
export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; reason: "unconfigured" | "throttled" };

export async function createPackCheckout(
  stripe: Stripe,
  input: { userId: string; email: string | null; packId: PackId; actionId: string },
): Promise<CheckoutResult> {
  const priceId = priceIdFor(input.packId, packPriceEnv());
  const origin = appOrigin(process.env.APP_ORIGIN, process.env.ADMIN_ENV_LABEL);
  if (!priceId || !origin) return { ok: false, reason: "unconfigured" };

  const hits = await recordHit(input.userId, "checkout");
  if (overLimit(hits, RATE_RULES.checkout)) return { ok: false, reason: "throttled" };

  const customerId = await ensureCustomer(stripe, input.userId, input.email);
  const session = await stripe.checkout.sessions.create(
    packCheckoutParams({ userId: input.userId, customerId, packId: input.packId, priceId, origin }),
    { idempotencyKey: `${PAYMENTS_APP}:checkout:${input.userId}:${input.actionId}` },
  );
  if (!session.url) throw new Error("Checkout Session has no URL");
  return { ok: true, url: session.url };
}

/**
 * The reader's Stripe Customer id, creating the Customer and its mapping on first use. The create carries
 * an idempotency key per account, so two first presses at once make ONE Customer (Stripe answers the second
 * with the first's result), and the mapping insert is a no-op for whichever lands second. The id read back
 * after the insert is the one stored, so a later race can never leave two mappings for one account.
 *
 * The Customer is tagged with this app and the account (the Stripe account is shared with Concert Crawl);
 * its email is the reader's verified address, for Stripe's receipts. A returning reader's Customer is given
 * their CURRENT verified address before each Session, so a changed email never leaves Checkout and its
 * receipts on the old one.
 */
export async function ensureCustomer(stripe: Stripe, userId: string, email: string | null): Promise<string> {
  const existing = await mappedCustomer(userId);
  if (existing) {
    if (email) await stripe.customers.update(existing, { email });
    return existing;
  }
  const customer = await stripe.customers.create(
    { ...(email ? { email } : {}), metadata: { app: PAYMENTS_APP, user_id: userId } },
    { idempotencyKey: `${PAYMENTS_APP}:customer:${userId}` },
  );
  await db.insert(stripeCustomers).values({ userId, stripeCustomerId: customer.id }).onConflictDoNothing();
  const stored = await mappedCustomer(userId);
  if (!stored) throw new Error("Stripe customer mapping was not stored");
  return stored;
}

async function mappedCustomer(userId: string): Promise<string | null> {
  const [row] = await db.select({ id: stripeCustomers.stripeCustomerId }).from(stripeCustomers)
    .where(eq(stripeCustomers.userId, userId));
  return row?.id ?? null;
}
