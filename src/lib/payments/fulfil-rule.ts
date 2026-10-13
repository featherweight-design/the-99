import { isOurSession, packForPrice, type PackId } from "./packs";

/**
 * Whether a completed Checkout Session grants credits, and to whom (payments scope §5.3, §5.5). Pure.
 * The webhook's event is only a trigger: this rule reads the Session as RETRIEVED from Stripe, never
 * the event's own copy, and grants only when every fact agrees with what the server sold.
 *
 * - Tagged as this app's (`metadata.app`, `PAYMENTS_APP`): the Stripe account is shared with Concert Crawl.
 * - Paid, in payment mode: anything else grants nothing.
 * - Exactly one line item, quantity 1, at a Price in the registry, for the pack the metadata names.
 * - The pack's currency, and an amount that is the pack's price once tax is taken off.
 * - The customer maps to an account (`stripe_customers`), and that account is the one the Session's
 *   `client_reference_id` and metadata name. A disagreement is refused, never resolved: it is a bug or
 *   an attack, and a silent "fix" hides both.
 * - A paid Session whose customer maps to NO account (deleted between paying and the webhook) is kept
 *   as `unattributed`, for Hugh to refund by hand.
 */
export type FetchedSession = {
  id: string;
  mode: string;
  paymentStatus: string;
  currency: string | null;
  amountTotal: number | null;
  amountTax: number | null;
  lineItems: readonly { priceId: string | null; quantity: number | null }[];
  customerId: string | null;
  clientReferenceId: string | null;
  metadata: Record<string, string>;
  paymentIntentId: string | null;
  country: string | null;
};

export type PaymentRecord = {
  paymentIntentId: string;
  checkoutSessionId: string;
  amountCents: number;
  taxCents: number;
  currency: string;
  country: string | null;
};

/** Why a Session granted nothing. Fixed words: these are logged, and nothing about the payer is. */
export type Refusal =
  | "not_ours" | "not_paid" | "not_payment_mode" | "no_payment_intent" | "line_items" | "unknown_price"
  | "pack_mismatch" | "currency" | "amount" | "no_customer" | "attribution";

export type Decision =
  | { kind: "grant"; userId: string; pack: PackId; units: number; record: PaymentRecord }
  | { kind: "unattributed"; record: PaymentRecord }
  | { kind: "refuse"; reason: Refusal };

export function decideFulfilment(
  s: FetchedSession,
  mappedUserId: string | null,
  env: Record<string, string | undefined>,
): Decision {
  // Checked again on the RETRIEVED Session: the route already ignores an event whose copy is untagged.
  if (!isOurSession(s.metadata)) return { kind: "refuse", reason: "not_ours" };
  if (s.mode !== "payment") return { kind: "refuse", reason: "not_payment_mode" };
  if (s.paymentStatus !== "paid") return { kind: "refuse", reason: "not_paid" };
  if (!s.paymentIntentId) return { kind: "refuse", reason: "no_payment_intent" };
  if (s.lineItems.length !== 1 || s.lineItems[0].quantity !== 1 || !s.lineItems[0].priceId) {
    return { kind: "refuse", reason: "line_items" };
  }
  const pack = packForPrice(s.lineItems[0].priceId, env);
  if (!pack) return { kind: "refuse", reason: "unknown_price" };
  if (s.metadata.pack !== pack.id) return { kind: "refuse", reason: "pack_mismatch" };
  if (s.currency !== pack.currency) return { kind: "refuse", reason: "currency" };
  const tax = s.amountTax ?? 0;
  if (s.amountTotal === null || tax < 0 || s.amountTotal - tax !== pack.priceCents) return { kind: "refuse", reason: "amount" };
  if (!s.customerId) return { kind: "refuse", reason: "no_customer" };
  const record: PaymentRecord = {
    paymentIntentId: s.paymentIntentId,
    checkoutSessionId: s.id,
    amountCents: s.amountTotal,
    taxCents: tax,
    currency: s.currency,
    country: s.country,
  };
  if (mappedUserId === null) return { kind: "unattributed", record };
  if (s.clientReferenceId !== mappedUserId || s.metadata.user_id !== mappedUserId) {
    return { kind: "refuse", reason: "attribution" };
  }
  return { kind: "grant", userId: mappedUserId, pack: pack.id, units: pack.units, record };
}
