import type Stripe from "stripe";
import { PAYMENTS_APP } from "./packs";

/**
 * Of the recorded PaymentIntent ids, those with no paid PaymentIntent of this app in Stripe (K2). An id the 72-hour
 * creation window did not list is asked of Stripe itself, because a record can outlive the window (an old intent
 * paid late) without being unpaid. Only Stripe's "no such PaymentIntent" counts as missing; any other failure
 * (a timeout, a rate limit, a bad key) PROPAGATES, so a transient error is never reported as a missing payment.
 */
export async function unmatchedRecords(stripe: Stripe, recorded: readonly string[], listedPaid: ReadonlySet<string>): Promise<string[]> {
  const unmatched: string[] = [];
  for (const id of recorded) {
    if (listedPaid.has(id)) continue;
    try {
      const pi = await stripe.paymentIntents.retrieve(id);
      if (pi.status !== "succeeded" || pi.metadata?.app !== PAYMENTS_APP) unmatched.push(id);
    } catch (error) {
      if ((error as { code?: unknown })?.code === "resource_missing") unmatched.push(id);
      else throw error;
    }
  }
  return unmatched;
}
