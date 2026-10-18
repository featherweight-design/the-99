import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

vi.mock("../../db", () => ({ db: {} }));

import { reverseCharge, type GrantRow, type ReverseStore, type ReverseTx } from "./reverse";
import { decideInvoice } from "./subscription-rule";
import type { DisputeStatus } from "./refund-rule";

// K2's refund path against a PLAN lot. The payment record and the lot are the ones `decideInvoice` produces for an
// invoice, and the fake looks them up by the SAME keys the real port does (payment_intent_id, then
// checkout_session_id = credit_grants.external_id), so a mismatch between the two halves fails here.
const NOW = new Date("2026-11-10T12:00:00Z");
const decision = decideInvoice(
  {
    id: "in_1", status: "paid", billingReason: "subscription_create", currency: "usd", amountPaid: 500, total: 500, totalExcludingTax: 500,
    customerId: "cus_1", subscriptionId: "sub_1", subscriptionMetadata: { app: "the-99", plan: "plan60", user_id: "user_a" },
    lines: [{ priceId: "price_plan60", quantity: 1 }], paymentIntentId: "pi_inv1", country: "US",
  },
  { id: "sub_1", status: "active", customerId: "cus_1", metadata: { app: "the-99", plan: "plan60", user_id: "user_a" }, cancelAtPeriodEnd: false, currentPeriodEnd: NOW, priceIds: ["price_plan60"] },
  "user_a", { STRIPE_PRICE_PLAN_60: "price_plan60" },
);
if (decision.kind !== "grant") throw new Error("fixture must grant");

const world = {
  events: new Set<string>(), records: new Map<string, { checkoutSessionId: string }>(), lots: new Map<string, GrantRow>(),
  disputes: new Map<string, { pi: string; status: DisputeStatus; unitsRevoked: number }>(), blocked: false,
};
function reset() {
  world.events = new Set(); world.disputes = new Map(); world.blocked = false;
  world.records = new Map([[decision.kind === "grant" ? decision.record.paymentIntentId : "", { checkoutSessionId: decision.kind === "grant" ? decision.record.checkoutSessionId : "" }]]);
  // The lot as `fulfilInvoice` writes it: external_id = the invoice id.
  world.lots = new Map([["in_1", { id: "g1", userId: "user_a", units: decision.kind === "grant" ? decision.units : 0, revokedUnits: 0, unrecoveredUnits: 0, refundedCents: 0 }]]);
}

const tx: ReverseTx = {
  async insertEvent(id) { if (world.events.has(id)) return false; world.events.add(id); return true; },
  async paymentRecord(pi) { return world.records.get(pi) ?? null; },
  async grantOwner(key) { return world.lots.get(key)?.userId ?? null; },
  async lockPlayer() {},
  async blockPurchases() { world.blocked = true; },
  async lockGrant(key) { return world.lots.get(key) ?? null; },
  async ledgerRows() { return []; },
  async otherDisputes(pi, except) { return [...world.disputes.entries()].filter(([id, d]) => d.pi === pi && id !== except).map(([, d]) => d.status); },
  async dispute(id) { const d = world.disputes.get(id); return d ? { status: d.status, unitsRevoked: d.unitsRevoked } : null; },
  async advanceDispute(id, pi, status, units) {
    const d = world.disputes.get(id);
    if (!d) { world.disputes.set(id, { pi, status, unitsRevoked: units }); return true; }
    if (d.status === "open") d.status = status;
    return false;
  },
  async setRevocation(_id, revoked, unrecovered, claim) {
    const lot = world.lots.get("in_1")!;
    lot.revokedUnits = revoked; lot.unrecoveredUnits = unrecovered; lot.refundedCents = Math.max(lot.refundedCents, claim);
  },
};
const store: ReverseStore = {
  async eventSeen(id) { return world.events.has(id); },
  async paymentRecord(pi) { return world.records.get(pi) ?? null; },
  async recordEvent(id) { if (world.events.has(id)) return false; world.events.add(id); return true; },
  transaction: (run) => run(tx),
};

const charge = { refunded: 0, meta: {} as Record<string, string> };
const status: Record<string, string> = {};
const stripe = {
  // An invoice's charge: its PaymentIntent carries NO app tag (subscription metadata stays on the subscription).
  charges: { retrieve: vi.fn(async () => ({ id: "ch_1", payment_intent: "pi_inv1", amount: 500, amount_refunded: charge.refunded, created: Math.floor(NOW.getTime() / 1000) - 60 })) },
  disputes: { retrieve: vi.fn(async (id: string) => ({ id, charge: "ch_1", payment_intent: "pi_inv1", status: status[id] ?? "needs_response" })) },
  paymentIntents: { retrieve: vi.fn(async () => ({ id: "pi_inv1", metadata: charge.meta })) },
} as unknown as Stripe;

const refund = (cumulative: number, eventId: string) => { charge.refunded = cumulative; return reverseCharge(stripe, eventId, "charge.refunded", "ch_1", NOW, store); };
beforeEach(() => { reset(); charge.refunded = 0; charge.meta = {}; for (const k of Object.keys(status)) delete status[k]; });

describe("K2's reversal against a plan lot", () => {
  it("links the payment record to the lot by the invoice id", () => {
    expect(decision.kind === "grant" && decision.record.checkoutSessionId).toBe("in_1");
  });

  it("a full refund of the invoice's charge revokes the whole plan lot", async () => {
    expect(await refund(500, "evt_full")).toEqual({ outcome: "refund", shortfall: false });
    expect(world.lots.get("in_1")?.revokedUnits).toBe(60);
  });

  it("a partial refund revokes pro rata: $2.50 of $5.00 takes 30 of 60", async () => {
    expect((await refund(250, "evt_half")).outcome).toBe("refund");
    expect(world.lots.get("in_1")?.revokedUnits).toBe(30);
    expect((await refund(250, "evt_half")).outcome).toBe("duplicate");
  });

  it("is decided as ours by the payment record alone, though the invoice's PaymentIntent carries no tag", async () => {
    charge.meta = {};
    await refund(500, "evt_full");
    expect(vi.mocked(stripe.paymentIntents.retrieve)).not.toHaveBeenCalled();
  });

  it("a dispute revokes the plan lot and blocks buying; a win gives it back", async () => {
    status.dp_1 = "needs_response";
    expect((await reverseCharge(stripe, "evt_d1", "charge.dispute.created", "dp_1", NOW, store)).outcome).toBe("dispute_opened");
    expect(world.lots.get("in_1")?.revokedUnits).toBe(60);
    expect(world.blocked).toBe(true);
    status.dp_1 = "won";
    expect((await reverseCharge(stripe, "evt_d2", "charge.dispute.closed", "dp_1", NOW, store)).outcome).toBe("dispute_won");
    expect(world.lots.get("in_1")?.revokedUnits).toBe(0);
  });

  it("a lost dispute keeps the plan lot revoked", async () => {
    status.dp_2 = "needs_response";
    await reverseCharge(stripe, "evt_d3", "charge.dispute.created", "dp_2", NOW, store);
    status.dp_2 = "lost";
    expect((await reverseCharge(stripe, "evt_d4", "charge.dispute.closed", "dp_2", NOW, store)).outcome).toBe("dispute_lost");
    expect(world.lots.get("in_1")?.revokedUnits).toBe(60);
  });

  // KNOWN GAP, pinned so a change is deliberate: before the invoice's payment record exists, a refund is judged by the
  // PaymentIntent's tag, and an invoice's PaymentIntent has none (the subscription's metadata is not copied onto it).
  it("ignores a refund that beats the invoice's record, since the invoice's PaymentIntent is untagged", async () => {
    world.records.clear();
    expect((await refund(500, "evt_early")).outcome).toBe("ignored");
  });
});
