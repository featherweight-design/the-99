import { describe, expect, it } from "vitest";

import { changedCardCount, pastRunMoved, readListCardIds } from "./read-list";

describe("readListCardIds", () => {
  it("lists one id per copy and each commander that is not a row, sorted", () => {
    expect(readListCardIds({
      commanderOracleId: "c", partnerOracleId: "p",
      cards: [{ oracleId: "z", quantity: 1 }, { oracleId: "b", quantity: 3 }, { oracleId: "p", quantity: 1 }],
    })).toEqual(["b", "b", "b", "c", "p", "z"]);
  });
});

describe("changedCardCount", () => {
  it("is 0 for the same list in any order", () => {
    expect(changedCardCount(["a", "b", "b"], ["b", "a", "b"])).toBe(0);
  });
  it("counts a swap as two: one out, one in", () => {
    expect(changedCardCount(["a", "b", "c"], ["a", "b", "d"])).toBe(2);
  });
  it("counts copies: a fourth copy added is one, two copies removed are two", () => {
    expect(changedCardCount(["x", "x", "x"], ["x", "x", "x", "x"])).toBe(1);
    expect(changedCardCount(["x", "x", "x", "y"], ["x", "y"])).toBe(2);
  });
  it("counts everything against an empty list, either way round", () => {
    expect(changedCardCount([], ["a", "a", "b"])).toBe(3);
    expect(changedCardCount(["a", "b"], [])).toBe(2);
  });
});

describe("pastRunMoved", () => {
  const head = (cards: [string, number][]) => ({ commanderOracleId: "c", partnerOracleId: null, cards: cards.map(([oracleId, quantity]) => ({ oracleId, quantity })) });
  const read = readListCardIds(head([["a", 1], ["b", 2], ["d", 1]]));

  it("counts the cards the list has moved since the run read it", () => {
    // One b out, a out and e in: 3 changed.
    expect(pastRunMoved(read, head([["b", 1], ["d", 1], ["e", 1]]))).toBe(3);
  });

  it("is null for a run saved before the list was stored", () => {
    expect(pastRunMoved(null, head([["e", 1]]))).toBeNull();
    expect(pastRunMoved(undefined, head([["e", 1]]))).toBeNull();
  });

  it("is null with no list to compare against", () => {
    expect(pastRunMoved(read, null)).toBeNull();
  });

  it("is null when no card moved, so the note never says 0", () => {
    expect(pastRunMoved(read, head([["d", 1], ["b", 2], ["a", 1]]))).toBeNull();
  });
});
