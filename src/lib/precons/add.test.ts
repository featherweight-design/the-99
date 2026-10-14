import { describe, expect, it } from "vitest";
import { preconAddLines } from "./add";
import { preconSource } from "./added";

const printing = (n: string) => ({ scryfallId: `s-${n}`, setCode: "frc", collectorNumber: n });

describe("preconAddLines", () => {
  it("splits each row into its non-foil and foil copies at the box's own printing", () => {
    const lines = preconAddLines([
      { oracleId: "jace", quantity: 1, foilQuantity: 1, printing: printing("1") },
      { oracleId: "plains", quantity: 10, foilQuantity: 2, printing: printing("300") },
      { oracleId: "sol", quantity: 1, foilQuantity: 0, printing: printing("50") },
    ], []);
    expect(lines.items).toEqual([
      { oracleId: "jace", setCode: "frc", collectorNumber: "1", scryfallId: "s-1", finish: "foil", condition: null, quantity: 1 },
      { oracleId: "plains", setCode: "frc", collectorNumber: "300", scryfallId: "s-300", finish: "nonfoil", condition: null, quantity: 8 },
      { oracleId: "plains", setCode: "frc", collectorNumber: "300", scryfallId: "s-300", finish: "foil", condition: null, quantity: 2 },
      { oracleId: "sol", setCode: "frc", collectorNumber: "50", scryfallId: "s-50", finish: "nonfoil", condition: null, quantity: 1 },
    ]);
    expect({ cards: lines.cards, copies: lines.copies, foil: lines.foil }).toEqual({ cards: 3, copies: 12, foil: 3 });
  });

  it("adds a card the catalog has no printing for with none named", () => {
    const { items } = preconAddLines([{ oracleId: "odd", quantity: 1, foilQuantity: 0, printing: null }], []);
    expect(items).toEqual([{ oracleId: "odd", setCode: "", scryfallId: null, finish: "nonfoil", condition: null, quantity: 1 }]);
  });

  it("sums a token listed in two printings into one holding, by its token oracle id", () => {
    const lines = preconAddLines([], [
      { tokenOracleId: "t-soldier", name: "Soldier", quantity: 1 },
      { tokenOracleId: "t-soldier", name: "Soldier", quantity: 2 },
      { tokenOracleId: "t-monarch", name: "The Monarch", quantity: 1 },
    ]);
    expect(lines.tokens).toEqual([{ tokenOracleId: "t-soldier", quantity: 3 }, { tokenOracleId: "t-monarch", quantity: 1 }]);
    expect(lines.tokenNames).toEqual({ "t-soldier": "Soldier", "t-monarch": "The Monarch" });
  });

  it("names its History source after the precon's file", () => {
    expect(preconSource("MultiverseReforged_FRC")).toBe("precon:MultiverseReforged_FRC");
  });
});
