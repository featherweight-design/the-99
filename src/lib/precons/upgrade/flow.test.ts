import { describe, expect, it } from "vitest";
import { runKey, bracketOffers, choose, complete, decodePicks, encodePicks, impliedPicks, NO_PICKS, pickSteps, sameRun, strategiesFor, upgradeOffered } from "./flow";
import type { OfferedCommander, PanelRun, UpgradePanel } from "./run";

const strat = (key: string) => ({ key, label: key, blurb: "b", source: "edhrec" as const, backingIds: [], backing: [] });
const lead = (key: string, strategies = ["spells", "tokens"]): OfferedCommander => ({ key, isFace: true, cards: [], line: null, strategies: strategies.map(strat) });
const panel = (over: Partial<UpgradePanel> = {}): UpgradePanel => ({
  boxBracket: 2, commanders: [lead("a"), lead("b", ["tokens"])], runs: [],
  allowance: { used: 0, limit: 5, reopensAt: null, nextAt: null },
  ...over,
});
const run = (over: Partial<PanelRun> = {}): PanelRun => ({
  id: "r", status: "done", strategyKey: runKey("a", 3, "spells"), strategyLabel: "Spells", refunded: false, createdAt: new Date(), pairs: [],
  buyTotalCents: 0, bracketBefore: 2, bracketAfter: 3, bracketTarget: 3, listFp: "x", toBuy: { cards: 0, cents: 0 }, owned: 0, ...over,
});

describe("bracketOffers", () => {
  it("offers the box's own bracket and every one above it, never one below", () => {
    expect(bracketOffers(2)).toEqual([2, 3, 4]);
    expect(bracketOffers(3)).toEqual([3, 4]);
    expect(bracketOffers(4)).toEqual([4]);
    expect(bracketOffers(null)).toEqual([]);
  });
});

describe("pickSteps and impliedPicks", () => {
  it("walks Commander, Bracket, Strategy, and preselects nothing", () => {
    expect(pickSteps(panel())).toEqual(["commander", "bracket", "strategy"]);
    expect(impliedPicks(panel())).toEqual(NO_PICKS);
  });
  it("skips a Commander step with one card and makes the pick", () => {
    const p = panel({ commanders: [lead("a")] });
    expect(pickSteps(p)).toEqual(["bracket", "strategy"]);
    expect(impliedPicks(p).commander).toBe("a");
  });
  it("skips the Bracket step for a box at 4, whose one rung is its own", () => {
    const p = panel({ boxBracket: 4 });
    expect(pickSteps(p)).toEqual(["commander", "strategy"]);
    expect(impliedPicks(p).bracket).toBe(4);
  });
});

describe("choose", () => {
  const all = { commander: "a", bracket: 3 as const, strategy: "spells" };
  it("a new commander clears the strategy and keeps the bracket; a new bracket clears the strategy", () => {
    expect(choose(all, "commander", "b")).toEqual({ commander: "b", bracket: 3, strategy: null });
    expect(choose(all, "bracket", 4)).toEqual({ commander: "a", bracket: 4, strategy: null });
  });
  it("the same pick again clears nothing", () => {
    expect(choose(all, "commander", "a")).toBe(all);
    expect(choose(all, "bracket", 3)).toBe(all);
  });
  it("is complete only with all three", () => {
    expect(complete(all)).toBe(true);
    expect(complete({ ...all, strategy: null })).toBe(false);
  });
});

describe("strategiesFor", () => {
  it("is per commander", () => {
    expect(strategiesFor(panel(), "b").map((s) => s.key)).toEqual(["tokens"]);
    expect(strategiesFor(panel(), null)).toEqual([]);
  });
});

describe("sameRun", () => {
  const picks = { commander: "a", bracket: 3 as const, strategy: "spells" };
  it("finds a kept run of the same commander, bracket and strategy", () => {
    expect(sameRun([run()], picks)?.id).toBe("r");
  });
  it("ignores another bracket, another strategy, a pending run and an unfinished pick", () => {
    expect(sameRun([run({ strategyKey: runKey("a", 4, "spells"), bracketTarget: 4 })], picks)).toBeNull();
    expect(sameRun([run({ strategyKey: runKey("a", 3, "tokens") })], picks)).toBeNull();
    expect(sameRun([run({ status: "pending" })], picks)).toBeNull();
    expect(sameRun([run()], { ...picks, strategy: null })).toBeNull();
  });
});

describe("the signed-out return", () => {
  const p = panel();
  it("round-trips the three picks", () => {
    const raw = encodePicks({ commander: "a", bracket: 3, strategy: "spells" });
    expect(decodePicks(raw, p)).toEqual({ commander: "a", bracket: 3, strategy: "spells" });
  });
  it("refuses a pick that is not offered, below the box, or malformed", () => {
    expect(decodePicks("a.3.nope", p)).toBeNull();
    expect(decodePicks("zz.3.spells", p)).toBeNull();
    expect(decodePicks("a.3.spells", panel({ boxBracket: 4 }))).toBeNull();
    expect(decodePicks("a.9.spells", p)).toBeNull();
    expect(decodePicks("a.3", p)).toBeNull();
    expect(decodePicks(null, p)).toBeNull();
  });
});

describe("upgradeOffered", () => {
  it("draws the press only when the bracket was read and some commander has a strategy", () => {
    expect(upgradeOffered(panel())).toBe(true);
    expect(upgradeOffered(null)).toBe(false);
    expect(upgradeOffered(panel({ boxBracket: null }))).toBe(false);
    expect(upgradeOffered(panel({ commanders: [lead("a", [])] }))).toBe(false);
  });
});
