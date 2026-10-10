import { describe, expect, it } from "vitest";
import { heldKey, importPicks, type ImportPrintingCandidate } from "./import-printings";

const c = (oracleId: string, setCode: string, collectorNumber: string, sourceLine: number): ImportPrintingCandidate =>
  ({ oracleId, setCode, collectorNumber, sourceLine });

describe("importPicks", () => {
  const members = new Set(["sol", "atraxa", "signet"]);

  it("makes a held printing the deck's pick", () => {
    const held = new Set([heldKey("sol", "LTC", "284")]);
    expect(importPicks([c("sol", "ltc", "284", 2)], held, members)).toEqual({
      picks: [{ oracleId: "sol", setCode: "ltc", collectorNumber: "284" }],
      notOwned: 0,
    });
  });

  it("takes the first line naming a held printing, not the first line", () => {
    const held = new Set([heldKey("sol", "c21", "263"), heldKey("sol", "ltc", "284")]);
    const { picks } = importPicks(
      [c("sol", "ltc", "284", 9), c("sol", "cmm", "1", 3), c("sol", "c21", "263", 5)],
      held,
      members,
    );
    expect(picks).toEqual([{ oracleId: "sol", setCode: "c21", collectorNumber: "263" }]);
  });

  it("counts a card whose lines name only printings the player does not hold, once", () => {
    const { picks, notOwned } = importPicks(
      [c("signet", "cmm", "1", 1), c("signet", "c21", "2", 4), c("sol", "ltc", "284", 2)],
      new Set([heldKey("sol", "ltc", "284")]),
      members,
    );
    expect(picks.map((p) => p.oracleId)).toEqual(["sol"]);
    expect(notOwned).toBe(1);
  });

  it("ignores a card the deck does not hold", () => {
    expect(importPicks([c("loose", "ltc", "1", 1)], new Set([heldKey("loose", "ltc", "1")]), members))
      .toEqual({ picks: [], notOwned: 0 });
  });

  it("matches a collector number exactly", () => {
    expect(importPicks([c("sol", "ltc", "284", 1)], new Set([heldKey("sol", "ltc", "284a")]), members).notOwned)
      .toBe(1);
  });
});
