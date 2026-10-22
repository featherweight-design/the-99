import type Stripe from "stripe";
import { PACKS, PAYMENTS_APP, PLANS, type PackId, type PlanId } from "./packs";

/**
 * What a Checkout Session for a pack is created with (payments scope §5.4). Pure. SERVER-AUTHORITATIVE:
 * the player chooses a pack id from the closed set and nothing else. The Price, the quantity (1), the
 * customer, the reference and the metadata are all set here, and they are exactly the facts the webhook's
 * `decideFulfilment` checks on the retrieved Session, so a Session this builds is one that rule grants.
 *
 * - `metadata.app` tags the Session as this app's: the Stripe account is shared with Concert Crawl, and a
 *   Session without the tag is ignored by our webhook. The PaymentIntent carries the same metadata, so a
 *   refund or a dispute (K2) can be told apart the same way.
 * - Cards only (wallets ride on cards), so there is no delayed settlement for the webhook to wait on (§5.3).
 * - Stripe Tax computes the tax (`automatic_tax`); the address Checkout collects is saved to the customer.
 *   The pack's Price MUST be tax-EXCLUSIVE (`tax_behavior: exclusive`): the webhook grants only when the total
 *   less tax is the pack's price, so an inclusive Price would be refused as `amount` whenever tax applies.
 * - The return URLs come from the configured origin, never a request header (§5.1, open redirect).
 */
export type CheckoutInput = {
  userId: string;
  customerId: string;
  packId: PackId;
  priceId: string;
  origin: string;
};

/**
 * What a card statement says after the account's shortened descriptor (`FEATHERWT`, set in the Dashboard): the
 * suffix Stripe joins as `FEATHERWT* THE 99`. The Stripe account is shared with Concert Crawl, so without it a
 * The 99 charge reads as the account's default and is the kind a cardholder fails to recognise and disputes (a
 * dispute revokes the credits). Stripe's limits: the whole descriptor is at most 22 characters, with no
 * `< > \ ' " *`, and at least one letter in the suffix. A pack's PaymentIntent takes it directly. A plan's
 * charges are raised by Billing, where Checkout has no descriptor field and a subscription's PaymentIntent cannot
 * be set; its descriptor is the plan Product's own `statement_descriptor` (a Stripe setting, not code).
 */
export const STATEMENT_DESCRIPTOR_SUFFIX = "THE 99";

/** Where Checkout sends the player back to: the billing page, which reads our database and grants nothing. */
export const CHECKOUT_RETURN_PATH = "/credits";

export function packCheckoutParams(input: CheckoutInput): Stripe.Checkout.SessionCreateParams {
  const metadata = { app: PAYMENTS_APP, pack: input.packId, user_id: input.userId };
  const back = `${input.origin}${CHECKOUT_RETURN_PATH}`;
  return {
    mode: "payment",
    line_items: [{ price: input.priceId, quantity: 1 }],
    customer: input.customerId,
    client_reference_id: input.userId,
    metadata,
    payment_intent_data: { metadata, statement_descriptor_suffix: STATEMENT_DESCRIPTOR_SUFFIX },
    payment_method_types: ["card"],
    automatic_tax: { enabled: true },
    customer_update: { address: "auto" },
    // `{CHECKOUT_SESSION_ID}` is Stripe's own template, filled in on the redirect. It is written literally, never
    // through URLSearchParams or encodeURIComponent: an encoded brace is not substituted.
    success_url: `${back}?checkout=done&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${back}?checkout=cancelled`,
  };
}

/**
 * The app's own origin, from `APP_ORIGIN` (for example `https://the-99.dev`), or null when it is unset or
 * not a bare origin. `https` everywhere, except `http://localhost` outside production, for a local server.
 * A value with a path, a query or credentials is refused rather than trimmed: it is a misconfiguration.
 */
export function appOrigin(value: string | undefined, label: string | undefined): string | null {
  const raw = value?.trim() ?? "";
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.username || url.password || url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")) return null;
  if (raw.replace(/\/$/, "") !== url.origin) return null;
  const local = url.protocol === "http:" && url.hostname === "localhost" && label?.trim() !== "production";
  if (url.protocol !== "https:" && !local) return null;
  return url.origin;
}

/** A pack's Price id in this mode, or null while its variable is unset. */
export function priceIdFor(packId: PackId, env: Record<string, string | undefined>): string | null {
  return env[PACKS[packId].priceEnv]?.trim() || null;
}

export type PlanCheckoutInput = { userId: string; customerId: string; planId: PlanId; priceId: string; origin: string };

/**
 * What a Checkout Session for the plan is created with. Pure, and the twin of `packCheckoutParams`: subscription
 * mode, the same customer, cards only, Stripe Tax, the same return URLs. `subscription_data.metadata` is what makes
 * the SUBSCRIPTION and every invoice it raises attributable (an invoice carries a snapshot of it in
 * `parent.subscription_details.metadata`), because the session's own metadata stops at the session.
 */
export function planCheckoutParams(input: PlanCheckoutInput): Stripe.Checkout.SessionCreateParams {
  const metadata = { app: PAYMENTS_APP, plan: input.planId, user_id: input.userId };
  const back = `${input.origin}${CHECKOUT_RETURN_PATH}`;
  return {
    mode: PLANS[input.planId].mode,
    line_items: [{ price: input.priceId, quantity: 1 }],
    customer: input.customerId,
    client_reference_id: input.userId,
    metadata,
    subscription_data: { metadata },
    payment_method_types: ["card"],
    automatic_tax: { enabled: true },
    customer_update: { address: "auto" },
    success_url: `${back}?checkout=done&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${back}?checkout=cancelled`,
  };
}

/** The plan's Price id in this mode, or null while its variable is unset (the plan is then not on sale). */
export function planPriceIdFor(planId: PlanId, env: Record<string, string | undefined>): string | null {
  return env[PLANS[planId].priceEnv]?.trim() || null;
}
