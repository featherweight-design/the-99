// The admin Payments tab's figures (admin plan A-R6), as pure rules over the rows `admin-read.ts` reads.

/** One currency's payments in the month, as the revenue query groups them. */
export type RevenueRow = { currency: string; payments: number; grossCents: number; taxCents: number; unattributed: number };

/** One currency's revenue: what Stripe took in (gross), the tax inside it, and what is left (net). */
export type Revenue = RevenueRow & { netCents: number };

/**
 * Net is gross less tax. Refunds subtract in A3, from K2's `credit_grants.refunded_cents`; until then a refunded
 * payment still counts here. Currencies are never summed together: each is its own row, largest gross first.
 */
export function revenueOf(rows: readonly RevenueRow[]): Revenue[] {
  return rows
    .map((r) => ({ ...r, netCents: r.grossCents - r.taxCents }))
    .sort((a, b) => b.grossCents - a.grossCents || a.currency.localeCompare(b.currency));
}

/** Cents as the admin pages draw money: `$12.34`, or the code and the amount for a currency other than USD. */
export function money(cents: number, currency: string): string {
  const amount = (cents / 100).toFixed(2);
  return currency.toLowerCase() === "usd" ? `$${amount}` : `${amount} ${currency.toUpperCase()}`;
}
