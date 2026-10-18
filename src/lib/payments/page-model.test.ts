import { describe, expect, it } from "vitest";
import { packOffers } from "../copy/credits-page";
import { buildCreditsModel, type AllowanceFacts } from "./page-model";
import type { CreditHistoryRow } from "./return";

const allowance = (over: Partial<AllowanceFacts> = {}): AllowanceFacts => ({ used: 2, limit: 5, nextAt: new Date("2026-10-17T09:01:00Z"), ...over });
const row = (over: Partial<CreditHistoryRow> = {}): CreditHistoryRow => ({
  id: "g1", source: "pack", units: 40, revokedUnits: 0, createdAt: new Date("2026-10-02T12:00:00Z"), externalId: "cs_test_1", amountCents: 531, currency: "usd", ...over,
});
const offers = packOffers();
const model = (input: Parameters<typeof buildCreditsModel>[0]) => {
  const r = buildCreditsModel(input);
  if (!r.sees) throw new Error("not seen");
  return r.model;
};

describe("buildCreditsModel: who sees the page", () => {
  it("is not found with the switch off, nothing held and nothing ever bought", () => {
    expect(buildCreditsModel({ switchOn: false, allowance: allowance(), history: [], offers })).toEqual({ sees: false });
    expect(buildCreditsModel({ switchOn: false, allowance: allowance({ plan: 0, pack: 0 }), history: [], offers })).toEqual({ sees: false });
  });

  it("is seen with the switch on, held, or ever bought", () => {
    expect(buildCreditsModel({ switchOn: true, allowance: allowance(), history: [], offers }).sees).toBe(true);
    expect(buildCreditsModel({ switchOn: false, allowance: allowance({ pack: 3 }), history: [], offers }).sees).toBe(true);
    expect(buildCreditsModel({ switchOn: false, allowance: allowance(), history: [row()], offers }).sees).toBe(true);
  });

  it("is seen, without offers, by a first-time buyer whose switch turned off mid-purchase (returning)", () => {
    const r = buildCreditsModel({ switchOn: false, allowance: allowance(), history: [], offers, returning: true });
    expect(r.sees && r.model.offers).toBeNull();
  });
});

describe("buildCreditsModel: offers (O4)", () => {
  it("draws offers only with the switch on, and null, never an empty list, with it off", () => {
    expect(model({ switchOn: true, allowance: allowance(), history: [], offers }).offers).toEqual(offers);
    expect(model({ switchOn: false, allowance: allowance({ pack: 12 }), history: [row()], offers }).offers).toBeNull();
  });

  it("B1: a pause takes the offers away and raises the band, and only while the switch is on", () => {
    const paused = model({ switchOn: true, allowance: allowance({ pack: 12 }), history: [row()], offers, blocked: true });
    expect([paused.offers, paused.paused]).toEqual([null, true]);
    const off = model({ switchOn: false, allowance: allowance({ pack: 12 }), history: [row()], offers, blocked: true });
    expect([off.offers, off.paused]).toEqual([null, false]);
    expect(model({ switchOn: true, allowance: allowance(), history: [], offers }).paused).toBe(false);
  });
});

describe("buildCreditsModel: cells", () => {
  it("never draws an empty Plan or Packs cell for a reader who never bought", () => {
    const m = model({ switchOn: true, allowance: allowance(), history: [], offers });
    expect(m.cells).toEqual([{ key: "free", value: 3 }]);
    expect(m.total).toBe(3);
  });

  it("draws Packs once held, in spend order after Free, and totals every source", () => {
    const m = model({ switchOn: true, allowance: allowance({ pack: 40 }), history: [row()], offers });
    expect(m.cells).toEqual([{ key: "free", value: 3 }, { key: "pack", value: 40 }]);
    expect(m.total).toBe(43);
  });

  it("keeps a source's cell once held, even at zero, and draws a plan cell only for a plan", () => {
    const spent = model({ switchOn: true, allowance: allowance({ pack: 0 }), history: [row()], offers });
    expect(spent.cells.map((c) => c.key)).toEqual(["free", "pack"]);
    const both = model({ switchOn: true, allowance: allowance({ plan: 74, pack: 40 }), history: [row(), row({ id: "g2", source: "plan", units: 60, externalId: "in_1" })], offers });
    expect(both.cells.map((c) => c.key)).toEqual(["free", "plan", "pack"]);
    expect(both.total).toBe(3 + 74 + 40);
  });

  it("counts free as never below zero and names when the next one returns", () => {
    const m = model({ switchOn: true, allowance: allowance({ used: 9, limit: 5 }), history: [], offers });
    expect(m.freeLeft).toBe(0);
    expect(m.nextAtMs).toBe(Date.parse("2026-10-17T09:01:00Z"));
    expect(model({ switchOn: true, allowance: allowance({ nextAt: null }), history: [], offers }).nextAtMs).toBeNull();
  });
});

describe("buildCreditsModel: history", () => {
  it("labels a pack, prices it from the registry, and keys its receipt by the Checkout Session", () => {
    const [h] = model({ switchOn: true, allowance: allowance(), history: [row()], offers }).history;
    expect(h).toMatchObject({ date: "Oct 2", label: "Credit pack", units: 40, amount: "$5.31", sessionId: "cs_test_1" });
  });

  it("draws what was PAID, never the registry's price: a lot with no payment record draws no amount", () => {
    const [h] = model({ switchOn: true, allowance: allowance(), history: [row({ amountCents: null, currency: null })], offers }).history;
    expect(h).toMatchObject({ amount: null, sessionId: "cs_test_1" });
    const [paid] = model({ switchOn: true, allowance: allowance(), history: [row({ amountCents: 1250 })], offers }).history;
    expect(paid.amount).toBe("$12.50");
  });

  it("draws no amount for a currency it does not format, and no receipt for a lot with no Session id", () => {
    const [h] = model({ switchOn: true, allowance: allowance(), history: [row({ currency: "eur", externalId: null })], offers }).history;
    expect(h).toMatchObject({ amount: null, sessionId: null });
  });
});

describe("buildCreditsModel: a welcome lot (D1)", () => {
  it("is held, so the page is seen with the switch off, and its cell sits after Free and counts in the total", () => {
    // Welcome alone: it is the only thing that makes the page visible with the switch off (a pack would satisfy the old gate).
    const only = model({ switchOn: false, allowance: allowance({ welcome: 15 }), history: [], offers });
    expect(only.cells.map((c) => c.key)).toEqual(["free", "welcome"]);
    const m = model({ switchOn: false, allowance: allowance({ welcome: 15, pack: 4 }), history: [], offers });
    expect(m.cells.map((c) => c.key)).toEqual(["free", "welcome", "pack"]);
    expect(m.total).toBe(3 + 15 + 4);
  });

  it("draws no cell once the lot is spent: it is never bought, so there is no empty cell to explain", () => {
    const m = model({ switchOn: true, allowance: allowance({ welcome: 0 }), history: [], offers });
    expect(m.cells.map((c) => c.key)).toEqual(["free"]);
  });
});

describe("buildCreditsModel: an admin's gift (admin plan A-R5)", () => {
  it("draws its cell in spend order, after plan and before pack, only while it holds a credit, and counts it in the total", () => {
    const m = model({ switchOn: true, allowance: allowance({ welcome: 2, plan: 3, gift: 5, pack: 4 }), history: [], offers });
    expect(m.cells.map((c) => c.key)).toEqual(["free", "welcome", "plan", "gift", "pack"]);
    expect(m.total).toBe(3 + 2 + 3 + 5 + 4);
    expect(model({ switchOn: true, allowance: allowance({ gift: 0 }), history: [], offers }).cells.map((c) => c.key)).toEqual(["free"]);
  });
});

describe("buildCreditsModel: the plan card and plan history", () => {
  const NOW = new Date("2026-11-14T12:00:00Z");
  const DAY = 24 * 60 * 60 * 1000;
  const end = (days: number) => new Date(NOW.getTime() + days * DAY);
  const sub = (status: string, cancel: boolean, days: number) => ({ status, cancelAtPeriodEnd: cancel, currentPeriodEnd: end(days) });

  it("K1: no subscription, switch on: the offer, sized from the registry", () => {
    expect(model({ switchOn: true, allowance: allowance(), history: [], offers, now: NOW }).plan).toEqual({
      state: "offer", cancelling: false, offer: { id: "plan60", units: 60, price: "$5" }, on: null, credits: 0, days: null,
    });
  });

  it("O1 to O4: no offer while the switch is off", () => {
    expect(model({ switchOn: false, allowance: allowance({ pack: 5 }), history: [], offers, now: NOW }).plan).toBeNull();
  });

  it("K2: the renewal date is long-form UTC and the credit count is what is held", () => {
    const m = model({ switchOn: true, allowance: allowance({ plan: 74 }), history: [], offers, now: NOW, subscription: sub("active", false, 2) });
    expect(m.plan).toMatchObject({ state: "active", on: "November 16", credits: 74 });
  });

  it("a plan held with the switch off keeps its card (O2): the reduced page manages it", () => {
    const m = model({ switchOn: false, allowance: allowance({ plan: 74 }), history: [], offers, now: NOW, subscription: sub("active", false, 20) });
    expect(m.plan?.state).toBe("active");
    expect(m.offers).toBeNull();
  });

  it("K3/K4: a cancelled plan states the credits that lapse, which can be fewer than the plan credits held", () => {
    const m = model({ switchOn: true, allowance: allowance({ plan: 120, planExpiring: 60, planExpiresAt: end(2) }), history: [], offers, now: NOW, subscription: sub("active", true, 2) });
    expect(m.plan).toMatchObject({ state: "ending", credits: 60, days: 2, on: "November 16" });
  });

  it("K6: an ended subscription is the offer again, and the history keeps the months", () => {
    const history = [row({ id: "g2", source: "plan", externalId: "in_2", billingReason: "subscription_cycle" }), row({ id: "g1", source: "plan", externalId: "in_1", billingReason: "subscription_create" })];
    const m = model({ switchOn: true, allowance: allowance(), history, offers, now: NOW, subscription: sub("canceled", false, -1) });
    expect(m.plan?.state).toBe("offer");
    expect(m.history.map((h) => h.label)).toEqual(["Monthly plan", "Monthly plan, first month"]);
  });

  it("E7: the first invoice is labelled by the stored billing reason, never by position", () => {
    const m = model({ switchOn: true, allowance: allowance(), offers, now: NOW, history: [
      row({ id: "a", source: "plan", externalId: "in_a", billingReason: "subscription_create" }),
      row({ id: "b", source: "plan", externalId: "in_b", billingReason: null }),
      row({ id: "c", source: "pack", externalId: "cs_c" }),
    ] });
    expect(m.history.map((h) => h.label)).toEqual(["Monthly plan, first month", "Monthly plan", "Credit pack"]);
  });

  it("a plan month's Receipt is fetched by its invoice id, a pack's by its Session", () => {
    const m = model({ switchOn: true, allowance: allowance(), offers, now: NOW, history: [row({ id: "a", source: "plan", externalId: "in_a" }), row({ id: "c", externalId: "cs_c" })] });
    expect(m.history.map((h) => [h.sessionId, h.invoiceId])).toEqual([[null, "in_a"], ["cs_c", null]]);
  });

  it("a live plan whose first invoice has not granted keeps the page with the switch off (Cancel and Update card stay reachable)", () => {
    const live = sub("incomplete", false, 20);
    const m = model({ switchOn: false, allowance: allowance(), history: [], offers, now: NOW, subscription: live });
    expect(m.plan?.state).toBe("active");
    expect(buildCreditsModel({ switchOn: false, allowance: allowance(), history: [], offers, now: NOW, subscription: sub("canceled", false, -1) })).toEqual({ sees: false });
    expect(buildCreditsModel({ switchOn: false, allowance: allowance(), history: [], offers, now: NOW, subscription: null })).toEqual({ sees: false });
  });

  it("an older subscription's lots lapsing Nov 16 do not date the current plan, which ends Dec 14; the count is the lots'", () => {
    const m = model({ switchOn: true, allowance: allowance({ plan: 120, planExpiring: 60, planExpiresAt: end(2) }), history: [], offers, now: NOW, subscription: sub("active", true, 30) });
    expect(m.plan).toMatchObject({ state: "cancelled", on: "December 14", days: 30, credits: 60 });
  });

  it("the card counts only the credits that lapse on ITS subscription's date: 30 old credits on Nov 16 and 90 current ones on Dec 14 read 90", () => {
    const byExpiry = [{ at: end(2), n: 30 }, { at: end(30), n: 90 }];
    const m = model({ switchOn: true, allowance: allowance({ plan: 120, planExpiring: 30, planExpiresAt: end(2), planByExpiry: byExpiry }), history: [], offers, now: NOW, subscription: sub("active", true, 30) });
    expect(m.plan).toMatchObject({ state: "cancelled", on: "December 14", credits: 90 });
  });

  it("a plan that is not cancelling names only the credits that roll over, not an older subscription's", () => {
    const m = model({ switchOn: true, allowance: allowance({ plan: 120, planByExpiry: [{ at: end(2), n: 30 }, { at: null, n: 90 }] }), history: [], offers, now: NOW, subscription: sub("active", false, 30) });
    expect(m.plan?.credits).toBe(90);
    // The breakdown is absent: the account's figure stands.
    const bare = model({ switchOn: true, allowance: allowance({ plan: 120 }), history: [], offers, now: NOW, subscription: sub("active", false, 30) });
    expect(bare.plan?.credits).toBe(120);
  });

  it("an empty current group is zero, never the older subscription's credits", () => {
    const active = model({ switchOn: true, allowance: allowance({ plan: 30, planByExpiry: [{ at: end(2), n: 30 }] }), history: [], offers, now: NOW, subscription: sub("active", false, 30) });
    expect(active.plan?.credits).toBe(0);
    const cancelling = model({ switchOn: true, allowance: allowance({ plan: 30, planByExpiry: [{ at: end(2), n: 30 }] }), history: [], offers, now: NOW, subscription: sub("active", true, 30) });
    expect(cancelling.plan?.credits).toBe(0);
  });

  it("with no group on the period end yet (the webhook has not set the expiry), the rolling lots stand in; without a breakdown the account's figures", () => {
    const rolling = model({ switchOn: true, allowance: allowance({ plan: 120, planExpiring: 30, planByExpiry: [{ at: end(2), n: 30 }, { at: null, n: 90 }] }), history: [], offers, now: NOW, subscription: sub("active", true, 30) });
    expect(rolling.plan?.credits).toBe(90);
    const none = model({ switchOn: true, allowance: allowance({ plan: 120, planExpiring: 30 }), history: [], offers, now: NOW, subscription: sub("active", true, 30) });
    expect(none.plan?.credits).toBe(30);
  });
});
