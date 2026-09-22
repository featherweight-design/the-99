import { describe, expect, it } from "vitest";
import { comboScopeIds } from "./combo-scope";

describe("comboScopeIds", () => {
  // §4.3b RULE 3. Without the commanders a partner that IS the commander reads `you own it`,
  // with the scope line naming that commander directly above it.
  it("counts the commanders as held, beside the 99", () => {
    expect(
      comboScopeIds({
        cards: [{ oracleId: "a" }, { oracleId: "b" }],
        commander: { oracleId: "cmd" },
        partner: { oracleId: "prt" },
      }),
    ).toEqual(["a", "b", "cmd", "prt"]);
  });

  // A BREW HOLDING ONLY ITS COMMANDER is the case that fails loudest without the rule: every
  // partner it has would be misclassified.
  it("still names the commander on a deck with no cards", () => {
    expect(comboScopeIds({ cards: [], commander: { oracleId: "cmd" } })).toEqual(["cmd"]);
  });

  // An absent partner is omitted rather than sent as a hole, which would reach the server
  // action as a non-uuid and be filtered there — correct, but only by accident.
  it("omits an absent partner rather than sending a hole", () => {
    expect(
      comboScopeIds({ cards: [], commander: { oracleId: "cmd" }, partner: null }),
    ).toEqual(["cmd"]);
  });
});
