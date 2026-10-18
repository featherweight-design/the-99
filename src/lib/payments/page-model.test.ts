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
    const m = model({ switchOn: false, allowance: allowance({ welcome: 15, pack: 4 }), history: [], offers });
    expect(m.cells.map((c) => c.key)).toEqual(["free", "welcome", "pack"]);
    expect(m.total).toBe(3 + 15 + 4);
  });

  it("draws no cell once the lot is spent: it is never bought, so there is no empty cell to explain", () => {
    const m = model({ switchOn: true, allowance: allowance({ welcome: 0 }), history: [], offers });
    expect(m.cells.map((c) => c.key)).toEqual(["free"]);
  });
});
