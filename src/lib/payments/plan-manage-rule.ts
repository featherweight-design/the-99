import { isOurSession } from "./packs";
import { holdsPlan } from "./subscription-rule";

/**
 * Whether the viewer's plan subscription may have its `cancel_at_period_end` set to `cancel` (E4). Pure. It reads the
 * subscription as RE-READ from Stripe, never our own row: the Stripe account is shared with Concert Crawl, and our row
 * is only how we found the id.
 *
 * - `foreign`: not tagged as this app's, or tagged for another account. Never written.
 * - `ended`: the status holds no plan (canceled, incomplete_expired), so there is nothing to cancel or keep.
 * - `unchanged`: already the requested state. Idempotent, not an error.
 * - `apply`: write it.
 */
export type PlanChangeDecision = "apply" | "unchanged" | "foreign" | "ended";

export function decidePlanChange(
  sub: { status: string; metadata: Record<string, string> | null | undefined; cancel_at_period_end: boolean },
  viewerId: string,
  cancel: boolean,
): PlanChangeDecision {
  if (!isOurSession(sub.metadata) || sub.metadata?.user_id !== viewerId) return "foreign";
  if (!holdsPlan(sub.status)) return "ended";
  return sub.cancel_at_period_end === cancel ? "unchanged" : "apply";
}

/** Whether a Customer as re-read from Stripe is this app's and this account's, before a portal Session is made for it. */
export function customerIsViewers(customer: { metadata?: Record<string, string> | null }, viewerId: string): boolean {
  return isOurSession(customer.metadata) && customer.metadata?.user_id === viewerId;
}

/** `STRIPE_PORTAL_CONFIG` as a usable portal configuration id (`bpc_...`), else null. Never defaulted: unset means unconfigured. */
export function portalConfigId(value: string | undefined): string | null {
  const v = value?.trim() ?? "";
  return /^bpc_[A-Za-z0-9]+$/.test(v) ? v : null;
}
