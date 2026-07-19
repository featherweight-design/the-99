import { describe, expect, it } from "vitest";
import { filterByColors } from "./filter";
import type { RankedCommander } from "../recs/recommend";

// Minimal stub: only fields needed for filter testing.
function stub(name: string, colorIdentity: string[], score = 0): RankedCommander {
  return {
    oracleId: `oracle-${name}`,
    name,
    colorIdentity,
    imageUri: null,
    typeLine: "Legendary Creature",
    oracleText: null,
    manaCost: null,
    colorPoolSize: 0,
    edhrecOwnedCount: null,
    edhrecTotal: null,
    roleCounts: { ramp: 0, draw: 0, removal: 0, wipes: 0 },
    roleGaps: [],
    roleCards: { ramp: [], draw: [], removal: [], wipes: [] },
    overlapOwned: [],
    overlapMissing: [],
    fitPool: 0,
    fitRoles: 0,
    fitSynergy: null,
    score,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
  };
}

const krenko = stub("Krenko", ["R"]);
const atraxa = stub("Atraxa", ["W", "U", "B", "G"]);
const nekusar = stub("Nekusar", ["U", "B", "R"]);
const colorless = stub("Kozilek", []);
const allResults = [krenko, atraxa, nekusar, colorless];

describe("filterByColors", () => {
  it("empty selection returns all results unchanged", () => {
    expect(filterByColors(allResults, [])).toEqual(allResults);
  });

  it("selecting B keeps only commanders whose identity contains B", () => {
    const result = filterByColors(allResults, ["B"]);
    expect(result).toContain(atraxa);
    expect(result).toContain(nekusar);
    expect(result).not.toContain(krenko);
    expect(result).not.toContain(colorless);
  });

  it("selecting W+B keeps only commanders whose identity contains both W and B", () => {
    const result = filterByColors(allResults, ["W", "B"]);
    expect(result).toContain(atraxa);
    expect(result).not.toContain(nekusar); // missing W
    expect(result).not.toContain(krenko);
    expect(result).not.toContain(colorless);
  });

  it("selecting R keeps commanders with R in identity", () => {
    const result = filterByColors(allResults, ["R"]);
    expect(result).toContain(krenko);
    expect(result).toContain(nekusar);
    expect(result).not.toContain(atraxa);
    expect(result).not.toContain(colorless);
  });

  it("does not re-sort — preserves input order", () => {
    const result = filterByColors(allResults, ["B"]);
    // atraxa before nekusar, matching allResults order
    expect(result.indexOf(atraxa)).toBeLessThan(result.indexOf(nekusar));
  });

  it("selecting a color present in no commander returns empty array", () => {
    // No commander has U alone when filtering all five WUBRG
    const result = filterByColors(allResults, ["W", "U", "B", "R", "G"]);
    // Only atraxa has W+U+B+G but not R — nobody has all 5
    expect(result).toHaveLength(0);
  });

  it("colorless commander is excluded by any color filter", () => {
    const result = filterByColors([colorless], ["R"]);
    expect(result).toHaveLength(0);
  });

  it("returns empty array unchanged when input is empty", () => {
    expect(filterByColors([], ["B"])).toHaveLength(0);
  });
});
