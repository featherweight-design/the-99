import { describe, expect, it } from "vitest";
import type { Candidate, CandidateHalf } from "./candidates";
import { byPartnerFit, isBelowFloor, type PartnerOption } from "./partner-add";

const half = (name: string): CandidateHalf => ({
  oracleId: name, name, manaCost: null, cmc: 0, artCropUri: null, imageUri: null,
  inDeck: false, owned: false, availability: null, price: null,
});
const option = (partner: string, n: number, belowFloor: boolean): PartnerOption => {
  const base: Candidate = { key: partner, halves: [half("Stay"), half(partner)], fit: { n, of: 60 }, matched: [], deckCount: 0 };
  return { ...base, hasPairRow: !belowFloor, belowFloor, opens: [], cuts: [] };
};

describe("byPartnerFit", () => {
  it("lists a pair below the floor after every pair that meets it, whatever its figure", () => {
    const out = [option("Low", 50, true), option("Zed", 10, false), option("Amy", 10, false), option("Top", 30, false)].sort(byPartnerFit);
    expect(out.map((o) => o.halves[1].name)).toEqual(["Top", "Amy", "Zed", "Low"]);
  });
});

describe("isBelowFloor", () => {
  it("is true for a pair with no row, and for a row under the floor", () => {
    expect(isBelowFloor({ hasPairRow: false, deckCount: 0 })).toBe(true);
    expect(isBelowFloor({ hasPairRow: true, deckCount: 19 })).toBe(true);
    expect(isBelowFloor({ hasPairRow: true, deckCount: 20 })).toBe(false);
  });
});
