import { describe, expect, it } from "vitest";
import {
  decideInvoice, decideSubscription, holdsPlan, isEnded, planEventTarget, planExpiry, supersedes,
  type FetchedInvoice, type FetchedSubscription, type PlanEvent,
} from "./subscription-rule";

const ENV = { STRIPE_PRICE_PLAN_50: "price_plan50" };
const NOW = new Date("2026-11-01T00:00:00Z");
const END = new Date("2026-12-01T00:00:00Z");
const TAG = { app: "the-99", plan: "plan50", user_id: "user_a" };

const sub = (over: Partial<FetchedSubscription> = {}): FetchedSubscription => ({
  id: "sub_1", status: "active", customerId: "cus_1", metadata: { ...TAG }, cancelAtPeriodEnd: false,
  currentPeriodEnd: END, priceIds: ["price_plan50"], ...over,
});
const inv = (over: Partial<FetchedInvoice> = {}): FetchedInvoice => ({
  id: "in_1", status: "paid", billingReason: "subscription_create", currency: "usd", amountPaid: 500, total: 500,
  totalExcludingTax: 500, customerId: "cus_1", subscriptionId: "sub_1", subscriptionMetadata: { ...TAG },
  lines: [{ priceId: "price_plan50", quantity: 1 }], paymentIntentId: "pi_1", country: "US", ...over,
});

describe("decideInvoice", () => {
  it("grants a plan month to the mapped account, carrying the billing reason", () => {
    const d = decideInvoice(inv(), sub(), "user_a", ENV);
    expect(d).toMatchObject({ kind: "grant", userId: "user_a", plan: "plan50", units: 50, billingReason: "subscription_create" });
    expect(d.kind === "grant" && d.record).toEqual({ paymentIntentId: "pi_1", checkoutSessionId: "in_1", amountCents: 500, taxCents: 0, currency: "usd", country: "US" });
  });

  it("grants a renewal, and counts tax apart from the price", () => {
    const d = decideInvoice(inv({ billingReason: "subscription_cycle", amountPaid: 540, total: 540 }), sub(), "user_a", ENV);
    expect(d).toMatchObject({ kind: "grant", billingReason: "subscription_cycle" });
    expect(d.kind === "grant" && d.record.taxCents).toBe(40);
  });

  it("keeps a payment from a customer with no account unattributed", () => {
    expect(decideInvoice(inv(), sub(), null, ENV).kind).toBe("unattributed");
  });

  const refusals: [string, Partial<FetchedInvoice>, Partial<FetchedSubscription>, string][] = [
    ["another app's invoice", { subscriptionMetadata: { app: "concert-crawl" } }, {}, "not_ours"],
    ["an untagged subscription", {}, { metadata: {} }, "not_ours"],
    ["an open invoice", { status: "open" }, {}, "not_paid"],
    ["a zero invoice", { amountPaid: 0, total: 0 }, {}, "not_paid"],
    ["a part-paid invoice", { amountPaid: 300 }, {}, "not_paid"],
    ["a plan change", { billingReason: "subscription_update" }, {}, "billing_reason"],
    ["a manual invoice", { billingReason: "manual" }, {}, "billing_reason"],
    ["no subscription", { subscriptionId: null }, {}, "no_subscription"],
    ["another subscription", { subscriptionId: "sub_2" }, {}, "no_subscription"],
    ["no payment intent", { paymentIntentId: null }, {}, "no_payment_intent"],
    ["two lines", { lines: [{ priceId: "price_plan50", quantity: 1 }, { priceId: "price_plan50", quantity: 1 }] }, {}, "line_items"],
    ["quantity 2", { lines: [{ priceId: "price_plan50", quantity: 2 }] }, {}, "line_items"],
    ["another Price", { lines: [{ priceId: "price_other", quantity: 1 }] }, {}, "unknown_price"],
    ["a subscription naming another plan", {}, { metadata: { ...TAG, plan: "plan999" } }, "plan_mismatch"],
    ["another currency", { currency: "eur" }, {}, "currency"],
    ["a different amount", { totalExcludingTax: 400 }, {}, "amount"],
    ["no amount", { totalExcludingTax: null }, {}, "amount"],
    ["no customer", { customerId: null }, {}, "no_customer"],
    ["a subscription of another customer", {}, { customerId: "cus_2" }, "no_customer"],
  ];
  it.each(refusals)("refuses %s", (_name, i, s, reason) => {
    expect(decideInvoice(inv(i), sub(s), "user_a", ENV)).toEqual({ kind: "refuse", reason });
  });

  it("refuses an invoice whose tags name someone else than the mapped account", () => {
    expect(decideInvoice(inv(), sub({ metadata: { ...TAG, user_id: "user_b" } }), "user_a", ENV)).toEqual({ kind: "refuse", reason: "attribution" });
    expect(decideInvoice(inv({ subscriptionMetadata: { ...TAG, user_id: "user_b" } }), sub(), "user_a", ENV)).toEqual({ kind: "refuse", reason: "attribution" });
  });

  it("knows no plan while its Price variable is unset", () => {
    expect(decideInvoice(inv(), sub(), "user_a", {})).toEqual({ kind: "refuse", reason: "unknown_price" });
  });
});

describe("decideSubscription", () => {
  it("applies a tagged subscription of a mapped account", () => {
    expect(decideSubscription(sub(), "user_a", ENV)).toEqual({ kind: "apply", userId: "user_a" });
  });
  it("ignores one whose customer maps to no account", () => {
    expect(decideSubscription(sub(), null, ENV)).toEqual({ kind: "ignored" });
  });
  it.each([
    ["another app's", { metadata: { app: "concert-crawl" } }, "not_ours"],
    ["one on another Price", { priceIds: ["price_other"] }, "unknown_price"],
    ["one with two items", { priceIds: ["price_plan50", "price_plan50"] }, "unknown_price"],
    ["one naming another plan", { metadata: { ...TAG, plan: "x" } }, "plan_mismatch"],
    ["one naming another account", { metadata: { ...TAG, user_id: "user_b" } }, "attribution"],
    ["one with no customer", { customerId: null }, "no_customer"],
  ] as const)("refuses %s", (_n, over, reason) => {
    expect(decideSubscription(sub(over), "user_a", ENV)).toEqual({ kind: "refuse", reason });
  });
});

describe("statuses", () => {
  it("ends on canceled and incomplete_expired only", () => {
    expect(["canceled", "incomplete_expired"].every(isEnded)).toBe(true);
    expect(["active", "trialing", "past_due", "unpaid", "incomplete", "paused"].some(isEnded)).toBe(false);
  });
  it("holds a plan while active, trialing, past due, unpaid or incomplete (its first payment is settling)", () => {
    expect(["active", "trialing", "past_due", "unpaid", "incomplete"].every(holdsPlan)).toBe(true);
    expect(["canceled", "incomplete_expired", "paused"].some(holdsPlan)).toBe(false);
  });
});

describe("supersedes: an older state never lowers a newer one", () => {
  const stored = (status: string, end: Date | null) => ({ status, currentPeriodEnd: end });
  it("accepts the first state", () => expect(supersedes(stored("active", END), null)).toBe(true));
  it("accepts a later period and the same period", () => {
    expect(supersedes(stored("active", new Date("2027-01-01Z")), stored("active", END))).toBe(true);
    expect(supersedes(stored("active", END), stored("active", END))).toBe(true);
  });
  it("refuses an earlier period", () => {
    expect(supersedes(stored("active", NOW), stored("active", END))).toBe(false);
  });
  it("lets an ended state replace a live one, whatever its period", () => {
    expect(supersedes(stored("canceled", NOW), stored("active", END))).toBe(true);
  });
  it("never lets anything replace an ended subscription", () => {
    expect(supersedes(stored("active", new Date("2030-01-01Z")), stored("canceled", END))).toBe(false);
  });
});

describe("planExpiry: what a state does to the plan lots", () => {
  const s = (over: Record<string, unknown>) => ({ status: "active", cancelAtPeriodEnd: false, currentPeriodEnd: END, ...over }) as Parameters<typeof planExpiry>[0];
  it("clears the expiry while the plan is held and not cancelling (a keep, a renewal, a resubscribe)", () => {
    expect(planExpiry(s({}), NOW)).toEqual({ action: "clear" });
    expect(planExpiry(s({ status: "past_due" }), NOW)).toEqual({ action: "clear" });
  });
  it("sets the period end when cancelling at period end", () => {
    expect(planExpiry(s({ cancelAtPeriodEnd: true }), NOW)).toEqual({ action: "set", at: END });
  });
  it("sets the period end for an ended subscription when it is still ahead, else now", () => {
    expect(planExpiry(s({ status: "canceled" }), NOW)).toEqual({ action: "set", at: END });
    expect(planExpiry(s({ status: "canceled", currentPeriodEnd: new Date("2026-10-01Z") }), NOW)).toEqual({ action: "set", at: NOW });
    expect(planExpiry(s({ status: "canceled", currentPeriodEnd: null }), NOW)).toEqual({ action: "set", at: NOW });
  });
  it("expires a cancelling plan with no period end now", () => {
    expect(planExpiry(s({ cancelAtPeriodEnd: true, currentPeriodEnd: null }), NOW)).toEqual({ action: "set", at: NOW });
  });
});

describe("planEventTarget: another app's objects are not ours", () => {
  const invoiceEvent = (app: string | undefined, subscription: unknown = "sub_1") => ({
    type: "invoice.paid",
    data: { object: { id: "in_1", parent: { subscription_details: { metadata: app ? { app } : {}, subscription } } } },
  }) as unknown as PlanEvent;
  const subEvent = (app: string | undefined) => ({ type: "customer.subscription.updated", data: { object: { id: "sub_1", metadata: app ? { app } : {} } } }) as unknown as PlanEvent;

  it("names the subscription (and the invoice) of a tagged event", () => {
    expect(planEventTarget(invoiceEvent("the-99"))).toEqual({ subscriptionId: "sub_1", invoiceId: "in_1" });
    expect(planEventTarget(invoiceEvent("the-99", { id: "sub_9" }))).toEqual({ subscriptionId: "sub_9", invoiceId: "in_1" });
    expect(planEventTarget(subEvent("the-99"))).toEqual({ subscriptionId: "sub_1", invoiceId: null });
  });
  it("is null for an untagged or foreign event, and for an invoice with no subscription", () => {
    expect(planEventTarget(invoiceEvent("concert-crawl"))).toBeNull();
    expect(planEventTarget(invoiceEvent(undefined))).toBeNull();
    expect(planEventTarget(invoiceEvent("the-99", null))).toBeNull();
    expect(planEventTarget(subEvent("concert-crawl"))).toBeNull();
    expect(planEventTarget(subEvent(undefined))).toBeNull();
  });
});
