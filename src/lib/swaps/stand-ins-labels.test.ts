import { describe, expect, it } from "vitest";

import type { PriceFact } from "../decks/price";
import type { Job as LabelJob } from "../labels/types";
import type { DeckLens } from "./honest";
import { rankStandIns, STAND_IN_GROUP_CAP, type Candidate, type CardRow, type StandInGroups } from "./stand-ins";

const NOW = new Date("2026-10-02T09:00:00Z");
let n = 0;
const card = (name: string, typeLine: string, oracleText: string, cmc = 2): CardRow => ({
  oracleId: `00000000-0000-4000-9000-${String(++n).padStart(12, "0")}`,
  name, typeLine, oracleText, keywords: [], cmc, imageUri: null,
});
const cand = (c: CardRow): Candidate => ({ ...c, inclusion: null, synergy: null, isUniversal: false, owned: 1, free: 1, soft: 0 });
const job = (over: Record<string, unknown>): LabelJob => ({
  restrictedTo: null, affects: null, to: null, method: null, trigger: "none", recurrence: "oneShot",
  threshold: null, modal: false, ...over,
}) as LabelJob;
const removal = (over: Record<string, unknown> = {}) => job({ space: "role", kind: "removal", method: "destroy", ...over });
const LENS: DeckLens = { keyType: null, isSubtype: () => false, held: new Set(), heldTypes: new Set(["creature"]) };
const priced = { newestAsOf: NOW, prices: new Map<string, PriceFact>() };
const rank = (o: CardRow, c: CardRow[], labels?: Map<string, LabelJob[]>) =>
  rankStandIns(o, c.map(cand), priced, () => false, STAND_IN_GROUP_CAP, LENS, labels);
const all = (g: StandInGroups) => g.groups.flatMap((x) => x.rows);
const names = (g: StandInGroups) => all(g).map((s) => s.card.name);

const MURDER = card("Murder", "Instant", "Destroy target creature.", 3);
const PATH = card("Swords to Plowshares", "Instant", "Exile target creature. Its controller gains life equal to its power.", 1);
const UNSUMMON = card("Unsummon", "Instant", "Return target creature to its owner's hand.", 1);
/** A text the role reader names nothing in: only its label can make it a stand-in. */
const ODD = card("Odd Hex", "Instant", "Target creature's owner shuffles it into their library.", 2);
const DRAW = card("Divination", "Sorcery", "Draw two cards.", 3);

describe("stand-ins read labels only where both cards carry one (Q1)", () => {
  it("an empty label map ranks exactly as the text comparison does (inert while the switch is off)", () => {
    const pool = [PATH, UNSUMMON, ODD, DRAW];
    expect(rank(MURDER, pool, new Map())).toEqual(rank(MURDER, pool));
  });

  it("a pair with one side unlabelled is compared by text", () => {
    const onlyOriginal = new Map([[MURDER.oracleId, [removal()]]]);
    expect(names(rank(MURDER, [PATH, ODD], onlyOriginal))).toEqual(names(rank(MURDER, [PATH, ODD])));
    const onlyCandidate = new Map([[ODD.oracleId, [removal()]]]);
    expect(names(rank(MURDER, [ODD], onlyCandidate))).toEqual([]);
  });

  it("a label-only stand-in reaches the sheet when both are labelled", () => {
    expect(names(rank(MURDER, [ODD]))).toEqual([]);
    const labels = new Map([[MURDER.oracleId, [removal()]], [ODD.oracleId, [removal({ method: "destroy" })]]]);
    expect(names(rank(MURDER, [ODD], labels))).toEqual(["Odd Hex"]);
  });

  it("a labelled pair that fails a gate is dropped, even where the text would match", () => {
    const labels = new Map([
      [MURDER.oracleId, [removal({ affects: null })]],
      [PATH.oracleId, [removal({ affects: "opponents", method: "exile" })]],
    ]);
    expect(names(rank(MURDER, [PATH]))).toEqual(["Swords to Plowshares"]);
    expect(names(rank(MURDER, [PATH], labels))).toEqual([]);
  });

  it("Q3: a bounce kept for an exile ranks below the exile and names what it loses", () => {
    const exiler = card("Exiler", "Instant", "Exile target creature.", 2);
    const zealous = card("Zealous Banishing", "Instant", "Target creature's owner shuffles it into their library.", 2);
    const labels = new Map([
      [exiler.oracleId, [removal({ method: "exile" })]],
      [UNSUMMON.oracleId, [removal({ method: "bounce" })]],
      [zealous.oracleId, [removal({ method: "exile" })]],
    ]);
    const read = rank(exiler, [UNSUMMON, zealous], labels);
    // Named to sort AFTER Unsummon, so only the advice puts it first.
    expect(names(read)).toEqual(["Zealous Banishing", "Unsummon"]);
    expect(all(read).map((s) => s.lostMethods)).toEqual([[], ["exile"]]);
  });

  it("a labelled original whose text names no job becomes a spell job from its label", () => {
    expect(rank(ODD, [MURDER]).job.kind).toBe("none");
    const labels = new Map([[ODD.oracleId, [removal()]], [MURDER.oracleId, [removal()]]]);
    const read = rank(ODD, [MURDER, PATH], labels);
    expect(read.job).toEqual({ kind: "spell", roles: [], mv: 2 });
    expect(read.jobRoles).toEqual(["removal"]);
    // Path is unlabelled, so it is compared by text against a job with no text roles: not offered.
    expect(names(read)).toEqual([]);
  });

  it("modal alternatives count once in the sort", () => {
    const charm = card("Charm", "Instant", "Choose one —\n• Destroy target creature.\n• Draw a card.", 2);
    const both = card("Both", "Instant", "Destroy target creature. Draw a card.", 2);
    const draw = job({ space: "role", kind: "draw", affects: "self" });
    const labels = new Map([
      [MURDER.oracleId, [removal(), draw]],
      [charm.oracleId, [removal({ modal: true }), { ...draw, modal: true }]],
      [both.oracleId, [removal(), draw]],
    ]);
    const read = rank(MURDER, [charm, both], labels);
    expect(names(read)).toEqual(["Both", "Charm"]);
    expect(all(read).map((s) => s.credit)).toEqual([2, 1]);
  });
});
