import { EXPIRY_WARNING_MS } from "../model/credit-line";
import { holdsPlan, isEnded } from "./subscription-rule";

/**
 * Which plan card /credits draws (buying credits U3b, frames K1 to K6). Pure: the page reads the reader's newest
 * subscription row and the allowance, this decides. Our own `subscriptions` row is the webhook's copy of Stripe's,
 * so a press that changed Stripe shows here only once the webhook has written it (`reachedChange`).
 *
 *   offer     K1 / K6  no subscription, or one that ended: the offer (history keeps the months)
 *   active    K2       renews on `endsAt`, Cancel plan leads
 *   cancelled K3       cancelled in the paid month: `Ends <date>`, Keep my plan
 *   ending    K4       cancelled and within three days of the end (`EXPIRY_WARNING_MS`, the credit line's own bound)
 *   pastDue   K5       Stripe could not take the payment and is retrying; credits keep working
 */
export type PlanCardState = "offer" | "active" | "cancelled" | "ending" | "pastDue";

export type PlanSubscriptionFacts = { status: string; cancelAtPeriodEnd: boolean; currentPeriodEnd: Date | null };

export type PlanCardFacts = {
  state: PlanCardState;
  /** The date the plan renews (active, past due) or ends (cancelled, ending); null when Stripe reported none. */
  endsAt: Date | null;
  /** Whole days left on a cancelled plan, rounded up; null unless cancelled or ending. */
  days: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function planCardFacts(
  sub: PlanSubscriptionFacts | null,
  allowance: { planExpiresAt?: Date | null },
  now: Date,
): PlanCardFacts {
  if (!sub || isEnded(sub.status) || !holdsPlan(sub.status)) return { state: "offer", endsAt: null, days: null };
  if (sub.status === "past_due" || sub.status === "unpaid") return { state: "pastDue", endsAt: sub.currentPeriodEnd, days: null };
  if (!sub.cancelAtPeriodEnd) return { state: "active", endsAt: sub.currentPeriodEnd, days: null };
  // The lots' own expiry is what the credits do; the period end is what Stripe says. They agree once the webhook has run.
  const endsAt = allowance.planExpiresAt ?? sub.currentPeriodEnd;
  const ahead = endsAt ? endsAt.getTime() - now.getTime() : null;
  const soon = ahead !== null && ahead <= EXPIRY_WARNING_MS;
  return { state: soon ? "ending" : "cancelled", endsAt, days: ahead === null ? null : Math.max(0, Math.ceil(ahead / DAY_MS)) };
}

/** What a cancel or a keep press is waiting to see. */
export type PlanChange = "cancel" | "keep";

/**
 * Whether the page's state is the one a press asked for: a cancel is reached by any cancelled state (or an ended
 * plan, the offer); a keep is reached by an active plan. Until then the card shows a pending state and re-reads.
 */
export function reachedChange(change: PlanChange, state: PlanCardState): boolean {
  return change === "cancel" ? state === "cancelled" || state === "ending" || state === "offer" : state === "active";
}

/** Whether the Keep my plan and Subscribe presses are drawn: both are purchases, so a reduced page (switch off) loses them. */
export function cardPresses(state: PlanCardState, reduced: boolean): { keep: boolean; subscribe: boolean; cancel: boolean; updateCard: boolean } {
  return {
    subscribe: state === "offer" && !reduced,
    keep: (state === "cancelled" || state === "ending") && !reduced,
    cancel: state === "active" || state === "pastDue",
    updateCard: state === "active" || state === "pastDue",
  };
}
