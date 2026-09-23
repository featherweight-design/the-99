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
    expect(pack.targets.measured).toBe(false);
    expect(pack.targets.roles.find((t) => t.role === "ramp")?.have).toBe(10);
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
});
