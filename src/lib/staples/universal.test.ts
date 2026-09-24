import { describe, expect, it } from "vitest";

import { universalStaples } from "./universal";

const rows = (card: string, conditions: number) =>
  Array.from({ length: conditions }, (_, i) => ({ oracleId: card, condition: `c${i}` }));

describe("universalStaples", () => {
  // 16 conditions, as the table was measured: the bar is 12.
  it("names a card staple in at least three quarters of the conditions", () => {
    const table = [...rows("everywhere", 16), ...rows("twelve", 12), ...rows("eleven", 11)];
    expect(universalStaples(table)).toEqual(new Set(["everywhere", "twelve"]));
  });

  it("moves the bar with the number of conditions", () => {
    const table = [...rows("all", 20), ...rows("fifteen", 15), ...rows("fourteen", 14)];
    expect(universalStaples(table)).toEqual(new Set(["all", "fifteen"]));
  });

  it("counts a condition once, and names none from an empty table", () => {
    expect(universalStaples([...rows("a", 4), { oracleId: "b", condition: "c0" }, { oracleId: "b", condition: "c0" }])).toEqual(new Set(["a"]));
    expect(universalStaples([])).toEqual(new Set());
  });
});
