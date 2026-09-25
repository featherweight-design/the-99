import { describe, expect, it } from "vitest";

import { buildDeckProfile, type ProfileCardRow, type ProfileInput } from "../profile/build";
import { buildPlayGroup } from "../profile/play";
import type { DetectionCoverage, FlagSource, StapleRef } from "../profile/types";
import { buildEvidencePack } from "./evidence";

const DETECTION: DetectionCoverage = {
  massLandDenial: { methods: ["m"], basis: "t" },
  extraTurn: { methods: ["m"], basis: "t" },
  twoCardCombos: { methods: ["m"], basis: "t" },
};

const row = (over: Partial<ProfileCardRow> & { oracleId: string }): ProfileCardRow => ({
  name: over.oracleId, typeLine: "Creature — Elf", oracleText: null, keywords: [],
  cmc: 2, colorIdentity: ["G"], manaCost: "{1}{G}", quantity: 1, commanderLegal: true, layout: "normal",
  ...over,
});

const ramp = (oracleId: string) => row({ oracleId, oracleText: "{T}: Add {G}." });

const staple = (oracleId: string): StapleRef => ({
  oracleId, name: oracleId, commanders: 200, commanderTotal: 336, avgInclusion: 0.62, weightedRank: 3,
});

// A ramp commander and nine ramp cards in the 99, against a MEASURED ramp target of 10.
const cards = [ramp("cmd"), ...Array.from({ length: 9 }, (_, i) => ramp(`r${i}`)), row({ oracleId: "bear" })];

function profile(over: Partial<ProfileInput> = {}) {
  return buildDeckProfile({
    deckId: "d", fingerprint: "f", cards, commanderOracleIds: ["cmd"], identity: ["G"],
    condition: "G",
    composition: { pair: null, commander: null, identity: null, count: null },
    roles: { pair: null, commander: { ramp: 10, draw: 10, removal: 8, wipes: 3 }, identity: null, count: null },
    thinCondition: false,
    staples: [staple("bear"), staple("cultivate")], commanderDeckCount: 1000, population: null,
    mldFlags: new Map<string, FlagSource[]>(), extraTurnFlags: new Map<string, FlagSource[]>(),
    gameChangerIds: new Set<string>(), twoCardCombos: [], tutorIds: new Set<string>(),
    detection: DETECTION,
    ...over,
  });
}

const input = () => ({
  profile: profile(),
  play: buildPlayGroup([]),
  intent: "grind it out",
  owned: new Set(["r0", "cultivate"]),
});

describe("buildEvidencePack", () => {
  it("excludes staples already in the deck", () => {
    expect(buildEvidencePack(input()).staples.map((s) => s.oracleId)).toEqual(["cultivate"]);
  });

  it("forwards a staple's breadth as a count with its denominator, and no proportion", () => {
    const [s] = buildEvidencePack(input()).staples;
    expect(s).toEqual({ oracleId: "cultivate", name: "cultivate", commanders: 200, commanderTotal: 336, owned: true });
  });

  it("carries no figure a percentage could be written from", () => {
    expect(JSON.stringify(buildEvidencePack(input()))).not.toMatch(/\b0\.\d+\b/);
  });

  it("marks the commander so a cut can be refused for naming one", () => {
    const pack = buildEvidencePack(input());
    expect(pack.cards.filter((c) => c.commander).map((c) => c.oracleId)).toEqual(["cmd"]);
    expect(pack.commanders).toEqual([{ oracleId: "cmd", name: "cmd" }]);
  });

  it("measures a measured target against the 99 alone, as fitSkeleton does", () => {
    const r = buildEvidencePack(input()).targets.roles.find((t) => t.role === "ramp");
    expect(r).toMatchObject({ have: 9, target: 10 });
  });

  it("measures the flat fallback against the whole deck, commander included", () => {
    const flat = profile({ roles: { pair: null, commander: null, identity: null, count: null } });
    const pack = buildEvidencePack({ ...input(), profile: flat });
    expect(pack.targets.roles.find((t) => t.role === "ramp")).toMatchObject({ have: 10, measured: false });
  });

  it("treats a measured chain with a non-finite target as the flat fallback it becomes", () => {
    // recommendedMix drops to its flat figures here, so the count must drop to the whole deck.
    const broken = profile({ roles: { pair: null, commander: { ramp: Number.NaN, draw: 10, removal: 8, wipes: 3 }, identity: null, count: null } });
    const r = buildEvidencePack({ ...input(), profile: broken }).targets.roles.find((t) => t.role === "ramp");
    expect(r).toMatchObject({ target: 10, have: 10, measured: false });
  });

  it("calls a measured land average asserted when a non-finite role target sends landTarget flat", () => {
    const TARGETS = { land: 34, basic: 14, nonbasic: 20, creature: 26, instant: 11, sorcery: 5, artifact: 13, enchantment: 6, planeswalker: 1, battle: 0 };
    const withLand = { composition: { pair: null, commander: { targets: TARGETS, averageCurve: null }, identity: null, count: null } };
    const ok = buildEvidencePack({ ...input(), profile: profile(withLand) }).targets.roles.find((t) => t.role === "land");
    expect(ok).toMatchObject({ target: 34, measured: true });
    const broken = profile({ ...withLand, roles: { pair: null, commander: { ramp: Number.NaN, draw: 10, removal: 8, wipes: 3 }, identity: null, count: null } });
    const land = buildEvidencePack({ ...input(), profile: broken }).targets.roles.find((t) => t.role === "land");
    expect(land).toMatchObject({ target: 37, measured: false });
  });

  it("flags land on its own chain: measured roles beside an asserted land count", () => {
    const land = buildEvidencePack(input()).targets.roles.find((t) => t.role === "land");
    const ramp = buildEvidencePack(input()).targets.roles.find((t) => t.role === "ramp");
    expect(ramp?.measured).toBe(true);
    expect(land?.measured).toBe(false);
  });

  it("carries the advisory flag through, and land as a range", () => {
    const land = buildEvidencePack(input()).targets.roles.find((t) => t.role === "land");
    expect(land?.advisory).toBe(true);
  });

  it("tags each card with every role it holds, and says what the reader owns", () => {
    const pack = buildEvidencePack(input());
    expect(pack.cards.find((c) => c.oracleId === "r0")).toMatchObject({ roles: ["ramp"], owned: true });
    expect(pack.cards.find((c) => c.oracleId === "bear")).toMatchObject({ roles: [], owned: false });
  });

  it("builds a pack with no games, and passes the intent through", () => {
    const pack = buildEvidencePack(input());
    expect(pack.play.summary.count).toBe(0);
    expect(pack.intent).toBe("grind it out");
  });

  // The prompt and the validator both read this one figure, so a call crossing a New Year cannot
  // format a note's date one way and check it another.
  it("takes the note year once, from the clock it is given", () => {
    expect(buildEvidencePack({ ...input(), now: new Date("2027-01-01T00:00:01Z") }).year).toBe(2027);
  });
});


describe("the overview and the universal staples (v2)", () => {
  it("unmarks the strategy and keeps only the Key cards this deck still holds", () => {
    const pack = buildEvidencePack({ ...input(), overview: { strategy: ["Ramp with [[r0]], then win."], keyCards: ["[[r1]]", "  BEAR ", "Gone Card"] } });
    expect(pack.strategy).toEqual({ steps: ["Ramp with r0, then win."], keyCards: [{ oracleId: "r1", name: "r1" }, { oracleId: "bear", name: "bear" }] });
  });

  it("resolves a Key card written with a curly apostrophe, as the overview's validator does", () => {
    const withSaga = profile({ cards: [...cards, row({ oracleId: "saga", name: "Urza's Saga" })] });
    const pack = buildEvidencePack({ ...input(), profile: withSaga, overview: { strategy: ["Assemble."], keyCards: ["Urza\u2019s Saga"] } });
    expect(pack.strategy?.keyCards).toEqual([{ oracleId: "saga", name: "Urza's Saga" }]);
  });

  it("has no strategy for a deck with no overview", () => {
    expect(buildEvidencePack(input()).strategy).toBeNull();
    expect(buildEvidencePack({ ...input(), overview: null }).strategy).toBeNull();
  });

  it("keeps every universal staple by id, sorted by name as the eval listed them, even two sharing a name", () => {
    const universal = [{ oracleId: "z", name: "Sol Ring" }, { oracleId: "a2", name: "Arcane Signet" }, { oracleId: "a", name: "Arcane Signet" }, { oracleId: "z", name: "Sol Ring" }];
    expect(buildEvidencePack({ ...input(), universal }).universal).toEqual([
      { oracleId: "a", name: "Arcane Signet" }, { oracleId: "a2", name: "Arcane Signet" }, { oracleId: "z", name: "Sol Ring" },
    ]);
  });
});
