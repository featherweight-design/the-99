import { describe, expect, it } from "vitest";
import { groupCandidates, isYours, type Candidate, type CandidateHalf } from "./candidates";

const half = (name: string, over: Partial<CandidateHalf> = {}): CandidateHalf => ({
  oracleId: name, name, manaCost: null, cmc: 0, artCropUri: null,
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
      cand([half("Cheap")], 10),
      cand([half("Pricey", { price: { priceCents: 99999 } as never })], 20),
    ]);
    expect(yours.map((c) => c.halves[0].name)).toEqual(["Bob", "Amy", "Zed"]);
    expect(toBuy.map((c) => c.halves[0].name)).toEqual(["Pricey", "Cheap"]);
  });
});
