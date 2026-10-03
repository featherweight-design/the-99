import { describe, expect, it } from "vitest";
import { filterByColors, matchesColors } from "./filter";
import type { RankedCommander } from "../recs/recommend";

// Minimal stub: only fields needed for filter testing.
function stub(name: string, colorIdentity: string[], score = 0): RankedCommander {
  return {
    oracleId: `oracle-${name}`,
    name,
    colorIdentity,
    imageUri: null,
    artCropUri: null,
    typeLine: "Legendary Creature",
    oracleText: null,
    manaCost: null,
    colorPoolSize: 0,
    edhrecOwnedCount: null,
    edhrecTotal: null,
    roleCounts: { ramp: 0, draw: 0, removal: 0, wipes: 0 },
    roleGaps: [],
    roleCards: { ramp: [], draw: [], removal: [], wipes: [] },
    overlapOwned: [], overlapOwnedIds: [],
    fitPool: 0,
    fitRoles: 0,
    fitSynergy: null,
    score,
    measurableTotal: 40,
    rankScore: score,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    synergyState: "ok",
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

  // The shipped behaviour is the default, so the two `FilterBar` call sites that
  // never pass a mode keep the exact list they had before this argument existed.
  it("matches contains by default", () => {
    expect(filterByColors(allResults, ["U", "B"])).toEqual(
      filterByColors(allResults, ["U", "B"], "contains"),
    );
  });

  it("keeps only an identity that is the selection and nothing else under exactly", () => {
    const result = filterByColors(allResults, ["U", "B", "R"], "exactly");
    expect(result).toEqual([nekusar]);
  });

  // The difference between the modes, on one selection: Atraxa contains U and B,
  // and is not U and B.
  it("drops a wider identity under exactly that contains keeps", () => {
    expect(filterByColors(allResults, ["U", "B"], "contains")).toContain(atraxa);
    expect(filterByColors(allResults, ["U", "B"], "exactly")).not.toContain(atraxa);
  });

  it("matches a mono-colour identity exactly", () => {
    expect(filterByColors(allResults, ["R"], "exactly")).toEqual([krenko]);
  });

  // With no pip lit there is no selection to be exact about, and the mode control
  // is not rendered. Reading it literally would keep the colourless commanders —
  // a filter the player never asked for, applied by a control that is not on screen.
  it("returns everything unchanged on an empty selection under exactly too", () => {
    expect(filterByColors(allResults, [], "exactly")).toEqual(allResults);
  });

  it("does not re-sort under exactly either", () => {
    const twoBlue = [atraxa, nekusar, stub("Vela", ["U", "B", "R"])];
    const result = filterByColors(twoBlue, ["U", "B", "R"], "exactly");
    expect(result.map((r) => r.name)).toEqual(["Nekusar", "Vela"]);
  });
});

// The one rule both the lanes and /collection read (H10).
describe("matchesColors", () => {
  it("contains: every selected colour is in the identity", () => {
    expect(matchesColors(["R", "U"], ["R"], "contains")).toBe(true);
    expect(matchesColors(["R"], ["R", "U"], "contains")).toBe(false);
  });
  it("exactly: the identity is the selection and nothing besides", () => {
    expect(matchesColors(["R"], ["R"], "exactly")).toBe(true);
    expect(matchesColors(["R", "U"], ["R"], "exactly")).toBe(false);
    expect(matchesColors(["U", "R"], ["R", "U"], "exactly")).toBe(true);
  });
  it("matches everything with nothing selected, under both modes", () => {
    expect(matchesColors(["R"], [], "exactly")).toBe(true);
    expect(matchesColors([], [], "exactly")).toBe(true);
    expect(matchesColors(["G"], [], "contains")).toBe(true);
  });
});
