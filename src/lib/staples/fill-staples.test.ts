import { describe, expect, it } from "vitest";

import { chooseFillStaples, fillStapleCondition, gatherFillStaples, type StapleRow } from "./fill-staples";

/** 16 conditions, as the table was measured: universal needs 12. */
const CONDITIONS = ["W", "U", "B", "R", "G", "UW", "BW", "RW", "GW", "BU", "RU", "GU", "BR", "BG", "GR", "count:3"];
const everywhere = (oracleId: string, avgInclusion: number, gameChanger = false): StapleRow[] =>
  CONDITIONS.map((condition) => ({ oracleId, condition, avgInclusion, gameChanger }));
const row = (oracleId: string, condition: string, avgInclusion: number, gameChanger = false): StapleRow =>
  ({ oracleId, condition, avgInclusion, gameChanger });

describe("fillStapleCondition", () => {
  const all = new Set(CONDITIONS);
  it("takes the exact identity where the table carries it, in either letter order", () => {
    expect(fillStapleCondition(["W"], all)).toBe("W");
    expect(fillStapleCondition(["W", "R"], all)).toBe("RW");
  });
  it("serves a three-color deck from count:3", () => {
    expect(fillStapleCondition(["W", "U", "B"], all)).toBe("count:3");
  });
  it("gives colorless, four- and five-color decks no condition (Hugh, 2026-10-03)", () => {
    const withMore = new Set([...all, "C", "count:4", "count:5"]);
    expect(fillStapleCondition([], withMore)).toBeNull();
    expect(fillStapleCondition(["W", "U", "B", "R"], withMore)).toBeNull();
    expect(fillStapleCondition(["W", "U", "B", "R", "G"], withMore)).toBeNull();
  });
});

describe("chooseFillStaples", () => {
  const table = [
    ...everywhere("sol-ring", 70),
    ...everywhere("signet", 55),
    ...everywhere("rift", 40, true),
    row("swords", "W", 60), row("path", "W", 52), row("thin", "W", 49),
    row("bolt", "R", 58), row("tithe", "W", 66, true),
    row("rakdos", "count:3", 51),
  ];

  it("offers universal staples first by mean inclusion, then the condition's rows at the bar", () => {
    expect(chooseFillStaples(table, ["W"])).toEqual(["sol-ring", "signet", "swords", "path"]);
  });
  it("never offers a Game Changer, universal or not", () => {
    const ids = chooseFillStaples(table, ["W"]);
    expect(ids).not.toContain("rift");
    expect(ids).not.toContain("tithe");
  });
  it("reads only the deck's own condition", () => {
    expect(chooseFillStaples(table, ["R"])).toEqual(["sol-ring", "signet", "bolt"]);
    expect(chooseFillStaples(table, ["W", "U", "B"])).toEqual(["sol-ring", "signet", "rakdos"]);
  });
  it("gives a four-color deck universal staples only", () => {
    expect(chooseFillStaples(table, ["W", "U", "B", "R"])).toEqual(["sol-ring", "signet"]);
  });
});

describe("gatherFillStaples", () => {
  const owned = (id: string) => ({
    oracleId: id, name: id, typeLine: "Artifact", oracleText: null, keywords: [], manaCost: null,
    layout: "normal", owned: true, ownedQuantity: 1, inclusionPct: 60,
  });
  const card = (id: string) => ({
    oracleId: id, name: id, typeLine: "Instant", oracleText: null, keywords: [], manaCost: null,
    layout: "normal",
  });
  const base = {
    identity: ["W"], scoped: [owned("sol")], excludeOracleIds: new Set<string>(),
    commanderIds: new Set<string>(), sleeveableOnly: false, inclusionOf: () => 42,
  };
  const reads = (ids: string[]) => ({
    staples: async () => ids,
    cards: async (want: readonly string[]) => want.map(card),
  });

  it("takes an owned staple from the pool and an unowned one from the catalog, in offer order", async () => {
    const got = await gatherFillStaples(base, reads(["swords", "sol"]));
    expect(got.map((c) => [c.oracleId, c.owned, c.inclusionPct])).toEqual([
      ["swords", false, 42], ["sol", true, 60],
    ]);
  });

  it("reads nothing from the catalog for a sleeveable fill", async () => {
    const got = await gatherFillStaples({ ...base, sleeveableOnly: true }, reads(["swords", "sol"]));
    expect(got.map((c) => c.oracleId)).toEqual(["sol"]);
  });

  it("drops what the deck holds, a commander, and anything outside the allow-list", async () => {
    const r = reads(["sol", "swords", "path", "cmd"]);
    expect((await gatherFillStaples({
      ...base, excludeOracleIds: new Set(["swords"]), commanderIds: new Set(["cmd"]),
    }, r)).map((c) => c.oracleId)).toEqual(["sol", "path"]);
    expect((await gatherFillStaples({ ...base, onlyOracleIds: new Set(["path"]) }, r))
      .map((c) => c.oracleId)).toEqual(["path"]);
  });
});
