import Stripe from "stripe";
import { keyAllowed } from "./key-mode";

/**
 * The one Stripe client (payments scope §5.2). SERVER-ONLY: it reads `STRIPE_SECRET_KEY`, a
 * RESTRICTED key (Checkout Sessions and Customers write; Charges, PaymentIntents and Events read) and
 * never the account secret key. Null when the key is unset, or when its mode disagrees with this
 * deployment (`keyAllowed`): a caller then does nothing, so a misconfigured deployment is inert rather
 * than charging in the wrong mode. The API version is pinned with the package version, so a default
 * changed on Stripe's side cannot reshape the payloads under us; an upgrade is its own reviewed change.
 */
export const STRIPE_API_VERSION = "2026-08-26.dahlia" as const;

let cached: { key: string; client: Stripe } | null = null;

export function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (!keyAllowed(key, process.env.ADMIN_ENV_LABEL)) {
    console.error("[payments] the Stripe key's mode does not match this environment; payments are off");
    return null;
  }
  if (cached?.key !== key) {
    cached = { key, client: new Stripe(key, { apiVersion: STRIPE_API_VERSION, maxNetworkRetries: 2, timeout: 10_000 }) };
  }
  return cached.client;
}

/**
 * The webhook signing secrets to try, current first: `STRIPE_WEBHOOK_SECRET`, and during a roll
 * `STRIPE_WEBHOOK_SECRET_PREVIOUS`, which Stripe keeps valid for an overlap so a roll drops no event.
 */
export function webhookSecrets(): string[] {
  return [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_WEBHOOK_SECRET_PREVIOUS]
    .map((s) => s?.trim() ?? "")
    .filter((s) => s.length > 0);
}
