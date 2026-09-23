import { describe, expect, it } from "vitest";

import { slotDeck } from "../bracket/slot";
import { buildDeckProfile, type ProfileCardRow, type ProfileInput } from "../profile/build";
import type { ComboRef, DetectionCoverage, FlagSource } from "../profile/types";
import { bracketAfter, type AddFacts } from "./bracket-shift";

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

const plain: AddFacts = { oracleId: "plain", name: "Plain Card", gameChanger: false, massLandDenial: null, extraTurn: null };

const combo: ComboRef = {
  variantId: "v1", cards: [{ oracleId: "p1", name: "p1" }, { oracleId: "plain", name: "Plain Card" }],
  produces: ["Infinite mana"], bracketTag: "casual", usesCommander: false,
  manaValueNeeded: null, manaNeeded: null, steps: null, notablePrerequisites: null,
};

describe("bracketAfter", () => {
  it("is null for a swap that moves nothing", () => {
    expect(bracketAfter({ profile: profile(), declared: 2, add: plain, cutOracleId: "bear", combosAfter: [] })).toBeNull();
  });

  it("flags an add that is a Game Changer, with the permits the verdict would give", () => {
    const clean = profile();
    const out = bracketAfter({ profile: clean, declared: 2, add: { ...plain, gameChanger: true }, cutOracleId: "bear", combosAfter: [] });
    const withGc = profile({ gameChangerIds: new Set(["gc"]) });
    expect(out).not.toBeNull();
    expect(out).toEqual(slotDeck(withGc, 2).permits);
    expect(out).not.toEqual(slotDeck(clean, 2).permits);
  });

  it("flags a swap that completes a two-card combo, through combosAfter", () => {
    expect(bracketAfter({ profile: profile(), declared: 2, add: plain, cutOracleId: "bear", combosAfter: [combo] })).not.toBeNull();
  });

  it("flags a cut that takes the deck's only Game Changer away — a move down is still a move", () => {
    const withGc = profile({ gameChangerIds: new Set(["gc"]) });
    const out = bracketAfter({ profile: withGc, declared: 3, add: plain, cutOracleId: "gc", combosAfter: [] });
    expect(out).toEqual(slotDeck(profile(), 3).permits);
  });

  it("flags an add that is mass land denial", () => {
    expect(bracketAfter({ profile: profile(), declared: 2, add: { ...plain, massLandDenial: ["oracle_rule"] }, cutOracleId: "bear", combosAfter: [] })).not.toBeNull();
  });
});
