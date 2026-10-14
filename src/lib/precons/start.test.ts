import { describe, expect, it } from "vitest";
import { preconPins, preconTokenPins } from "./start";

describe("preconTokenPins", () => {
  it("keeps one printing per token, the first by id, whatever order the rows arrive in", () => {
    const rows = [
      { tokenOracleId: "t2", tokenPrintingId: "p9" },
      { tokenOracleId: "t1", tokenPrintingId: "p5" },
      { tokenOracleId: "t2", tokenPrintingId: "p3" },
      { tokenOracleId: "t1", tokenPrintingId: "p7" },
    ];
    const want = [{ tokenOracleId: "t1", tokenPrintingId: "p5" }, { tokenOracleId: "t2", tokenPrintingId: "p3" }];
    expect(preconTokenPins(rows)).toEqual(want);
    expect(preconTokenPins([...rows].reverse())).toEqual(want);
  });

  it("pins nothing for a box with no tokens", () => {
    expect(preconTokenPins([])).toEqual([]);
  });
});

describe("preconPins", () => {
  it("pins each card at its first printing in the feed's order, lowercasing the set", () => {
    expect(preconPins([
      { oracleId: "a", quantity: 1, isCommander: true, setCode: "FRC", collectorNumber: "1" },
      { oracleId: "b", quantity: 2, isCommander: false, setCode: "FRC", collectorNumber: "300" },
      { oracleId: "b", quantity: 2, isCommander: false, setCode: "FRC", collectorNumber: "301" },
      { oracleId: "c", quantity: 1, isCommander: false, setCode: null, collectorNumber: null },
    ])).toEqual([
      { oracleId: "a", setCode: "frc", collectorNumber: "1" },
      { oracleId: "b", setCode: "frc", collectorNumber: "300" },
    ]);
  });
});
