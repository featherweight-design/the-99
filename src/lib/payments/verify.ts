import type Stripe from "stripe";
import { webhookSecrets } from "./stripe";

/** The tolerance on a signature's timestamp, in seconds: a delivery older than this is refused as a replay. */
export const SIGNATURE_TOLERANCE_S = 300;

/**
 * Verify a webhook delivery (payments scope §5.3): the RAW body, as received, against each configured
 * signing secret, current first. Never a parsed and re-serialised body, which would not match the
 * signature. `unconfigured` when no secret is set (the route answers 503), `invalid` when no secret
 * verifies it (400), else the event.
 */
export function verifyStripeEvent(stripe: Stripe, raw: string, signature: string | null): Stripe.Event | "unconfigured" | "invalid" {
  const secrets = webhookSecrets();
  if (secrets.length === 0) return "unconfigured";
  if (!signature) return "invalid";
  for (const secret of secrets) {
    try {
      return stripe.webhooks.constructEvent(raw, signature, secret, SIGNATURE_TOLERANCE_S);
    } catch {
      // Try the next secret: during a roll the previous one still signs.
    }
  }
  return "invalid";
}
