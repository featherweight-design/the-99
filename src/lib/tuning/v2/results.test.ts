import { describe, expect, it } from "vitest";

import type { ValidationReport } from "../validate";
import { v2Line } from "./results-fixture";
import { bracketOutcome, groupLines, groupsAt, pickCap, shortFacts, shortOfAsk, tally } from "./results";

const adds = (k: number) => Array.from({ length: k }, (_, i) => v2Line(`a${i}`, "add"));
const cuts = (k: number) => Array.from({ length: k }, (_, i) => v2Line(`c${i}`, "cut"));

const report = (v2: Partial<NonNullable<ValidationReport["v2"]>>, extra: Partial<ValidationReport> = {}): ValidationReport => ({
  askedCount: 0, survivedCount: 0, keptCount: 0,
  v2: { requestHash: "h", restrictions: { capCents: null, sets: [], ownedOnly: false }, in: { add: true, cut: true }, refilling: { add: false, cut: false }, ...v2 },
  ...extra,
});

describe("pickCap", () => {
  it("is N while the run is still being made", () => {
    expect(pickCap(10, [...adds(2)], false)).toBe(10);
  });
  it("follows the shorter open list once made", () => {
    expect(pickCap(3, [...adds(5), ...cuts(5)], true)).toBe(3);
    expect(pickCap(20, [...adds(14), ...cuts(21)], true)).toBe(14);
    // Applied lines are no longer open: the next set picks from what is left.
    const applied = adds(5).map((l, i) => (i < 3 ? { ...l, verdict: "accepted" as const } : l));
    expect(pickCap(3, [...applied, ...cuts(5)], true)).toBe(2);
  });
  it("is 0 for a run with no cuts (plan P4)", () => {
    expect(pickCap(3, adds(5), true)).toBe(0);
  });
});

describe("tally", () => {
  it("counts each side and where the deck would go", () => {
    expect(tally([...adds(3), ...cuts(2)])).toEqual({ adds: 3, cuts: 2, total: 100, equal: false });
    expect(tally([...adds(2), ...cuts(2)])).toEqual({ adds: 2, cuts: 2, total: 99, equal: true });
  });
});

describe("groupsAt", () => {
  it("groups from N = 4 and stays flat at 5 a side or fewer", () => {
    expect(groupsAt(3)).toBe(false);
    expect(groupsAt(4)).toBe(true);
    expect(groupsAt(20)).toBe(true);
  });
});

describe("bracketOutcome", () => {
  const up = { choice: "up" as const, target: 3 };
  it("stays at the deck's bracket with Keep or no aim", () => {
    expect(bracketOutcome([2], null, [])).toEqual({ kind: "stays", bracket: 2 });
    expect(bracketOutcome([2], { choice: "keep", target: 2 }, adds(1))).toEqual({ kind: "stays", bracket: 2 });
  });
  it("reaches Up's target when a picked addition brings it within reach, else says it missed", () => {
    const flagged = v2Line("f", "add", { bracketAfter: [3] });
    expect(bracketOutcome([2], up, [flagged])).toEqual({ kind: "reached", from: 2, to: 3 });
    expect(bracketOutcome([2], up, adds(2))).toEqual({ kind: "missed", from: 2, aim: up });
  });
  it("reaches Down's target when a picked line takes the lowest bracket there", () => {
    const down = { choice: "down" as const, target: 1 };
    expect(bracketOutcome([2], down, [v2Line("c", "cut", { bracketAfter: [1, 2] })])).toEqual({ kind: "reached", from: 2, to: 1 });
    expect(bracketOutcome([2], down, cuts(1))?.kind).toBe("missed");
  });
  it("says nothing with no reading", () => {
    expect(bracketOutcome([], null, [])).toBeNull();
  });
});

describe("groupLines", () => {
  const lines = [
    v2Line("a", "add", { typeGroup: "Instants", role: "removal" }),
    v2Line("b", "add", { typeGroup: "Creatures", role: null }),
    v2Line("c", "add", { typeGroup: "Creatures", role: "draw" }),
  ];
  const figures = { typeCounts: { Creatures: 34, Instants: 9 }, roles: [{ role: "removal", have: 6, target: 10 }, { role: "draw", have: 7, target: 10 }] };
  it("groups by type in the deck page's order with the deck's count, and where the picks take it", () => {
    const g = groupLines(lines, "type", figures, (l) => l.id === "b");
    expect(g.map((x) => [x.key, x.lines.map((l) => l.id), x.have, x.withPicks])).toEqual([
      ["Creatures", ["b", "c"], 34, 35],
      ["Instants", ["a"], 9, null],
    ]);
  });
  it("groups by role in the shelf order with what the deck has, a role-less line last", () => {
    const g = groupLines(lines, "role", figures, (l) => l.id === "a");
    expect(g.map((x) => [x.key, x.have, x.target, x.withPicks])).toEqual([
      ["draw", 7, 10, null],
      ["removal", 6, 10, 7],
      ["other", null, null, null],
    ]);
  });
  it("takes a picked cut away from its group's count", () => {
    const g = groupLines([v2Line("x", "cut", { typeGroup: "Creatures" })], "type", figures, () => true);
    expect(g[0].withPicks).toBe(33);
  });
});

describe("shortFacts", () => {
  it("is null for a full run", () => {
    expect(shortFacts(3, [...adds(5), ...cuts(5)], report({}))).toBeNull();
  });
  it("names the restriction that bound a short list, charged, with the drops it made", () => {
    const r = report({ shortReason: { add: "overCap", cut: null }, charge: { outcome: "spent" } }, {
      drops: Array.from({ length: 19 }, (_, i) => ({ side: "add" as const, position: i, rule: "overCap" as const })),
    });
    expect(shortFacts(20, [...adds(14), ...cuts(21)], r)).toEqual({ kind: "bound", side: "add", found: 14, reason: "overCap", dropped: 19 });
  });
  it("is refunded when no restriction explains the gap", () => {
    const r = report({ shortReason: { add: null, cut: null }, charge: { outcome: "refunded", why: "underProduced" } });
    expect(shortFacts(10, [...adds(8), ...cuts(12)], r)).toEqual({ kind: "refunded", side: "add", found: 8 });
  });
  it("reads a short cut list against the additions kept", () => {
    expect(shortFacts(10, [...adds(10), ...cuts(9)], report({}))).toEqual({ kind: "refunded", side: "cut", found: 9 });
  });
  it("reads a failed cut call as a run with no cuts (plan P4)", () => {
    expect(shortFacts(3, adds(5), report({ cutsFailed: { errorClass: "timeout" } }))).toEqual({ kind: "noCuts" });
  });
});

describe("shortOfAsk", () => {
  it("says which list came up short of what it asked for, and why", () => {
    const r = report({ target: { add: 10, cut: 10 } }, { drops: [{ side: "cut", position: 0, rule: "bracketAim" }] });
    expect(shortOfAsk(10, [...adds(15), ...cuts(12)], r)).toEqual({ side: "cut", short: 3, asked: 15, reason: "bracketAim" });
  });
  it("is null when both lists met their ask", () => {
    expect(shortOfAsk(10, [...adds(15), ...cuts(15)], report({}))).toBeNull();
  });
});
