import { describe, expect, it } from "vitest";

import { deck, profile, row, support } from "../../src/lib/tuning/cuts-fixture";
import { proposeCuts, type CutWeights } from "../eval/lib/cuts-ranking.mjs";

const ids = (r: ReturnType<typeof proposeCuts>) => r.candidates.map((c) => c.oracleId);
const find = (r: ReturnType<typeof proposeCuts>, id: string) => r.candidates.find((c) => c.oracleId === id);


describe("proposeCuts", () => {
  it("is not offered at exactly 100, commanders included", () => {
    const r = proposeCuts({ profile: profile({}, deck(48)), locked: new Set(), support: null });
    expect(r).toMatchObject({ total: 100, over: 0, candidates: [] });
  });

  it("counts the commander toward the total (ruling 4)", () => {
    const r = proposeCuts({ profile: profile(), locked: new Set(), support: null });
    expect(r.total).toBe(102);
    expect(r.over).toBe(2);
    expect(r.candidates.length).toBeGreaterThan(0);
  });

  it("never offers the commander or a locked card, whatever they score", () => {
    const r = proposeCuts({
      profile: profile(), locked: new Set(["ramp0", "bear0"]),
      support: support([]), // every card off the list: the strongest inclusion signal there is
    });
    expect(ids(r)).not.toContain("cmd");
    expect(ids(r)).not.toContain("ramp0");
    expect(ids(r)).not.toContain("bear0");
    expect(ids(r)).toContain("bear1");
  });

  it("ranks a card off the commander's list above one most of its decks run, and says which", () => {
    const entries: [string, number | null][] = Array.from({ length: 50 }, (_, i) => [`bear${i}`, 90]);
    entries[7] = ["bear7", 4];
    const r = proposeCuts({ profile: profile(), locked: new Set(), support: support(entries.filter(([id]) => id !== "bear3")) });
    const order = ids(r);
    expect(order.indexOf("bear3")).toBeLessThan(order.indexOf("bear7"));
    expect(order.indexOf("bear7")).toBeLessThan(order.indexOf("bear0"));
    expect(find(r, "bear3")!.reason).toEqual({ kind: "offList", listed: 246, deckCount: 21375 });
    expect(find(r, "bear7")!.reason).toEqual({ kind: "inclusion", pct: 4, deckCount: 21375 });
  });

  it("names a role surplus by its counted figure, against the strip's target", () => {
    const r = proposeCuts({ profile: profile(), locked: new Set(), support: null });
    expect(find(r, "ramp0")!.signals).toContainEqual({ kind: "roleSurplus", role: "ramp", have: 12, target: 10 });
  });

  it("demotes a card whose role is under target, and gives it no role reason", () => {
    const r = proposeCuts({ profile: profile(), locked: new Set(), support: support([]) });
    const draw = find(r, "draw0")!;
    expect(draw.opensGap).toBe("draw");
    expect(draw.signals.some((s) => s.kind === "roleSurplus")).toBe(false);
    expect(draw.score).toBeLessThan(find(r, "ramp0")!.score);
  });

  it("ranks a card that opens a role gap below an otherwise identical card that fills no role", () => {
    // Both off the list, both at mana value 2: the gap is the only difference.
    const cards = deck(49, [row({ oracleId: "vanilla", cmc: 2 })]);
    const r = proposeCuts({ profile: profile({}, cards), locked: new Set(), support: support([]) });
    expect(ids(r).indexOf("vanilla")).toBeLessThan(ids(r).indexOf("draw0"));
  });

  it("names curve crowding against the commander's average curve", () => {
    const r = proposeCuts({ profile: profile(), locked: new Set(), support: null });
    expect(find(r, "bear0")!.reason).toEqual({ kind: "curve", cmc: 3, have: 50, average: 30 });
  });

  it("judges a basic land by the land count alone, never as off the list", () => {
    const r = proposeCuts({ profile: profile(), locked: new Set(), support: support([]) });
    const forest = find(r, "forest")!;
    expect(forest.signals).toEqual([{ kind: "roleSurplus", role: "land", have: 37, target: 36 }]);
  });

  it("names a bracket flag with how many the deck holds", () => {
    const r = proposeCuts({
      profile: profile({ gameChangerIds: new Set(["bear1", "bear2"]) }), locked: new Set(), support: null,
    });
    expect(find(r, "bear1")!.signals).toContainEqual({ kind: "bracket", flag: "gameChanger", count: 2 });
    expect(find(r, "bear1")!.score).toBeGreaterThan(find(r, "bear0")!.score);
  });

  it("runs with no EDHREC list and says the inclusion signal is missing (ruling 6)", () => {
    const r = proposeCuts({ profile: profile(), locked: new Set(), support: null });
    expect(r.missing).toEqual(["inclusion"]);
    expect(r.candidates.length).toBeGreaterThan(0);
  });

  it("names asserted role targets and an absent curve as missing", () => {
    const r = proposeCuts({
      profile: profile({
        composition: { pair: null, commander: null, identity: null, count: null },
        roles: { pair: null, commander: null, identity: null, count: null },
      }),
      locked: new Set(),
      support: support([]),
    });
    expect(r.missing).toEqual(["roleTargets", "curve"]);
    expect(r.candidates.length).toBeGreaterThan(0);
  });

  it("names the land target as missing when roles are measured but composition is not", () => {
    const r = proposeCuts({
      profile: profile({ composition: { pair: null, commander: null, identity: null, count: null } }),
      locked: new Set(),
      support: support([]),
    });
    expect(r.missing).toContain("roleTargets");
  });

  it("returns nothing to cut when every card but the commander is locked", () => {
    const p = profile();
    const r = proposeCuts({ profile: p, locked: new Set(p.cards.map((c) => c.oracleId)), support: support([]) });
    expect(r.over).toBe(2);
    expect(r.candidates).toEqual([]);
  });

  it("puts the strongest signal first, and that is the reason", () => {
    const r = proposeCuts({ profile: profile(), locked: new Set(), support: support([]) });
    for (const c of r.candidates) expect(c.reason).toEqual(c.signals[0]);
    // An off-list card carries the heaviest single weight, so it must lead any card it shares with.
    const mixed = r.candidates.filter((c) => c.signals.length > 1 && c.signals.some((s) => s.kind === "offList"));
    expect(mixed.length).toBeGreaterThan(0);
    for (const c of mixed) expect(c.reason.kind).toBe("offList");
  });

  it("scores with the weights it is handed, one signal at a time", () => {
    const sup = support([["ramp0", 90], ["bear0", 2]]);
    const only = (w: Partial<CutWeights>) => proposeCuts({
      profile: profile(), locked: new Set(), support: sup,
      weights: { inclusion: 0, role: 0, curve: 0, bracket: 0, ...w },
    });
    const kinds = (r: ReturnType<typeof proposeCuts>) => new Set(r.candidates.flatMap((c) => c.signals.map((s) => s.kind)));
    expect(kinds(only({ inclusion: 1 }))).toEqual(new Set(["inclusion", "offList"]));
    expect(kinds(only({ role: 1 }))).toEqual(new Set(["roleSurplus"]));
    expect(kinds(only({ curve: 1 }))).toEqual(new Set(["curve"]));
    expect(only({ inclusion: 1 }).candidates[0].oracleId).not.toBe(only({ role: 1 }).candidates[0].oracleId);
  });
});
