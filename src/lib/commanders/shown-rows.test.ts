import { describe, expect, it } from "vitest";
import { rankAmongShown, shownRows } from "./shown-rows";

const rows = ["a", "h1", "b", "h2", "c"].map((oracleId) => ({ oracleId }));
const hidden = new Set(["h1", "h2"]);

describe("shownRows", () => {
  it("drops the hidden rows, in order", () => {
    expect(shownRows(rows, hidden).map((r) => r.oracleId)).toEqual(["a", "b", "c"]);
  });
  it("is the same array when nothing is hidden", () => {
    expect(shownRows(rows, new Set())).toBe(rows);
    expect(shownRows(rows, undefined)).toBe(rows);
  });
});

describe("rankAmongShown", () => {
  it("counts only the shown rows ahead, so a hidden row takes no place", () => {
    expect(rankAmongShown(rows, 0, hidden)).toEqual({ rank: 1, hidden: false });
    expect(rankAmongShown(rows, 2, hidden)).toEqual({ rank: 2, hidden: false });
    expect(rankAmongShown(rows, 4, hidden)).toEqual({ rank: 3, hidden: false });
  });
  it("gives a hidden row no rank", () => {
    expect(rankAmongShown(rows, 3, hidden)).toEqual({ rank: null, hidden: true });
  });
  it("agrees with the position in shownRows (the two in-memory forms are one definition)", () => {
    const shown = shownRows(rows, hidden);
    for (const [at, r] of rows.entries()) {
      const { rank } = rankAmongShown(rows, at, hidden);
      if (rank !== null) expect(shown[rank - 1]).toBe(r);
    }
  });
});
