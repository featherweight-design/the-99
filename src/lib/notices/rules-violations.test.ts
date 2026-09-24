import { describe, expect, it } from "vitest";

import { offendingIds, rulesViolations } from "./rules-violations";
import { dataGroup, inGroupOrder } from "./group";

const card = (oracleId: string, colorIdentity: string[] = [], commanderLegal = true) => ({ oracleId, colorIdentity, commanderLegal });

describe("rulesViolations", () => {
  it("lists a card not legal in Commander, and a card outside the identity with its colors", () => {
    const v = rulesViolations([card("ban", [], false), card("red", ["R"]), card("ok", ["G"])], [card("cmd", ["G"])]);
    expect(v).toEqual({ notLegal: ["ban"], outsideColors: [{ oracleId: "red", colors: ["R"] }] });
    expect(offendingIds(v)).toEqual(["ban", "red"]);
  });

  it("takes both commanders' colors, and never reports a commander against itself", () => {
    const v = rulesViolations([card("ub", ["U", "B"])], [card("u", ["U"]), card("b", ["B"])]);
    expect(v.outsideColors).toEqual([]);
  });

  it("counts a banned commander", () => {
    expect(rulesViolations([], [card("cmd", ["G"], false)]).notLegal).toEqual(["cmd"]);
  });
});

describe("the group order (F8)", () => {
  it("puts legality first, the findings in their row's order, rules last", () => {
    const items = ["rules", "combo", "notLegal", "gameChanger", "outsideColors", "extraTurns"] as const;
    const groupOf = (k: (typeof items)[number]) =>
      k === "notLegal" || k === "outsideColors" ? k : dataGroup(k)!;
    expect(inGroupOrder([...items], groupOf).map((g) => g.group))
      .toEqual(["notLegal", "outsideColors", "gameChangers", "extraTurns", "twoCardCombos", "rules"]);
  });

  it("gives a ban-dating entry no data group of its own", () => {
    expect(dataGroup("notLegal")).toBeNull();
  });
});
