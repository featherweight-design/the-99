// The admin Payments tab's figures (admin plan A-R6), as pure rules over the rows `admin-read.ts` reads.

/**
 * One currency's payments in the month, as the revenue query groups them. `refundedCents` is what Stripe refunded
 * against those payments (K2's `credit_grants.refunded_cents`, the charge's cumulative refund, tax included), and
 * `refundedTaxCents` the tax inside it: each payment's refund carries its own share of that payment's tax.
 */
export type RevenueRow = {
  currency: string;
  payments: number;
  grossCents: number;
  taxCents: number;
  unattributed: number;
  refundedCents: number;
  refundedTaxCents: number;
};

/** One currency's revenue: what Stripe took in (gross), the tax inside it, and what is left (net). */
export type Revenue = RevenueRow & { netCents: number };

/**
 * Net is what was kept: gross less tax, less what was refunded net of the tax that went back with it. A refund is
 * counted in the month of the payment it refunds. A refund is read through the payment's lot, so it reads as 0 once
 * the purge deletes that lot, and for an unattributed payment, which has none (`docs/agents/payments.md`). Currencies are never summed together: each is its own row, largest
 * gross first.
 */
export function revenueOf(rows: readonly RevenueRow[]): Revenue[] {
  return rows
    .map((r) => ({ ...r, netCents: r.grossCents - r.taxCents - (r.refundedCents - r.refundedTaxCents) }))
    .sort((a, b) => b.grossCents - a.grossCents || a.currency.localeCompare(b.currency));
}

/** Cents as the admin pages draw money: `$12.34`, or the code and the amount for a currency other than USD. */
export function money(cents: number, currency: string): string {
  const amount = (cents / 100).toFixed(2);
  return currency.toLowerCase() === "usd" ? `$${amount}` : `${amount} ${currency.toUpperCase()}`;
}
