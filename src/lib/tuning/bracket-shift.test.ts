import { describe, expect, it } from "vitest";

import { slotDeck } from "../bracket/slot";
import { buildDeckProfile, type ProfileCardRow, type ProfileInput } from "../profile/build";
import type { ComboRef, DetectionCoverage, FlagSource } from "../profile/types";
import { bracketAfter, bracketShift } from "./bracket-shift";

const DETECTION: DetectionCoverage = {
  massLandDenial: { methods: ["m"], basis: "t" },
  extraTurn: { methods: ["m"], basis: "t" },
  twoCardCombos: { methods: ["m"], basis: "t" },
};

const row = (oracleId: string): ProfileCardRow => ({
  oracleId, name: oracleId, layout: "normal", typeLine: "Creature — Human", oracleText: null,
  keywords: [], cmc: 2, colorIdentity: [], manaCost: "{1}{G}", quantity: 1, commanderLegal: true,
});

function profile(over: Partial<ProfileInput> = {}) {
  return buildDeckProfile({
    deckId: "d", fingerprint: "f", cards: [row("cmd"), row("bear"), row("gc"), row("p1")],
    commanderOracleIds: ["cmd"], identity: ["G"], condition: "G",
    composition: { pair: null, commander: null, identity: null, count: null },
    roles: { pair: null, commander: null, identity: null, count: null },
    thinCondition: false, staples: [], commanderDeckCount: null, population: null,
    mldFlags: new Map<string, FlagSource[]>(), extraTurnFlags: new Map<string, FlagSource[]>(),
    gameChangerIds: new Set<string>(), twoCardCombos: [], tutorIds: new Set<string>(),
    detection: DETECTION,
    ...over,
  });
}

const combo: ComboRef = {
  variantId: "v1", cards: [{ oracleId: "p1", name: "p1" }, { oracleId: "plain", name: "Plain Card" }],
  produces: ["Infinite mana"], bracketTag: "casual", usesCommander: false,
  manaValueNeeded: null, manaNeeded: null, steps: null, notablePrerequisites: null,
};

describe("bracketAfter", () => {
  it("is null for a swap that moves nothing", () => {
    expect(bracketAfter({ before: profile(), after: profile(), declared: 2 })).toBeNull();
  });

  it("flags a swap that adds a Game Changer, with the permits the verdict would give", () => {
    const clean = profile();
    const withGc = profile({ gameChangerIds: new Set(["gc"]) });
    const out = bracketAfter({ before: clean, after: withGc, declared: 2 });
    expect(out).toEqual(slotDeck(withGc, 2).permits);
    expect(out).not.toEqual(slotDeck(clean, 2).permits);
  });

  it("flags a move down too: cutting the deck's only Game Changer", () => {
    const withGc = profile({ gameChangerIds: new Set(["gc"]) });
    expect(bracketAfter({ before: withGc, after: profile(), declared: 3 })).toEqual(slotDeck(profile(), 3).permits);
  });

  it("reads the combo verdict from the after profile, not a patch of the before", () => {
    const withCombo = profile({ twoCardCombos: [combo] });
    expect(bracketAfter({ before: profile(), after: withCombo, declared: 2 })).toEqual(slotDeck(withCombo, 2).permits);
  });
});

describe("bracketShift", () => {
  it("raises when the lowest permitted bracket goes up", () => {
    expect(bracketShift([3], [4])).toBe("raises");
    expect(bracketShift([2], [4, 5])).toBe("raises");
  });
  it("lowers when the lowest goes down, a widening range included", () => {
    expect(bracketShift([4], [3])).toBe("lowers");
    expect(bracketShift([2], [1, 2])).toBe("lowers");
  });
  it("changes when the lowest holds and the set does not", () => {
    expect(bracketShift([4], [4, 5])).toBe("changes");
    expect(bracketShift([4, 5], [4])).toBe("changes");
  });
  it("draws nothing without a flag, or when the flag agrees with the reading now", () => {
    expect(bracketShift([3], null)).toBeNull();
    expect(bracketShift([4, 5], [4, 5])).toBeNull();
  });
});
