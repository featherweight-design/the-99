import { describe, expect, it } from "vitest";
import { rollForFirst } from "./first-roll";

const fixed = (...values: number[]) => {
  let i = 0;
  return () => values[i++];
};

describe("rollForFirst", () => {
  it("gives first to the highest roll in one round", () => {
    const r = rollForFirst([1, 2, 3, 4], fixed(5, 17, 9, 2));
    expect(r.first).toBe(2);
    expect(r.rounds).toEqual([[{ seat: 1, value: 5 }, { seat: 2, value: 17 }, { seat: 3, value: 9 }, { seat: 4, value: 2 }]]);
  });

  it("rerolls only the seats tied for the highest", () => {
    const r = rollForFirst([1, 2, 3, 4], fixed(12, 20, 20, 3, 8, 14));
    expect(r.rounds[1]).toEqual([{ seat: 2, value: 8 }, { seat: 3, value: 14 }]);
    expect(r.first).toBe(3);
  });

  it("keeps rerolling while the tie holds", () => {
    const r = rollForFirst([1, 2], fixed(6, 6, 11, 11, 4, 19));
    expect(r.rounds).toHaveLength(3);
    expect(r.first).toBe(2);
  });

  it("ignores a tie below the highest", () => {
    const r = rollForFirst([1, 2, 3], fixed(7, 7, 9));
    expect(r.rounds).toHaveLength(1);
    expect(r.first).toBe(3);
  });
});
