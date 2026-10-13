import type { NextRequest } from "next/server";
import { fulfilCheckoutSession, paymentsConfigured } from "../../../lib/payments/fulfil";
import { isOurSession } from "../../../lib/payments/packs";
import { verifyStripeEvent } from "../../../lib/payments/verify";
import { stripeClient } from "../../../lib/payments/stripe";

// Pin to Node: the Stripe SDK and the neon-serverless websocket driver do not run on Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe's webhook endpoint (payments scope §5.3). Public in `src/proxy.ts`, because Stripe calls it
 * with no session; what authorizes it is the signature, checked on the RAW body against the endpoint
 * secret on every call. It reads no feature switch, and must never: a payment already taken is processed
 * even while sales are stopped (stopping sales is the Checkout side's switch, from K1b).
 *
 * - No signing secret: 503, nothing runs. A completed Checkout of OURS with no usable key for this
 *   environment, or a pack's Price variable unset, is 503 too, so Stripe retries it; another app's is
 *   still 200 (below), because verifying a signature needs no key.
 * - A missing, forged or stale signature (5-minute tolerance): 400, nothing runs.
 * - An event type it does not handle: 200 and ignored, so subscribing to more cannot break it.
 * - A Session that is not this app's (`metadata.app`; the account is shared with Concert Crawl): 200 and
 *   ignored, before anything else is read.
 * - `checkout.session.completed`: the Session is retrieved from Stripe and judged there
 *   (`fulfilCheckoutSession`). A grant, a duplicate, an unattributed payment and a refusal all answer
 *   200, because retrying a mismatch cannot heal it; a failure to reach Stripe or the database answers
 *   500, and Stripe retries for up to three days.
 *
 * Logs carry the event type and the outcome in fixed words: never the payload, an id, an email or an
 * amount.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  // Signatures need no API key, so the key is asked for only once a Session is known to be ours: another
  // app's is acknowledged even where this deployment has no usable key.
  const verified = verifyStripeEvent(raw, req.headers.get("stripe-signature"));
  if (verified === "unconfigured") return new Response("Webhook not configured", { status: 503 });
  if (verified === "invalid") {
    console.warn("[stripe-webhook] signature refused");
    return new Response("Webhook verification failed", { status: 400 });
  }
  const event = verified;
  if (event.type !== "checkout.session.completed") return new Response("Ignored", { status: 200 });
  // The Stripe account is shared with Concert Crawl, and this endpoint receives their Sessions too. One
  // not tagged as ours is acknowledged and left alone: no retrieve, no record, and never a 503, which
  // would have Stripe retry another app's payment for days. The event's own copy is enough to decide that
  // (the event is signed); granting still reads the retrieved Session. One fixed line says it happened,
  // so a Session of ours that lost its tag shows in the logs rather than vanishing.
  if (!isOurSession(event.data.object.metadata)) {
    console.info(`[stripe-webhook] ${event.type}: not this app's Session; ignored`);
    return new Response("Ignored", { status: 200 });
  }
  const stripe = stripeClient();
  if (!stripe) {
    console.error(`[stripe-webhook] ${event.type}: no usable Stripe key for this environment; Stripe will retry`);
    return new Response("Webhook not configured", { status: 503 });
  }
  // One of OURS with a pack's Price variable unset: it cannot be judged, and refusing it would record
  // the event and lose a real payment for good. 503, so Stripe retries once the variable is back.
  if (!paymentsConfigured()) {
    console.error(`[stripe-webhook] ${event.type}: a pack's Price is not configured; Stripe will retry`);
    return new Response("Webhook not configured", { status: 503 });
  }
  try {
    const { outcome, reason } = await fulfilCheckoutSession(stripe, event.id, event.type, event.data.object.id);
    if (outcome === "refuse") console.error(`[stripe-webhook] ${event.type}: refused (${reason}); nothing granted`);
    else if (outcome === "unattributed") console.error(`[stripe-webhook] ${event.type}: paid by a customer with no account; recorded unattributed, refund by hand`);
    else console.info(`[stripe-webhook] ${event.type}: ${outcome}`);
    return new Response("OK", { status: 200 });
  } catch (error) {
    // A fixed message and the SQLSTATE alone: a driver or Stripe error's message can carry ids.
    const code = (error as { cause?: { code?: unknown }; code?: unknown })?.cause?.code ?? (error as { code?: unknown })?.code;
    console.error(`[stripe-webhook] ${event.type}: failed${typeof code === "string" && /^[0-9A-Z]{5}$/.test(code) ? ` (${code})` : ""}; Stripe will retry`);
    return new Response("Failed", { status: 500 });
  }
}
