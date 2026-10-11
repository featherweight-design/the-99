import { beforeEach, describe, expect, it, vi } from "vitest";

const loadComboFacts = vi.fn();
vi.mock("./combo-facts", () => ({ loadComboFacts: (...a: unknown[]) => loadComboFacts(...a) }));
vi.mock("../staples/universal", () => ({ loadUniversalStaples: async () => new Set<string>() }));
const readLabels = vi.fn();
vi.mock("../labels/read", () => ({ readLabels: (...a: unknown[]) => readLabels(...a) }));
vi.mock("../../db", () => ({
  db: { select: () => ({ from: () => ({ where: async () => [] }) }) },
}));

import { factsFor } from "./generate";

const ref = (name: string) => ({ oracleId: `id-${name}`, name });
// The same minimal profile facts.test.ts builds: one two-card combo the profile itself holds.
const profile = {
  commanderOracleIds: ["id-Kratos"],
  cards: ["Kratos", "Walking Ballista", "Heliod"].map((name) => ({
    oracleId: `id-${name}`, name, typeLine: "Card", cmc: 1, quantity: 1, layout: "normal",
  })),
  counts: { landCapable: 37 },
  roles: { counts: { ramp: 11 }, cards: { ramp: [], draw: [], removal: [], wipes: [], land: [] } },
  colours: { identity: ["R"], unproducible: [] },
  brackets: { comboReach: { tutors: [], reaches: [] }, twoCardCombos: [{ cards: [ref("Walking Ballista"), ref("Heliod")], produces: ["Infinite damage"], usesCommander: false, manaValueNeeded: 0, variantId: "p" }] },
} as never;

describe("factsFor combo wiring", () => {
  beforeEach(() => loadComboFacts.mockReset());

  it("puts the any-size read's lists on the facts when v2 is on", async () => {
    const combo = { pieces: ["A", "B", "C"], produces: ["Infinite mana"], usesCommander: false, manaNeeded: 0 };
    const near = { have: "D", missing: "E", produces: ["Win the game"] };
    loadComboFacts.mockResolvedValueOnce({ combos: [combo], nearCombos: [near] });
    const facts = await factsFor(profile, true);
    expect(facts.combos).toEqual([combo]);
    expect(facts.nearCombos).toEqual([near]);
  });

  it("keeps the profile's two-card list, and no near combos, when the read fails", async () => {
    loadComboFacts.mockResolvedValueOnce(null);
    const facts = await factsFor(profile, true);
    expect(facts.combos?.map((c) => c.pieces)).toEqual([["Walking Ballista", "Heliod"]]);
    expect(facts.nearCombos).toEqual([]);
  });

  it("does not run the read when v2 is off", async () => {
    const facts = await factsFor(profile, false);
    expect(loadComboFacts).not.toHaveBeenCalled();
    expect(facts.combos?.length).toBe(1);
  });
});

describe("factsFor interaction, behind DECK_BENCHMARKS_ENABLED", () => {
  const counter = { space: "role", kind: "counterspell", restrictedTo: null, affects: "opponents", trigger: "none", recurrence: "oneShot", threshold: null, modal: false, to: null, method: null };
  beforeEach(() => readLabels.mockReset());

  it("quotes the benchmarks' reading when on: a counterspell is interaction", async () => {
    readLabels.mockResolvedValueOnce(new Map([["id-Heliod", [counter]]]));
    const facts = await factsFor(profile, false, true);
    expect(facts.stats?.interaction).toMatchObject({ total: 1, cheap: 1 });
  });

  it("reads no labels and keeps the classifier's figures when off", async () => {
    const facts = await factsFor(profile, false, false);
    expect(readLabels).not.toHaveBeenCalled();
    expect(facts.stats?.interaction.total).toBe(0);
  });

  it("keeps the classifier's figures when the label read fails", async () => {
    readLabels.mockRejectedValueOnce(new Error("down"));
    const facts = await factsFor(profile, false, true);
    expect(facts.stats?.interaction.total).toBe(0);
  });
});
