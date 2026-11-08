// The profile counts a card in the roles the deck strip does: one membership rule (`rolesOfCard`,
// `jobRowsFor`), so the Analysis figures and the facts a model is handed are the strip's numbers.
import { describe, expect, it } from "vitest";

import { computeLabelRoleCounts, roleMembers } from "../decks/label-role-counts";
import type { JobRowsByCard } from "../decks/job-tally";
import { primaryRole } from "../recs/roles";
import { cutFacts } from "../tuning/cuts";
import { cutCounts } from "../tuning/cuts-count";
import { row } from "../tuning/cuts-fixture";
import { buildDeckProfile, type ProfileCardRow, type ProfileInput } from "./build";
import type { DetectionCoverage, FlagSource } from "./types";

const DETECTION: DetectionCoverage = {
  massLandDenial: { methods: ["m"], basis: "t" },
  extraTurn: { methods: ["m"], basis: "t" },
  twoCardCombos: { methods: ["m"], basis: "t" },
};

const cmd = row({ oracleId: "cmd", typeLine: "Legendary Creature — Elf", oracleText: "{T}: Add {G}." });
// The 99: a multi-role label, an unlabeled text card, a labeled-none card, a land, a stack of copies.
const nonCommander: ProfileCardRow[] = [
  row({ oracleId: "both", oracleText: "Draw a card. {T}: Add {G}." }),
  row({ oracleId: "unlabeled", oracleText: "{T}: Add {G}." }),
  row({ oracleId: "unlabeledMulti", oracleText: "{T}: Add {G}. Draw a card." }),
  row({ oracleId: "none", oracleText: "Destroy target creature." }),
  row({ oracleId: "forest", typeLine: "Basic Land — Forest", oracleText: "{T}: Add {G}.", manaCost: null, quantity: 4 }),
  row({ oracleId: "bolt", typeLine: "Instant", oracleText: "Destroy target creature.", quantity: 3 }),
];
const byCard: JobRowsByCard = {
  cmd: ["ramp"],
  both: ["ramp", "draw"],
  none: [],            // labeled, does none of the four: in no role, whatever the text says
  forest: ["ramp"],    // a land is the land role alone
  bolt: ["removal", "protection"],
};

function build(cards: ProfileCardRow[], by: JobRowsByCard | undefined, targets = { ramp: 0, draw: 0, removal: 0, wipes: 0 }) {
  const input: ProfileInput = {
    deckId: "d", fingerprint: "f", cards, commanderOracleIds: ["cmd"], identity: ["G"], condition: "G",
    composition: { pair: null, commander: null, identity: null, count: null },
    roles: { pair: null, commander: null, identity: null, count: null },
    thinCondition: false, staples: [], commanderDeckCount: null, population: null,
    mldFlags: new Map<string, FlagSource[]>(), extraTurnFlags: new Map<string, FlagSource[]>(),
    gameChangerIds: new Set<string>(), twoCardCombos: [], tutorIds: new Set<string>(),
    detection: DETECTION,
    ...(by ? { labels: { byCard: by, roleTargets: { of: "commander" as const, targets } } } : {}),
  };
  return buildDeckProfile(input);
}

/** What the deck page hands the strip: the 99, each card's classifier role, its copies. */
const strip = (cards: ProfileCardRow[]) =>
  cards.map((c) => ({ oracleId: c.oracleId, name: c.name, role: primaryRole(c), quantity: c.quantity }));

describe("profile.roles is the strip's tally", () => {
  const p = build([cmd, ...nonCommander], byCard);
  const stripCounts = computeLabelRoleCounts(strip(nonCommander), byCard);

  it("equals the strip over the 99 once the commander is left out", () => {
    expect(p.roles.excludingCommanders).toEqual(stripCounts);
  });

  it("counts a multi-role label in every role, copies once per role", () => {
    expect(p.roles.cards.ramp.map((c) => c.oracleId)).toContain("both");
    expect(p.roles.cards.draw.map((c) => c.oracleId)).toEqual(["both"]);
  });

  it("reads an unlabeled card by the classifier's single role, as the strip does", () => {
    // `unlabeledMulti` matches ramp and draw in text: the strip's `card.role` is the first, ramp.
    expect(p.roles.cards.draw.map((c) => c.oracleId)).not.toContain("unlabeledMulti");
    expect(p.roles.cards.ramp.map((c) => c.oracleId)).toEqual(expect.arrayContaining(["unlabeled", "unlabeledMulti"]));
  });

  it("puts a labeled-none card in no role, and a land in land alone", () => {
    for (const role of ["ramp", "draw", "removal", "wipes"] as const) {
      expect(p.roles.cards[role].map((c) => c.oracleId)).not.toContain("none");
      expect(p.roles.cards[role].map((c) => c.oracleId)).not.toContain("forest");
    }
    expect(p.roles.cards.land.map((c) => c.oracleId)).toEqual(["forest"]);
    expect(p.roles.counts.land).toBe(4);
  });

  it("counts copies, and a non-role label row (protection) adds nothing", () => {
    expect(p.roles.counts.removal).toBe(3);
  });

  it("includes the commander in `counts` and keeps it out of `excludingCommanders`", () => {
    expect(p.roles.counts.ramp).toBe(p.roles.excludingCommanders.ramp + 1);
    expect(p.roles.cards.ramp.map((c) => c.oracleId)).toContain("cmd");
  });

  it("without labels is the strip's no-label read: the classifier's single role", () => {
    const q = build([cmd, ...nonCommander], undefined);
    expect(q.roles.excludingCommanders).toEqual(computeLabelRoleCounts(strip(nonCommander), null));
  });
});

describe("the cuts figure is the list a role row opens", () => {
  it("equals the strip's roleMembers copies for every role row (measured targets)", () => {
    const p = build([cmd, ...nonCommander], byCard);
    const facts = cutFacts({ profile: p, locked: new Set(), support: null, declaredBracket: null });
    const rows = cutCounts(facts, null, "Cmd").rows.filter((r) => r.source === "role" && r.role && r.role !== "land");
    expect(rows.length).toBeGreaterThan(0);
    const cards = strip(nonCommander);
    for (const r of rows) {
      const listed = roleMembers(cards, byCard, r.role!).reduce((n, c) => n + c.quantity, 0);
      expect(r.figure).toBe(listed);
    }
  });
});
