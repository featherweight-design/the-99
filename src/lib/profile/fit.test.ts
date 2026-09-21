import { describe, expect, it } from "vitest";

import { buildDeckProfile, type ProfileCardRow, type ProfileInput } from "./build";
import { ROLE_TARGETS } from "../recs/roles";
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

/** Any four figures that are not `ROLE_TARGETS`, so a test cannot pass by coincidence. */
const FOUR = { ramp: 9, draw: 11, removal: 7, wipes: 2 };

const row = (over: Partial<ProfileCardRow> & { oracleId: string }): ProfileCardRow => ({
  name: over.oracleId, typeLine: "Creature — Human", oracleText: null, keywords: [],
  cmc: 2, colorIdentity: [], manaCost: "{1}{G}", quantity: 1, commanderLegal: true, layout: "normal",
  ...over,
});

function fit(over: Partial<ProfileInput> = {}, cards: ProfileCardRow[] = []) {
  const profile = buildDeckProfile({
    deckId: "d", fingerprint: "f", cards, commanderOracleIds: ["cmd"], identity: ["G"],
    declared: null, condition: "G",
    composition: { pair: null, commander: null, identity: null, count: null },
    roles: { pair: null, commander: null, identity: null, count: null },
    thinCondition: false,
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

// THE RULE THAT REPLACED "no functional roles appear here". That one was structural and its
// reason has ended: the four are derived per commander, per pair and per bucket now, from the
// same index the type targets come from. What survives is narrower and per-row — a fit may
// carry a role target only with `measured` beside it, because a deck whose chain ended at
// `flat` is still being compared to the asserted baseline and a reader shown that figure
// without being told cannot tell it from one taken over eight hundred decklists.
describe("a role target never travels without saying whether it was measured", () => {
  const withRoles = (of: "commander" | "identity", targets = FOUR) => ({
    roles: {
      pair: null,
      commander: of === "commander" ? targets : null,
      identity: of === "identity" ? targets : null,
      count: null,
    },
  });

  // RESTORED from the retired guard test, which was doing double duty: it was the only
  // assertion anywhere on TYPE_ORDER's membership AND its order, and the surviving type tests
  // look their axes up by name, so a reordered or duplicated axis shipped green without it.
  it("still names exactly the ten composition axes, in order", () => {
    expect(fit(withComposition("commander")).types.map((t) => t.type)).toEqual([
      "land", "basic", "nonbasic", "creature", "instant",
      "sorcery", "artifact", "enchantment", "planeswalker", "battle",
    ]);
  });

  it("says which rung served the roles, beside whether they were measured", () => {
    expect(fit(withRoles("identity")).roleBasis).toBe("identity");
    expect(fit().roleBasis).toBe("flat");
  });

  it("names the four roles in ramp, draw, removal, wipes order", () => {
    expect(fit(withRoles("commander")).roles.map((r) => r.role))
      .toEqual(["ramp", "draw", "removal", "wipes"]);
  });

  it("marks a derived target measured", () => {
    expect(fit(withRoles("commander")).roles.every((r) => r.measured)).toBe(true);
  });

  // The chain ends at `ROLE_TARGETS` rather than at null, so the rows are always there — and
  // this is the case the whole `measured` flag exists for.
  it("marks the asserted fallback NOT measured, and still reports it", () => {
    const f = fit();
    expect(f.roles.every((r) => !r.measured)).toBe(true);
    expect(f.roles.map((r) => r.target))
      .toEqual([ROLE_TARGETS.ramp, ROLE_TARGETS.draw, ROLE_TARGETS.removal, ROLE_TARGETS.wipes]);
  });

  // 390 commanders measure exactly 0 wipes on front-face text. A deck holding one is OVER,
  // and reporting that as a shortfall would be the flat target's error wearing a measured
  // number's authority — precisely what the retired module-wide rule existed to prevent.
  it("reports a surplus against a measured zero, not a shortfall", () => {
    const wipe = row({
      oracleId: "wrath", typeLine: "Sorcery",
      oracleText: "Destroy all creatures.", manaCost: "{2}{W}{W}",
    });
    const f = fit(withRoles("commander", { ramp: 9, draw: 11, removal: 7, wipes: 0 }), [wipe]);
    const wipes = f.roles.find((r) => r.role === "wipes")!;
    expect(wipes.target).toBe(0);
    expect(wipes.have).toBe(1);
    expect(wipes.delta).toBe(1);
  });

  // THE TWO SIDES MUST COUNT THE SAME POPULATION, and these are the two ways they did not.
  //
  // EDHREC's support lists never contain the commander, so folding it into `have` reports a
  // surplus on every deck led by a card that classifies as one of the four. The commander here
  // is a draw engine; with `counts` in place of `excludingCommanders` this reads 1.
  it("counts the 99 alone against a measured target, never the commander", () => {
    const f = fit(
      { ...withRoles("commander", { ramp: 0, draw: 0, removal: 0, wipes: 0 }),
        commanderOracleIds: ["cmd"] },
      [row({ oracleId: "cmd", typeLine: "Legendary Creature — Human",
             oracleText: "Whenever you cast a spell, draw a card." })],
    );
    expect(f.roles.find((r) => r.role === "draw")!.have).toBe(0);
  });

  // THE MIRROR, and the reason the population is chosen by target rather than fixed.
  // `ROLE_TARGETS` is a design figure for a DECK, and a deck is a hundred cards including the
  // one in the command zone — so the flat baseline counts the commander, where a derived
  // target must not. Dropping it here would under-count against a target that always meant to
  // include it, which is the same class of error as the phantom surplus above, inverted.
  it("counts the commander against the ASSERTED baseline", () => {
    const f = fit(
      { commanderOracleIds: ["cmd"] },
      [row({ oracleId: "cmd", typeLine: "Legendary Creature — Human",
             oracleText: "Whenever you cast a spell, draw a card." })],
    );
    expect(f.roles.every((r) => !r.measured)).toBe(true);
    expect(f.roles.find((r) => r.role === "draw")!.have).toBe(1);
  });

  // `cards.oracle_text` holds BOTH faces joined, and the derivation classifies the FRONT one.
  // A land-backed MDFC read as ramp off the whole string — the same 82-card defect the
  // derivation was corrected for, on the side that never was.
  it("classifies the front face, as the derivation does", () => {
    const mdfc = row({
      oracleId: "path", typeLine: "Instant // Land",
      oracleText: "Destroy target creature.\n//\n{T}: Add {G}.",
      layout: "modal_dfc",
    });
    const f = fit(withRoles("commander", { ramp: 0, draw: 0, removal: 0, wipes: 0 }), [mdfc]);
    expect(f.roles.find((r) => r.role === "ramp")!.have).toBe(0);
  });

  // A different fact from `coverage.thin`, with a different source, which is why the names
  // differ — this one is about the BUCKET's population, that one about this commander's.
  it("carries the bucket's caveat separately from the commander's", () => {
    const f = fit({ ...withRoles("identity"), thinCondition: true });
    expect(f.coverage.thinCondition).toBe(true);
    expect(f.coverage.thin).toBe(false);
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
    expect(f.coverage).toEqual({ commanderDeckCount: null, thin: true, thinCondition: false });
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
      roles: { pair: null, commander: null, identity: null, count: null },
      thinCondition: false,
      staples: [], commanderDeckCount: 1000, population: null,
      mldFlags: new Map<string, FlagSource[]>(),
      extraTurnFlags: new Map<string, FlagSource[]>(),
      gameChangerIds: new Set<string>(), twoCardCombos: [], tutorIds: new Set<string>(),
      detection: DETECTION,
    });

  // `Fell the Profane // Fell Mire` is an Instant. 83 of the 35,572 catalog rows carry a land
  // on the back face alone, and every one of them would have been a land in this table and
  // not in the counts beside it.
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
