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

/**
 * Of the recorded INVOICE ids (a plan month's payment record is keyed by its invoice, `in_…`), those that are not a
 * paid invoice of this app's subscription. An invoice's PaymentIntent carries no app tag, so the tag is read off the
 * subscription's metadata snapshot on the invoice. Same failure rule as `unmatchedRecords`: only "no such invoice"
 * counts as missing.
 */
export async function unmatchedInvoices(stripe: Stripe, recorded: readonly string[]): Promise<string[]> {
  const unmatched: string[] = [];
  for (const id of recorded) {
    try {
      const inv = await stripe.invoices.retrieve(id);
      if (inv.status !== "paid" || inv.parent?.subscription_details?.metadata?.app !== PAYMENTS_APP) unmatched.push(id);
    } catch (error) {
      if ((error as { code?: unknown })?.code === "resource_missing") unmatched.push(id);
      else throw error;
    }
  }
  return unmatched;
}
