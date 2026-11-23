import { describe, expect, it, vi } from "vitest";

import type { OfferedCommander, PanelRun, UpgradePanel } from "../../../../lib/precons/upgrade/run";
import { figuresOf, picksOf, upgradeActions, upgradeAsk, upgradeLines, upgradePermits } from "./upgrade-lines";

const lead = (key: string, isFace: boolean): OfferedCommander => ({
  key, isFace, cards: [{ oracleId: key, name: key, manaCost: null, cmc: 4, typeLine: "Legendary Creature" }], line: null, strategies: [],
});
const FIG = { typeCounts: { Instants: 9 }, roles: [{ role: "removal", have: 5, target: 8 }] };
const panel: UpgradePanel = {
  boxBracket: 2, boxPermits: [],
  commanders: [lead("rootha", true), lead("muddle", false)],
  runs: [],
  listFp: "x",
  cards: {
    add1: { owned: false, typeLine: "Instant", image: "https://img/add1", typeGroup: "Instants", role: "removal" },
    add2: { owned: true, availability: { owned: 1, hard: 0, soft: 0, free: 1, claims: [] }, typeGroup: "Creatures", role: null },
    cut1: { owned: true, typeLine: "Artifact", image: null, typeGroup: "Artifacts", role: "ramp" },
  },
  figures: { muddle: FIG },
  allowance: { used: 0, limit: 5, reopensAt: null, nextAt: null },
};
const pair = (n: number, over: Partial<PanelRun["pairs"][number]> = {}) => ({
  cutId: `cut${n}`, cut: `Cut ${n}`, addId: `add${n}`, add: `Add ${n}`, addCents: 120, reason: `Add reason ${n}`, cutReason: `Cut reason ${n}`, position: n, ...over,
});
const run = (over: Partial<PanelRun> = {}): PanelRun => ({
  id: "r1", status: "done", strategyKey: "muddle/3/spellslinger", strategyLabel: "Spells", refunded: false, createdAt: new Date("2026-11-10T12:00:00Z"), pricesAsOf: new Date("2026-11-10T12:00:00Z"),
  pairs: [pair(1), pair(2)], buyTotalCents: 240, bracketBefore: 2, bracketAfter: 3, bracketTarget: 3, listFp: "x",
  toBuy: { cards: 1, cents: 120 }, owned: 1, themes: {}, deck: null, seenAt: null, unpicked: [], ...over,
});

describe("upgradeLines (fresh start R2, call 9)", () => {
  it("draws each pair as an add and a cut, adds first, every line picked, ids as the pick store keys them", () => {
    const lines = upgradeLines(panel, run());
    expect(lines.map((l) => [l.side, l.id, l.cardName, l.picked])).toEqual([
      ["add", "a-add1", "Add 1", true], ["add", "a-add2", "Add 2", true],
      ["cut", "c-cut1", "Cut 1", true], ["cut", "c-cut2", "Cut 2", true],
    ]);
  });

  it("starts from the run's stored unpicked lines, each side on its own", () => {
    const lines = upgradeLines(panel, run({ unpicked: ["c-cut1", "a-add2"] }));
    expect(Object.fromEntries(lines.map((l) => [l.id, l.picked]))).toEqual({ "a-add1": true, "a-add2": false, "c-cut1": false, "c-cut2": true });
  });

  it("puts the pair's reason on the add and the cut's own on the cut; an old run's cut draws none, never the add's", () => {
    const [add, , cut] = upgradeLines(panel, run());
    expect(add.rationale).toBe("Add reason 1");
    expect(cut.rationale).toBe("Cut reason 1");
    const old = upgradeLines(panel, run({ pairs: [pair(1, { cutReason: null })] }));
    expect(old.find((l) => l.side === "cut")!.rationale).toBe("");
  });

  it("carries each card's own bracket line, absent on a run stored before it", () => {
    const lines = upgradeLines(panel, run({ pairs: [pair(1, { addBracketAfter: [3], cutBracketAfter: null })] }));
    expect(lines.map((l) => l.bracketAfter)).toEqual([[3], null]);
    expect(upgradeLines(panel, run()).every((l) => l.bracketAfter === null)).toBe(true);
  });

  it("draws an add's art, type group, role, ownership and claim picture, and prices it at the run's figure", () => {
    const [add1, add2, cut1] = upgradeLines(panel, run());
    expect(add1).toMatchObject({ cardTypeLine: "Instant", cardImageUri: "https://img/add1", typeGroup: "Instants", role: "removal", owned: false, availability: null, inDeck: false });
    expect(add1.price).toEqual({ cents: 120, foilCents: null, etchedCents: null, asOf: new Date("2026-11-10T12:00:00Z") });
    expect(add2).toMatchObject({ owned: true, ownedQuantity: 1, availability: { free: 1 }, typeGroup: "Creatures", role: null });
    expect(cut1).toMatchObject({ typeGroup: "Artifacts", role: "ramp", inDeck: true, owned: false, price: null, availability: null });
  });

  it("every line can be made and none is applied: the result is a plan until Start or Apply", () => {
    expect(upgradeLines(panel, run()).every((l) => l.applies && !l.locked && l.verdict === "pending" && l.applySet === null)).toBe(true);
  });
});

describe("upgradeAsk, upgradePermits and figuresOf", () => {
  it("asks N of each, up to the chosen bracket from where the box plays, with no request or restrictions", () => {
    expect(upgradeAsk(panel, run())).toMatchObject({ runId: "r1", requestedCount: 2, request: null, restrictions: null, bracket: { choice: "up", target: 3 } });
    expect(upgradeAsk(panel, run({ bracketTarget: 2 })).bracket).toEqual({ choice: "keep", target: 2 });
    expect(upgradeAsk(panel, run({ bracketTarget: null })).bracket).toBeNull();
  });

  it("permits the bracket the run found the box at, else the box's own, else none", () => {
    expect(upgradePermits(panel, run())).toEqual([2]);
    expect(upgradePermits({ ...panel, boxBracket: 3 }, run({ bracketBefore: null }))).toEqual([3]);
    expect(upgradePermits({ ...panel, boxBracket: null }, run({ bracketBefore: null }))).toEqual([]);
  });

  it("permits every bracket the box permits when it was read, so a set that keeps bracket 1 stays where it was", () => {
    expect(upgradePermits({ ...panel, boxPermits: [1, 2] }, run())).toEqual([1, 2]);
  });

  it("reads the heads' figures for the run's own commander, and none when the panel has none", () => {
    expect(figuresOf(panel, run())).toBe(FIG);
    expect(figuresOf(panel, run({ strategyKey: "rootha/3/spellslinger" }))).toEqual({ typeCounts: {}, roles: [] });
  });
});

describe("upgradeActions", () => {
  it("stores each pick on the run and hands the stored set back", async () => {
    const pick = vi.fn(async () => ({ ok: true as const, unpicked: ["a-add1"] }));
    const saved = vi.fn();
    const a = upgradeActions("boss.json", "r1", { pick, setBracket: vi.fn() }, saved);
    expect(await a.pick("a-add1", false)).toEqual({ ok: true });
    expect(pick).toHaveBeenCalledWith("r1", "a-add1", false);
    expect(saved).toHaveBeenCalledWith("r1", ["a-add1"]);
  });

  it("says a refused pick, and hands nothing back", async () => {
    const saved = vi.fn();
    const a = upgradeActions("boss.json", "r1", { pick: async () => ({ ok: false as const }), setBracket: vi.fn() }, saved);
    expect(await a.pick("c-cut1", false)).toEqual({ ok: false });
    expect(saved).not.toHaveBeenCalled();
  });

  it("reads the picked set's bracket by oracle id, and nothing on a refusal", async () => {
    const setBracket = vi.fn(async () => ({ permits: [3], bracket: 3 }));
    const a = upgradeActions("boss.json", "r1", { pick: vi.fn(), setBracket }, vi.fn());
    expect(await a.setBracket!("r1", ["a-add1", "a-add2"], ["c-cut1", "c-cut2"])).toEqual({ permits: [3] });
    expect(setBracket).toHaveBeenCalledWith("boss.json", "r1", ["add1", "add2"], ["cut1", "cut2"]);
    setBracket.mockResolvedValueOnce(null as never);
    expect(await a.setBracket!("r1", ["a-add1", "a-add2"], ["c-cut1"])).toBeNull();
  });

  it("never applies or undoes itself: the flow's press does", async () => {
    const a = upgradeActions("boss.json", "r1", { pick: vi.fn(), setBracket: vi.fn() }, vi.fn());
    expect((await a.apply("r1", ["a-add1"], ["c-cut1"], "set")).ok).toBe(false);
    expect((await a.undo("set")).ok).toBe(false);
  });
});

describe("picksOf", () => {
  it("turns picked line ids into the oracle ids Start and Apply take", () => {
    expect(picksOf(["a-add1", "a-add2"], ["c-cut2"])).toEqual({ adds: ["add1", "add2"], cuts: ["cut2"] });
  });
});
