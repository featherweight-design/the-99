import { describe, expect, it } from "vitest";

import type { ValidationReport } from "../validate";
import { v2Line } from "./results-fixture";
import { bracketOutcome, cutAskOf, groupLines, groupsAt, pickCap, shortFacts, shortOfAsk, tally } from "./results";

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
    expect(bracketOutcome([2], up, adds(1))).toEqual({ kind: "missed", from: 2, aim: up });
  });
  it("claims no outcome for a set the single-line flags cannot settle", () => {
    // Two Game Changers into a bracket-3 deck holding two: each alone stays inside the allowance, together they are over.
    const gc = (id: string) => v2Line(id, "add", { bracketAfter: null });
    expect(bracketOutcome([3], { choice: "keep", target: 3 }, [gc("g1"), gc("g2"), ...cuts(2)])).toBeNull();
    expect(bracketOutcome([2], up, [v2Line("f", "add", { bracketAfter: [3] }), v2Line("g", "add"), ...cuts(2)])).toBeNull();
    // One pair, but its cut moves the bracket too: the pair lies between the two, not at the aim.
    expect(bracketOutcome([2], up, [v2Line("f", "add", { bracketAfter: [3] }), v2Line("c", "cut", { bracketAfter: [1] })])).toBeNull();
    // One pair whose cut moves nothing: the flags settle it.
    expect(bracketOutcome([3], { choice: "keep", target: 3 }, [gc("g1"), ...cuts(1)])).toEqual({ kind: "stays", bracket: 3 });
  });
  it("reaches Down's target when a picked line takes the lowest bracket there", () => {
    const down = { choice: "down" as const, target: 1 };
    expect(bracketOutcome([2], down, [v2Line("c", "cut", { bracketAfter: [1, 2] })])).toEqual({ kind: "reached", from: 2, to: 1 });
    expect(bracketOutcome([2], down, cuts(1))?.kind).toBe("missed");
  });
  it("says nothing with no reading", () => {
    expect(bracketOutcome([], null, [])).toBeNull();
  });
  it("lets the whole set's own permits settle a set the flags cannot", () => {
    const gc = (id: string) => v2Line(id, "add", { bracketAfter: null });
    const keep = { choice: "keep" as const, target: 3 };
    const two = [gc("g1"), gc("g2"), ...cuts(2)];
    expect(bracketOutcome([3], keep, two, [3])).toEqual({ kind: "stays", bracket: 3 });
    // Two Game Changers together over a bracket-3 deck's allowance: Keep claims nothing rather than "stays".
    expect(bracketOutcome([3], keep, two, [4])).toBeNull();
    expect(bracketOutcome([2], up, [gc("a"), gc("b"), ...cuts(2)], [3])).toEqual({ kind: "reached", from: 2, to: 3 });
    expect(bracketOutcome([2], up, [gc("a"), gc("b"), ...cuts(2)], [2])).toEqual({ kind: "missed", from: 2, aim: up });
    const down = { choice: "down" as const, target: 1 };
    expect(bracketOutcome([2], down, [...adds(2), ...cuts(2)], [1, 2])).toEqual({ kind: "reached", from: 2, to: 1 });
    // Short of the aim but moved: "missed" would say the deck stays at 4.
    const toTwo = { choice: "down" as const, target: 2 };
    expect(bracketOutcome([4], toTwo, [...adds(2), ...cuts(2)], [3])).toBeNull();
    expect(bracketOutcome([4], toTwo, [...adds(2), ...cuts(2)], [4])).toEqual({ kind: "missed", from: 4, aim: toTwo });
    // One line a side: the flags still decide, whatever a stale set read says.
    expect(bracketOutcome([2], up, adds(1), [3])).toEqual({ kind: "missed", from: 2, aim: up });
  });
});

describe("cutAskOf", () => {
  it("states the cut call's stored ask, else the ask of a cut call beside the refill", () => {
    expect(cutAskOf(10, 6)).toBe(6);
    expect(cutAskOf(10, undefined)).toBe(15);
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
    expect(shortFacts(20, [...adds(14), ...cuts(21)], r)).toEqual({ kind: "bound", side: "add", found: 14, reason: "overCap", dropped: 19, exhausted: false });
  });
  it("is refunded when no restriction explains the gap", () => {
    const r = report({ shortReason: { add: null, cut: null }, charge: { outcome: "refunded", why: "underProduced" } });
    expect(shortFacts(10, [...adds(8), ...cuts(12)], r)).toEqual({ kind: "refunded", side: "add", found: 8 });
  });
  it("reads a short cut list against the additions kept", () => {
    expect(shortFacts(10, [...adds(10), ...cuts(9)], report({}))).toEqual({ kind: "refunded", side: "cut", found: 9 });
  });
  it("reads zero cuts kept by the player's own bracket as a bound cut list, charged, never as a failed cut call", () => {
    const r = report({ shortReason: { add: null, cut: "bracketAim" }, charge: { outcome: "spent" } }, {
      drops: [{ side: "cut", position: 0, rule: "bracketAim" }],
    });
    expect(shortFacts(3, adds(5), r)).toEqual({ kind: "bound", side: "cut", found: 0, reason: "bracketAim", dropped: 1, exhausted: false });
  });
  it("names the shorter list when both came back short", () => {
    const r = report({ shortReason: { add: "overCap", cut: "notOwned" }, charge: { outcome: "spent" } });
    expect(shortFacts(20, [...adds(14), ...cuts(10)], r)).toMatchObject({ kind: "bound", side: "cut", found: 10, reason: "notOwned" });
    expect(shortFacts(20, [...adds(10), ...cuts(14)], r)).toMatchObject({ kind: "bound", side: "add", found: 10, reason: "overCap" });
  });
  it("marks owned additions short because every owned card that fits was used", () => {
    const r = report({ shortReason: { add: "notOwned", cut: null }, poolExhausted: true, charge: { outcome: "spent" } });
    expect(shortFacts(10, [...adds(4), ...cuts(6)], r)).toEqual({ kind: "bound", side: "add", found: 4, reason: "notOwned", dropped: 0, exhausted: true });
    expect(shortFacts(10, [...adds(4), ...cuts(6)], report({ shortReason: { add: "notOwned", cut: null }, charge: { outcome: "spent" } })))
      .toMatchObject({ exhausted: false });
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
  it("measures the cuts against the cut call's real ask when the run stored it", () => {
    // The cut call asked 15 beside an additions refill that ended at 6: the cuts are 3 short of 15, not over a derived 9.
    expect(shortOfAsk(10, [...adds(6), ...cuts(12)], report({ cutAsk: 15 }))).toEqual({ side: "cut", short: 3, asked: 15, reason: null });
  });
  it("reads the run's stored reason before counting drops, and an exhausted owned pool before either", () => {
    const drops = { drops: [{ side: "add" as const, position: 0, rule: "overCap" as const }, { side: "add" as const, position: 1, rule: "overCap" as const }] };
    expect(shortOfAsk(10, [...adds(12), ...cuts(15)], report({ shortReason: { add: "offSet", cut: null } }, drops))).toMatchObject({ side: "add", short: 3, reason: "offSet" });
    expect(shortOfAsk(10, [...adds(12), ...cuts(15)], report({ poolExhausted: true, shortReason: { add: null, cut: null } }, drops)))
      .toEqual({ side: "add", short: 3, asked: 15, reason: "ownedExhausted" });
    expect(shortOfAsk(10, [...adds(12), ...cuts(15)], report({}, drops))).toMatchObject({ reason: "overCap" });
  });
  it("is null when both lists met their ask", () => {
    expect(shortOfAsk(10, [...adds(15), ...cuts(15)], report({}))).toBeNull();
  });
});

// The bar's and the confirmation's bracket names the bracket the player DECLARED while the permits hold it: a deck read as
// [1,2] and declared Core stays "2 · Core", never the range's floor (the 390/1300 walk read "stays 1 · Exhibition").
describe("bracketOutcome with a declared bracket", () => {
  const keep = { choice: "keep" as const, target: 2, low: 1 };
  it("names the declared bracket inside a range", () => {
    expect(bracketOutcome([1, 2], keep, adds(1), null, 2)).toEqual({ kind: "stays", bracket: 2 });
    expect(bracketOutcome([1, 2], null, [], null, 2)).toEqual({ kind: "stays", bracket: 2 });
  });
  it("names the lowest permitted with no declaration, or one the permits do not hold", () => {
    expect(bracketOutcome([1, 2], keep, adds(1))).toEqual({ kind: "stays", bracket: 1 });
    expect(bracketOutcome([3], { choice: "keep", target: 3 }, adds(1), null, 1)).toEqual({ kind: "stays", bracket: 3 });
  });
  it("starts a reach or a miss from the declared bracket", () => {
    const up = { choice: "up" as const, target: 3 };
    expect(bracketOutcome([1, 2], up, [v2Line("f", "add", { bracketAfter: [3] })], null, 2)).toEqual({ kind: "reached", from: 2, to: 3 });
    expect(bracketOutcome([1, 2], up, adds(1), null, 2)).toEqual({ kind: "missed", from: 2, aim: up });
  });
  it("names it for a whole set only while the set's own permits still hold it", () => {
    const two = [...adds(2), ...cuts(2)];
    expect(bracketOutcome([1, 2], keep, two, [1, 2], 2)).toEqual({ kind: "stays", bracket: 2 });
    expect(bracketOutcome([1, 2], keep, two, [1], 2)).toEqual({ kind: "stays", bracket: 1 });
  });
});

// Copilot round 1: a stay or a miss reads "bracket stays …", so it names the declaration only while the RESULTING permits
// hold it; a reach may name it regardless, as where the deck came from.
describe("bracketOutcome names the declaration only where the picks keep it", () => {
  const keep = { choice: "keep" as const, target: 5, low: 4 };
  it("drops a declared 5 from a stay once a picked line leaves only 4", () => {
    const cut = v2Line("c", "cut", { bracketAfter: [4] });
    expect(bracketOutcome([4, 5], keep, [cut], null, 5)).toEqual({ kind: "stays", bracket: 4 });
    expect(bracketOutcome([4, 5], keep, [v2Line("c", "cut", { bracketAfter: [4, 5] })], null, 5)).toEqual({ kind: "stays", bracket: 5 });
  });
  it("drops it from a miss the same way, line by line and for a whole set", () => {
    const up = { choice: "up" as const, target: 3 };
    expect(bracketOutcome([1, 2], up, [v2Line("c", "cut", { bracketAfter: [1] })], null, 2)).toEqual({ kind: "missed", from: 1, aim: up });
    const two = [...adds(2), ...cuts(2)];
    const down = { choice: "down" as const, target: 3 };
    expect(bracketOutcome([4, 5], down, two, [4], 5)).toEqual({ kind: "missed", from: 4, aim: down });
    expect(bracketOutcome([4, 5], down, two, [4, 5], 5)).toEqual({ kind: "missed", from: 5, aim: down });
  });
  it("keeps it on a reach, as the deck's starting point", () => {
    const up = { choice: "up" as const, target: 3 };
    expect(bracketOutcome([1, 2], up, [v2Line("f", "add", { bracketAfter: [3] })], null, 2)).toEqual({ kind: "reached", from: 2, to: 3 });
  });
});
