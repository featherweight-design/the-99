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
 *
 * `cancelling` is carried apart from the state: the webhook can store cancel_at_period_end while Stripe still reports
 * past_due, and that plan is both (the payment warning, Update card, the scheduled expiry, Keep).
 */
export type PlanCardState = "offer" | "active" | "cancelled" | "ending" | "pastDue";

export type PlanSubscriptionFacts = { status: string; cancelAtPeriodEnd: boolean; currentPeriodEnd: Date | null };

export type PlanCardFacts = {
  state: PlanCardState;
  /** The plan is set to end at the period end (cancel_at_period_end on a plan-holding row), whatever its state. */
  cancelling: boolean;
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
  if (!sub || isEnded(sub.status) || !holdsPlan(sub.status)) return { state: "offer", cancelling: false, endsAt: null, days: null };
  const cancelling = sub.cancelAtPeriodEnd;
  // The lots' own expiry is what the credits do; the period end is what Stripe says. They agree once the webhook has run.
  const endsAt = cancelling ? allowance.planExpiresAt ?? sub.currentPeriodEnd : sub.currentPeriodEnd;
  const ahead = cancelling && endsAt ? endsAt.getTime() - now.getTime() : null;
  const days = ahead === null ? null : Math.max(0, Math.ceil(ahead / DAY_MS));
  if (sub.status === "past_due" || sub.status === "unpaid") return { state: "pastDue", cancelling, endsAt, days };
  if (!cancelling) return { state: "active", cancelling, endsAt, days: null };
  const soon = ahead !== null && ahead <= EXPIRY_WARNING_MS;
  return { state: soon ? "ending" : "cancelled", cancelling, endsAt, days };
}

/** What a cancel or a keep press is waiting to see. */
export type PlanChange = "cancel" | "keep";

/**
 * Whether the page is where a press asked it to be: a cancel is reached once the plan is cancelling in ANY plan-holding
 * state (past due included), or has ended (the offer); a keep once it holds a plan that is not cancelling. Until then
 * the card shows a pending state and re-reads.
 */
export function reachedChange(change: PlanChange, state: PlanCardState, cancelling: boolean): boolean {
  if (state === "offer") return change === "cancel";
  return change === "cancel" ? cancelling : !cancelling;
}

/** Whether the Keep my plan and Subscribe presses are drawn: both are purchases, so a reduced page (switch off) loses them. */
export function cardPresses(state: PlanCardState, reduced: boolean, cancelling: boolean = state === "cancelled" || state === "ending"): { keep: boolean; subscribe: boolean; cancel: boolean; updateCard: boolean } {
  return {
    subscribe: state === "offer" && !reduced,
    keep: cancelling && state !== "offer" && !reduced,
    cancel: (state === "active" || state === "pastDue") && !cancelling,
    updateCard: state === "active" || state === "pastDue",
  };
}
