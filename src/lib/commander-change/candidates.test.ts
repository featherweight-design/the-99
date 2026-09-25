import { describe, expect, it } from "vitest";
import { groupCandidates, isYours, type Candidate, type CandidateHalf } from "./candidates";
import { offerable, tradeShape } from "./pending";

const half = (name: string, over: Partial<CandidateHalf> = {}): CandidateHalf => ({
  oracleId: name, name, manaCost: null, cmc: 0, artCropUri: null, imageUri: null,
  inDeck: false, owned: false, availability: null, price: null, ...over,
});
const cand = (halves: CandidateHalf[], n: number): Candidate => ({
  key: halves.map((h) => h.oracleId).join("+"), halves, fit: { n, of: 60 }, matched: [], deckCount: 100,
});

describe("isYours", () => {
  it("counts a half owned or already in the 99 as yours", () => {
    expect(isYours(cand([half("a", { owned: true })], 1))).toBe(true);
    expect(isYours(cand([half("a", { inDeck: true })], 1))).toBe(true);
    expect(isYours(cand([half("a")], 1))).toBe(false);
  });

  it("puts a half-owned pair with the pairs to buy (H1)", () => {
    expect(isYours(cand([half("a", { owned: true }), half("b")], 1))).toBe(false);
    expect(isYours(cand([half("a", { owned: true }), half("b", { inDeck: true })], 1))).toBe(true);
  });
});

describe("groupCandidates", () => {
  it("orders each group by the figure, then by name, and never by price", () => {
    const { yours, toBuy } = groupCandidates([
      cand([half("Zed", { owned: true })], 30),
      cand([half("Amy", { owned: true })], 30),
      cand([half("Bob", { owned: true })], 41),
      // The pricier one has the LOWER figure, so an order by price would reverse these two.
      cand([half("Cheap")], 20),
      cand([half("Pricey", { price: { cents: 99999, foilCents: null, etchedCents: null, asOf: new Date() } })], 10),
    ]);
    expect(yours.map((c) => c.halves[0].name)).toEqual(["Bob", "Amy", "Zed"]);
    expect(toBuy.map((c) => c.halves[0].name)).toEqual(["Cheap", "Pricey"]);
  });
});

describe("tradeShape and offerable", () => {
  it("offers a single even when it is in the 99 (that is the trade)", () => {
    expect(tradeShape(["a"], ["x"], new Set(["a"]))).toBe("trade");
    expect(offerable(["a"], ["x"], new Set(["a"]))).toBe(true);
  });

  it("offers a pair with neither half in the deck", () => {
    expect(tradeShape(["a", "b"], ["x", "y"], new Set(["c"]))).toBe("none");
  });

  it("offers a half-trade: one new half out of the 98 while both old halves leave", () => {
    expect(tradeShape(["a", "b"], ["x", "y"], new Set(["b"]))).toBe("halfTrade");
    expect(offerable(["a", "b"], ["x", "y"], new Set(["b"]))).toBe(true);
  });

  it("holds back a half out of the 98 beside a kept half, and two halves out of the 98", () => {
    expect(tradeShape(["x", "b"], ["x", "y"], new Set(["b"]))).toBeNull();
    expect(tradeShape(["a", "b"], ["x", "y"], new Set(["a", "b"]))).toBeNull();
    expect(offerable(["x", "b"], ["x", "y"], new Set(["b"]))).toBe(false);
  });

  it("offers a kept half beside a new one from outside the 98", () => {
    expect(tradeShape(["x", "a"], ["x", "y"], new Set(["b"]))).toBe("none");
  });
});
