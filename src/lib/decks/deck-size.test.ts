import { describe, expect, it } from "vitest";
import { FLAT_LAND, deckBodySize, landTarget } from "./deck-size";
import { FLAT_TARGETS } from "./mix";

describe("deckBodySize", () => {
  it("is 99 for a single commander", () => {
    expect(deckBodySize(false)).toBe(99);
  });

  it("is 98 for a pair — the deck is still 100 cards", () => {
    expect(deckBodySize(true)).toBe(98);
  });
});

describe("landTarget", () => {
  it("is 37 for a single commander", () => {
    expect(landTarget(false)).toBe(37);
  });

  it("drops to 36 for a pair, so the missing slot comes out of the lands", () => {
    expect(landTarget(true)).toBe(36);
  });
});

describe("landTarget against a measured skeleton", () => {
  const skel = (land: number, of: "commander" | "pair" | "identity" = "commander",
                roles = { ramp: 10, draw: 10, removal: 8, wipes: 3 }) => ({
    composition: {
      of,
      targets: {
        land, basic: 20, nonbasic: 17, creature: 26, instant: 8,
        sorcery: 7, artifact: 9, enchantment: 6, planeswalker: 1, battle: 0,
      },
      averageCurve: null,
    },
    roleTargets: { of: "commander" as const, targets: roles },
    condition: "G",
    thinCondition: false,
    staples: [],
    commanderDeckCount: 1000,
  });

  it("takes the measured count over the asserted one", () => {
    expect(landTarget(false, skel(35))).toBe(35);
  });

  // The pair's missing slot comes out of the elastic lands, never out of a role target.
  it("still hands the pair's slot to the lands", () => {
    expect(landTarget(true, skel(35))).toBe(34);
  });

  // A `pair` basis already describes two-commander decks. Subtracting again takes the slot
  // twice, and the deck ends a land short of what was actually measured for it.
  it("does not subtract twice on a pair basis", () => {
    expect(landTarget(true, skel(35, "pair"))).toBe(35);
  });

  // `identity_composition.avg_land` is `real` where the commander column is `integer`, so an
  // identity basis hands back a fraction — and `splitByWeight` would allocate fractional
  // basic-land slots from it.
  it("rounds a fractional average", () => {
    expect(landTarget(false, skel(36.4, "identity"))).toBe(36);
    expect(landTarget(false, skel(36.6, "identity"))).toBe(37);
  });

  // Nothing stops a bucket's mean plus four role floors exceeding the body, and a land target
  // that ate it would leave the fill unable to meet a single role.
  it("caps at what the body can hold beside the role floors", () => {
    expect(landTarget(false, skel(90))).toBe(99 - 31);
  });

  it("falls back to the asserted figures with no composition", () => {
    expect(landTarget(false, null)).toBe(37);
    expect(landTarget(true, undefined)).toBe(36);
  });
});

// Unreachable through `compositionFrom`, which rejects a row holding a null — but that guard
// tests for `null` alone and a row carrying `undefined` walks past it. What a non-finite target
// costs is not a wrong number: every `counts.land >= landCeiling` comparison against NaN is
// false, so the land sweeps run until the collection is exhausted.
it("falls back rather than propagating a non-finite measured target", () => {
  const broken = {
    composition: {
      of: "identity" as const,
      targets: { land: undefined as unknown as number, basic: 0, nonbasic: 0, creature: 0,
        instant: 0, sorcery: 0, artifact: 0, enchantment: 0, planeswalker: 0, battle: 0 },
      averageCurve: null,
    },
    roleTargets: { of: "flat" as const, targets: { ramp: 10, draw: 10, removal: 8, wipes: 3 } },
    condition: "G", thinCondition: false, staples: [], commanderDeckCount: null,
  };
  expect(landTarget(false, broken)).toBe(37);
});

// Both halves of the cap, each a repro the pre-open pass produced.
it("rounds each role target before summing, as roleFloors does", () => {
  const s = {
    composition: {
      of: "commander" as const,
      targets: { land: 90, basic: 0, nonbasic: 0, creature: 0, instant: 0, sorcery: 0,
        artifact: 0, enchantment: 0, planeswalker: 0, battle: 0 },
      averageCurve: null,
    },
    roleTargets: { of: "commander" as const, targets: { ramp: 10.5, draw: 10.5, removal: 10.5, wipes: 10.5 } },
    condition: "G", thinCondition: false, staples: [], commanderDeckCount: 1000,
  };
  // Each rounds to 11, so the floors sum to 44 — rounding the SUM gives 42 and lets the land
  // target plus the floors exceed the body the fill has to fit them all into.
  expect(landTarget(false, s)).toBe(99 - 44);
});

it("falls back rather than returning a NaN cap from non-finite role targets", () => {
  const s = {
    composition: {
      of: "commander" as const,
      targets: { land: 34, basic: 0, nonbasic: 0, creature: 0, instant: 0, sorcery: 0,
        artifact: 0, enchantment: 0, planeswalker: 0, battle: 0 },
      averageCurve: null,
    },
    roleTargets: {
      of: "commander" as const,
      targets: { ramp: undefined as unknown as number, draw: 10, removal: 8, wipes: 3 },
    },
    condition: "G", thinCondition: false, staples: [], commanderDeckCount: 1000,
  };
  expect(landTarget(false, s)).toBe(37);
});

// The About Roles row and the strip's fallback read FLAT_TARGETS; the fill reads landTarget. One
// constant behind both is what keeps the page from naming a land count the fill does not use.

it("builds the fallback land count from the one constant the strip and About read", () => {
  expect(FLAT_TARGETS.land).toBe(FLAT_LAND);
  expect(landTarget(false)).toBe(FLAT_LAND);
  expect(landTarget(true)).toBe(FLAT_LAND - 1);
});
