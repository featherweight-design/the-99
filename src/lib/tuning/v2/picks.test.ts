import { describe, expect, it } from "vitest";

import { planPicks, type PickLine } from "./picks";

const add = (id: string, over: Partial<PickLine> = {}): PickLine => ({ id, addOracleId: `o-${id}`, cutOracleId: null, verdict: "pending", applySet: null, ...over });
const cut = (id: string, over: Partial<PickLine> = {}): PickLine => ({ id, addOracleId: null, cutOracleId: `o-${id}`, verdict: "pending", applySet: null, ...over });
const lines = [add("a1"), add("a2"), add("a3"), cut("c1"), cut("c2"), cut("c3")];

describe("planPicks (spec §7)", () => {
  it("takes M additions and M cuts, M from 1 to N", () => {
    const r = planPicks({ requestedCount: 3, lines, addIds: ["a1", "a3"], cutIds: ["c2", "c1"] });
    expect(r).toEqual({ ok: true, adds: [lines[0], lines[2]], cuts: [lines[4], lines[3]] });
  });

  it("refuses unequal counts and an empty set", () => {
    expect(planPicks({ requestedCount: 3, lines, addIds: ["a1", "a2"], cutIds: ["c1"] })).toEqual({ ok: false, reason: "unequal" });
    expect(planPicks({ requestedCount: 3, lines, addIds: [], cutIds: [] })).toEqual({ ok: false, reason: "unequal" });
  });

  it("refuses more of each than the run was asked for", () => {
    expect(planPicks({ requestedCount: 2, lines, addIds: ["a1", "a2", "a3"], cutIds: ["c1", "c2", "c3"] }))
      .toEqual({ ok: false, reason: "overCount" });
  });

  it("refuses a line from the other list, another run, a repeat, or one already settled", () => {
    const refuse = (addIds: string[], cutIds: string[], over: PickLine[] = lines) =>
      planPicks({ requestedCount: 3, lines: over, addIds, cutIds });
    expect(refuse(["c1"], ["c2"])).toEqual({ ok: false, reason: "notOpen" });
    expect(refuse(["elsewhere"], ["c1"])).toEqual({ ok: false, reason: "notOpen" });
    expect(refuse(["a1", "a1"], ["c1", "c2"])).toEqual({ ok: false, reason: "notOpen" });
    expect(refuse(["a1"], ["c1"], [add("a1", { applySet: "set-1" }), cut("c1")])).toEqual({ ok: false, reason: "notOpen" });
    expect(refuse(["a1"], ["c1"], [add("a1"), cut("c1", { verdict: "dismissed" })])).toEqual({ ok: false, reason: "notOpen" });
  });
});
