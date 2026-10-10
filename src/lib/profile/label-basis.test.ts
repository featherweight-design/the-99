// The deck profile's role basis (labels-everywhere PR 8). Two halves: with the switch OFF the
// profile, and everything the paid model is handed from it, is byte-identical to before; with it
// ON the roles are the cards' labels, graded against label targets, and the two evidence readers
// (the pack and the cut facts) agree on which flat fallback to use.
import { describe, expect, it } from "vitest";

import { LABEL_ROLE_TARGETS, ROLE_TARGETS } from "../recs/roles";
import { cutFacts } from "../tuning/cuts";
import { buildEvidencePack } from "../tuning/evidence";
import { buildPlayGroup } from "./play";
import { buildDeckProfile, type ProfileCardRow, type ProfileInput } from "./build";
import type { DetectionCoverage, FlagSource } from "./types";
import type { LabelTargetRole } from "../labels/role-sets";

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

const NO_ROLES = { pair: null, commander: null, identity: null, count: null };

// A text-ramp card the labels do NOT call ramp, a counterspell the classifier calls removal, a
// card with no label at all (text ramp), and a land.
const cards: ProfileCardRow[] = [
  row({ oracleId: "cmd", oracleText: "{T}: Add {G}." }),
  row({ oracleId: "rock", typeLine: "Artifact", oracleText: "{T}: Add {C}." }),
  row({ oracleId: "counter", typeLine: "Instant", oracleText: "Counter target spell." }),
  row({ oracleId: "unlabelled", oracleText: "{T}: Add {G}." }),
  row({ oracleId: "bolt", typeLine: "Instant", oracleText: "Destroy target creature." }),
  row({ oracleId: "forest", typeLine: "Basic Land — Forest", oracleText: "{T}: Add {G}.", manaCost: null, quantity: 3 }),
];
const sets = new Map<string, LabelTargetRole[]>([
  ["cmd", ["ramp"]],
  ["rock", []],              // labelled, and the label names none of the four
  ["counter", []],           // a counterspell is not removal
  ["bolt", ["removal"]],
  ["forest", []],            // labels never count a land toward the four
]);

function input(over: Partial<ProfileInput> = {}): ProfileInput {
  return {
    deckId: "d", fingerprint: "f", cards, commanderOracleIds: ["cmd"], identity: ["G"], condition: "G",
    composition: { pair: null, commander: null, identity: null, count: null },
    roles: NO_ROLES, thinCondition: false, staples: [], commanderDeckCount: null, population: null,
    mldFlags: new Map<string, FlagSource[]>(), extraTurnFlags: new Map<string, FlagSource[]>(),
    gameChangerIds: new Set<string>(), twoCardCombos: [], tutorIds: new Set<string>(),
    detection: DETECTION, ...over,
  };
}
const labelled = () => input({ labels: { sets, roleTargets: { of: "flat", targets: { ...LABEL_ROLE_TARGETS } } } });

describe("switch off: the profile and the model inputs are unchanged", () => {
  it("builds the same profile whether `labels` is absent or explicitly undefined, with no basis marker", () => {
    const a = buildDeckProfile(input());
    const b = buildDeckProfile(input({ labels: undefined }));
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    expect(JSON.stringify(a)).not.toContain("roleBasis");
    expect(a.skeleton.roleTargets).toEqual({ of: "flat", targets: ROLE_TARGETS });
  });

  it("counts by the classifier", () => {
    const p = buildDeckProfile(input());
    expect(p.roles.counts).toMatchObject({ ramp: 3, removal: 2, land: 3 });
    expect(p.roles.cards.ramp.map((c) => c.oracleId)).toEqual(["cmd", "rock", "unlabelled"]);
  });

  it("hands the evidence pack, the cut facts and the synopsis facts the classifier's flat targets", () => {
    const p = buildDeckProfile(input());
    const pack = buildEvidencePack({ profile: p, play: buildPlayGroup([]), intent: "", owned: new Set() });
    const targets = Object.fromEntries(pack.targets.roles.map((r) => [r.role, r.target]));
    expect(targets).toMatchObject({ ramp: ROLE_TARGETS.ramp, draw: ROLE_TARGETS.draw, removal: ROLE_TARGETS.removal, wipes: ROLE_TARGETS.wipes });
    const facts = cutFacts({ profile: p, locked: new Set(), support: null, declaredBracket: null });
    expect(Object.fromEntries(facts.roles.map((r) => [r.role, r.target]))).toMatchObject({ ramp: ROLE_TARGETS.ramp, wipes: ROLE_TARGETS.wipes });
  });
});

describe("switch on: the labels basis", () => {
  const p = buildDeckProfile(labelled());

  it("marks the skeleton and takes the label targets", () => {
    expect(p.skeleton.roleBasis).toBe("labels");
    expect(p.skeleton.roleTargets).toEqual({ of: "flat", targets: LABEL_ROLE_TARGETS });
  });

  it("counts a labelled card by its label, a counterspell as no removal, and a land as land alone", () => {
    expect(p.roles.cards.ramp.map((c) => c.oracleId).sort()).toEqual(["cmd", "unlabelled"]);
    expect(p.roles.cards.removal.map((c) => c.oracleId)).toEqual(["bolt"]);
    expect(p.roles.counts).toMatchObject({ ramp: 2, removal: 1, land: 3 });
    expect(p.roles.cards.land.map((c) => c.oracleId)).toEqual(["forest"]);
  });

  it("falls back to the classifier for a card with no label, and for that card alone", () => {
    expect(p.roles.cards.ramp.map((c) => c.oracleId)).toContain("unlabelled");
    expect(p.roles.cards.ramp.map((c) => c.oracleId)).not.toContain("rock");
  });

  it("keeps the 99-only count for the commander's label role", () => {
    expect(p.roles.excludingCommanders).toMatchObject({ ramp: 1 });
  });

  it("grades the evidence pack and the cut facts against the LABEL flat targets, not the classifier's", () => {
    const pack = buildEvidencePack({ profile: p, play: buildPlayGroup([]), intent: "", owned: new Set() });
    expect(pack.targets.roles.find((r) => r.role === "ramp")).toMatchObject({ target: LABEL_ROLE_TARGETS.ramp, have: 2, measured: false });
    const facts = cutFacts({ profile: p, locked: new Set(), support: null, declaredBracket: null });
    expect(facts.roles.find((r) => r.role === "ramp")).toMatchObject({ target: LABEL_ROLE_TARGETS.ramp, have: 2 });
    expect(facts.roles.find((r) => r.role === "wipes")?.target).toBe(LABEL_ROLE_TARGETS.wipes);
  });
});
