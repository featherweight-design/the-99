import { describe, expect, it } from "vitest";

import { buildDeckProfile, type ProfileCardRow, type ProfileInput } from "./build";
import { fitSkeleton, foldCurve, THIN_DECK_COUNT } from "./fit";
import type { CompositionTargets, DetectionCoverage, FlagSource, StapleRef } from "./types";

const DETECTION: DetectionCoverage = {
  massLandDenial: { sources: 2, basis: "t" },
  extraTurn: { sources: 2, basis: "t" },
  twoCardCombos: { sources: 1, basis: "t" },
};

const TARGETS: CompositionTargets = {
  land: 37, basic: 17, nonbasic: 20, creature: 26, instant: 11,
  sorcery: 5, artifact: 13, enchantment: 6, planeswalker: 1, battle: 0,
};

const staple = (oracleId: string): StapleRef => ({
  oracleId, name: oracleId, commanders: 200, commanderTotal: 336,
  avgInclusion: 40.5, weightedRank: 3,
});

const row = (over: Partial<ProfileCardRow> & { oracleId: string }): ProfileCardRow => ({
  name: over.oracleId, typeLine: "Creature — Human", oracleText: null, keywords: [],
  cmc: 2, colorIdentity: [], manaCost: "{1}{G}", quantity: 1, commanderLegal: true,
  ...over,
});

function fit(over: Partial<ProfileInput> = {}, cards: ProfileCardRow[] = []) {
  const profile = buildDeckProfile({
    deckId: "d", fingerprint: "f", cards, commanderOracleIds: ["cmd"], identity: ["G"],
    declared: null, condition: "G",
    composition: { pair: null, commander: null, identity: null, count: null },
    staples: [], commanderDeckCount: 1000, population: null,
    mldFlags: new Map<string, FlagSource[]>(), extraTurnFlags: new Map<string, FlagSource[]>(),
    gameChangerIds: new Set<string>(), twoCardCombos: [], tutorIds: new Set<string>(),
    detection: DETECTION,
    ...over,
  });
  // The profile alone. The rows travel on it, so this cannot drift from what the profile's
  // own counts were computed from — which is the whole reason they moved there.
  return fitSkeleton(profile);
}

const withComposition = (
  of: "pair" | "commander" | "identity" | "count",
  averageCurve: Record<string, number> | null = null,
) => ({
  composition: {
    pair: of === "pair" ? { targets: TARGETS, averageCurve } : null,
    commander: of === "commander" ? { targets: TARGETS, averageCurve } : null,
    identity: of === "identity" ? { targets: TARGETS, averageCurve } : null,
    count: of === "count" ? { targets: TARGETS, averageCurve } : null,
  },
});

describe("basis", () => {
  it.each(["pair", "commander", "identity", "count"] as const)(
    "follows the profile's composition source (%s)",
    (of) => {
      expect(fit(withComposition(of)).basis).toBe(of);
    },
  );

  // No composition means no target, so no delta anyone could act on. Reporting the deck's
  // counts against a target of 0 would invent a surplus on every axis.
  it("is 'none' with no composition, and reports no type deltas", () => {
    const f = fit({}, [row({ oracleId: "a" })]);
    expect(f.basis).toBe("none");
    expect(f.types).toEqual([]);
  });
});

// The fit compares MEASURED type targets. `ROLE_TARGETS` — 10 ramp, 10 draw, 8 removal,
// 3 wipes — are asserted design constants nobody measured, and putting them in the same
// table would launder them through the measured numbers' credibility.
describe("no functional roles appear here", () => {
  it("names only the ten composition axes", () => {
    const f = fit(withComposition("commander"));
    expect(f.types.map((t) => t.type)).toEqual([
      "land", "basic", "nonbasic", "creature", "instant",
      "sorcery", "artifact", "enchantment", "planeswalker", "battle",
    ]);
  });

  it("carries no role key anywhere in the result", () => {
    const serialised = JSON.stringify(fit(withComposition("commander")));
    for (const role of ["ramp", "draw", "removal", "wipes"]) {
      expect(serialised).not.toContain(role);
    }
  });
});

describe("type deltas", () => {
  it("counts lands, and splits basic from nonbasic WITHIN the land count", () => {
    const cards = [
      row({ oracleId: "forest", typeLine: "Basic Land — Forest", quantity: 10 }),
      row({ oracleId: "bayou", typeLine: "Land — Swamp Forest", quantity: 5 }),
    ];
    const f = fit(withComposition("commander"), cards);
    const by = Object.fromEntries(f.types.map((t) => [t.type, t.have]));
    expect(by).toMatchObject({ land: 15, basic: 10, nonbasic: 5 });
  });

  it("counts a card on every type it carries", () => {
    const f = fit(withComposition("commander"), [
      row({ oracleId: "vehicle", typeLine: "Artifact Creature — Golem" }),
    ]);
    const by = Object.fromEntries(f.types.map((t) => [t.type, t.have]));
    expect(by.artifact).toBe(1);
    expect(by.creature).toBe(1);
  });

  it("reports the delta as have minus target, signed", () => {
    const f = fit(withComposition("commander"), [
      row({ oracleId: "forest", typeLine: "Basic Land — Forest", quantity: 40 }),
    ]);
    const land = f.types.find((t) => t.type === "land")!;
    expect(land).toMatchObject({ have: 40, target: 37, delta: 3 });
    const creature = f.types.find((t) => t.type === "creature")!;
    expect(creature).toMatchObject({ have: 0, target: 26, delta: -26 });
  });
});

describe("the curve", () => {
  // EDHREC's own keys run past 7 — `"9"` is on a real pair page — while `manaCurve` caps at
  // CURVE_MAX. Compared unaligned, every deck reports a phantom gap at the top.
  it("folds the literal tail keys into the 7+ bucket", () => {
    const folded = foldCurve({ "6": 3, "7": 2, "8": 1, "9": 1 });
    expect(folded.get(7)).toBe(4);
    expect(folded.get(6)).toBe(3);
  });

  it("compares a deck against the folded average", () => {
    const cards = [
      row({ oracleId: "big", cmc: 9, quantity: 2 }),
      row({ oracleId: "small", cmc: 1, quantity: 3 }),
    ];
    const f = fit(withComposition("commander", { "1": 5, "8": 1, "9": 1 }), cards);
    const seven = f.curve!.buckets.find((b) => b.cmc === 7)!;
    expect(seven).toMatchObject({ have: 2, average: 2, delta: 0 });
    const one = f.curve!.buckets.find((b) => b.cmc === 1)!;
    expect(one).toMatchObject({ have: 3, average: 5, delta: -2 });
  });

  it("draws all eight buckets, in order", () => {
    const f = fit(withComposition("commander", { "2": 10 }));
    expect(f.curve!.buckets.map((b) => b.cmc)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  // A deck cannot be compared to a curve nobody measured, and an empty bucket list would
  // read as a flat one.
  it("is null when the composition carries no curve", () => {
    expect(fit(withComposition("commander", null)).curve).toBeNull();
  });

  // A non-numeric key must be DROPPED, not coerced. `Math.round(NaN)` is NaN, which is a
  // perfectly valid Map key — so the bucket never lands at 0 and `get(0)` looks clean while
  // the map quietly carries a NaN entry. Asserting the key SET is what tells them apart.
  it("drops a non-numeric key rather than carrying a NaN bucket", () => {
    const folded = foldCurve({ total: 99, "2": 4 });
    expect([...folded.keys()]).toEqual([2]);
    expect(folded.get(2)).toBe(4);
  });
});

describe("staples", () => {
  // A rate with no denominator is not a figure a reader can weigh. Both travel.
  it("carries the rate AND the denominator per card", () => {
    const f = fit({ ...withComposition("commander"), staples: [staple("sol-ring")] });
    expect(f.missingStaples[0]).toMatchObject({
      commanders: 200, commanderTotal: 336, avgInclusion: 40.5,
    });
  });

  it("splits held from missing by oracle id", () => {
    const cards = [row({ oracleId: "sol-ring" })];
    const f = fit(
      { ...withComposition("commander"), staples: [staple("sol-ring"), staple("arcane-signet")] },
      cards,
    );
    expect(f.presentStaples.map((s) => s.oracleId)).toEqual(["sol-ring"]);
    expect(f.missingStaples.map((s) => s.oracleId)).toEqual(["arcane-signet"]);
  });

  it("a deck holding every floor card has nothing missing", () => {
    const cards = [row({ oracleId: "sol-ring" }), row({ oracleId: "arcane-signet" })];
    const f = fit(
      { ...withComposition("commander"), staples: [staple("sol-ring"), staple("arcane-signet")] },
      cards,
    );
    expect(f.missingStaples).toEqual([]);
    expect(f.presentStaples).toHaveLength(2);
  });
});

describe("coverage", () => {
  // The VALUE is measured and the PERCENTILE is a convention — see the constant's own note.
  it("is the bottom decile of the shipped index", () => {
    expect(THIN_DECK_COUNT).toBe(27);
  });

  it("reports thin below the floor and not at it", () => {
    expect(fit({ commanderDeckCount: THIN_DECK_COUNT - 1 }).coverage.thin).toBe(true);
    expect(fit({ commanderDeckCount: THIN_DECK_COUNT }).coverage.thin).toBe(false);
  });

  // No page at all is the thinnest data there is, and must not read as thick merely because
  // there is no figure to compare.
  it("treats a null deck count as thin", () => {
    const f = fit({ commanderDeckCount: null });
    expect(f.coverage).toEqual({ commanderDeckCount: null, thin: true });
  });

  // Thin is reported BESIDE the floor, never instead of it: a small sample is still the
  // best answer available, and withholding it would leave the reader with nothing.
  it("still serves the floor when coverage is thin", () => {
    const f = fit({
      ...withComposition("commander"),
      commanderDeckCount: 3,
      staples: [staple("sol-ring")],
    });
    expect(f.coverage.thin).toBe(true);
    expect(f.basis).toBe("commander");
    expect(f.types).toHaveLength(10);
    expect(f.missingStaples).toHaveLength(1);
  });
});

// One DeckProfile must not report three different land counts for the same deck. The fit
// used `typeLine.includes("land")` over the whole line where `counts.land` and `curve.lands`
// both use `isLandFace` — the front face, with a word boundary.
describe("the land test agrees with the rest of the profile", () => {
  const profileFor = (cards: ProfileCardRow[]) =>
    buildDeckProfile({
      deckId: "d", fingerprint: "f", cards, commanderOracleIds: ["cmd"], identity: ["G"],
      declared: null, condition: "G",
      // A composition is required or `types` is empty and every assertion below reads
      // `undefined` — which is a check measuring nothing rather than a check passing.
      composition: {
        pair: null,
        commander: { targets: TARGETS, averageCurve: null },
        identity: null,
        count: null,
      },
      staples: [], commanderDeckCount: 1000, population: null,
      mldFlags: new Map<string, FlagSource[]>(),
      extraTurnFlags: new Map<string, FlagSource[]>(),
      gameChangerIds: new Set<string>(), twoCardCombos: [], tutorIds: new Set<string>(),
      detection: DETECTION,
    });

  // `Fell the Profane // Fell Mire` is an Instant. 83 of the 35,572 catalog rows carry a land
  // on the back
  // face alone, and every one of them would have been a land in this table and not in the
  // counts beside it.
  it("does not count a card whose LAND is on the back face", () => {
    const p = profileFor([
      row({ oracleId: "fell", name: "Fell the Profane // Fell Mire", typeLine: "Instant // Land" }),
    ]);
    const f = fitSkeleton(p);
    const by = Object.fromEntries(f.types.map((t) => [t.type, t.have]));
    expect(p.counts.land).toBe(0);
    expect(by.land).toBe(0);
  });

  // No word boundary, and `Lander Rizzi` is a land.
  it("does not count a card whose type merely contains the letters", () => {
    const p = profileFor([
      row({ oracleId: "lander", name: "Lander Rizzi", typeLine: "Legendary Artifact Creature — Lander Rogue" }),
    ]);
    const f = fitSkeleton(p);
    const by = Object.fromEntries(f.types.map((t) => [t.type, t.have]));
    expect(by.land).toBe(0);
    expect(by.nonbasic).toBe(0);
  });

  // `Treasure Map // Treasure Cove` is an Artifact. A substring sweep put it on both axes.
  it("reads every other type off the front face too", () => {
    const p = profileFor([
      row({ oracleId: "map", name: "Treasure Map // Treasure Cove", typeLine: "Artifact // Land" }),
    ]);
    const by = Object.fromEntries(fitSkeleton(p).types.map((t) => [t.type, t.have]));
    expect(by.artifact).toBe(1);
    expect(by.land).toBe(0);
  });

  it("agrees with counts.land on an ordinary deck", () => {
    const p = profileFor([
      row({ oracleId: "forest", typeLine: "Basic Land — Forest", quantity: 10 }),
      row({ oracleId: "bayou", typeLine: "Land — Swamp Forest", quantity: 5 }),
      row({ oracleId: "bear", typeLine: "Creature — Bear" }),
    ]);
    const by = Object.fromEntries(fitSkeleton(p).types.map((t) => [t.type, t.have]));
    expect(by.land).toBe(p.counts.land);
    expect(by.land).toBe(p.curve.lands);
  });
});
