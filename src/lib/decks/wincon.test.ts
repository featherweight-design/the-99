import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));

import { winconSets, winningCombosQuery, type WinconCombo } from "./wincon";

const combo = (pieces: string[], produces: string[], over: Partial<WinconCombo> = {}): WinconCombo =>
  ({ variantId: pieces.join("+"), produces, popularity: 100, pieces, commanderOk: true, ...over });
const WIN = ["Win the game"];

describe("winconSets", () => {
  const combos = [
    combo(["thoracle", "consult"], WIN),
    combo(["kiki", "conscripts"], ["Infinite creature tokens with haste"]),
    combo(["cmd", "bond"], ["Infinite lifeloss for target opponent"]),
    combo(["a", "b", "c", "d", "e"], WIN),
    combo(["l", "m", "n"], WIN),
    combo(["x", "y"], WIN, { commanderOk: false }),
  ];

  it("offers winning combos first at bracket 3 and up, then finishers, a commander never a piece", () => {
    expect(winconSets({ combos, finishers: ["craterhoof"], commanderIds: ["cmd"], bracket: 3 })).toEqual([
      ["thoracle", "consult"], ["bond"], ["craterhoof"],
    ]);
    expect(winconSets({ combos, finishers: ["craterhoof"], commanderIds: ["cmd"], bracket: 4 })).toEqual([
      ["thoracle", "consult"], ["bond"], ["l", "m", "n"], ["craterhoof"],
    ]);
  });

  it("offers only two-card combos at bracket 3, which the gate can judge, and longer ones at 4", () => {
    const three = [combo(["a", "b", "c"], WIN), combo(["d", "e"], WIN)];
    expect(winconSets({ combos: three, finishers: [], commanderIds: [], bracket: 3 })).toEqual([["d", "e"]]);
    expect(winconSets({ combos: three, finishers: [], commanderIds: [], bracket: 4 })).toEqual([["a", "b", "c"], ["d", "e"]]);
  });

  it("offers finishers alone at bracket 1 and 2, and with no bracket answer", () => {
    for (const bracket of [null, 1, 2] as const) {
      expect(winconSets({ combos, finishers: ["craterhoof"], commanderIds: ["cmd"], bracket })).toEqual([["craterhoof"]]);
    }
  });

  it("offers a set once", () => {
    const twice = [combo(["a", "b"], WIN), combo(["b", "a"], WIN, { variantId: "other" })];
    expect(winconSets({ combos: twice, finishers: ["a"], commanderIds: [], bracket: 4 })).toEqual([["a", "b"], ["a"]]);
  });
});

describe("winningCombosQuery", () => {
  it("groups from the card side, casts both lists, and keeps a variant only when every card is allowed", () => {
    const q = new PgDialect().sqlToQuery(winningCombosQuery(["p1"], ["cmd"]));
    expect(q.sql).toContain("vc.oracle_id = any($");
    expect(q.sql).toMatch(/::uuid\[\]\) and v\.card_count <=|::uuid\[\]\)\s+and v\.card_count <=/);
    expect(q.sql).toContain("having count(*) = v.card_count");
    expect(q.sql).toContain("cardinality(v.requires_template_ids) = 0");
    expect(q.params).toEqual([["cmd"], ["p1"], 4, 5000]);
  });
});
