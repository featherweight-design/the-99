import { describe, it, expect } from "vitest";
import { mergeEdhrecData } from "./merge";
import type { EdhrecData } from "./parse";

// The six commander-level fields are inert here but the type requires them.
const base: EdhrecData = {
  topCards: [],
  inclusionByName: {},
  synergyByName: {},
  tags: [],
  bracketCounts: {},
  budgetCounts: {},
  similarNames: [],
  deckCount: null,
  rank: null,
  saltScore: null,
};
const A: EdhrecData = {
  ...base,
  topCards: ["Bolt", "Sol Ring"],
  inclusionByName: { Bolt: 0.4 },
  synergyByName: { Bolt: 0.1 },
};
const B: EdhrecData = {
  ...base,
  topCards: ["Bolt", "Path"],
  inclusionByName: { Bolt: 0.2 },
  synergyByName: { Bolt: 0.9 },
  rank: 7,
};

describe("mergeEdhrecData", () => {
  it("returns null when every input is null", () => {
    expect(mergeEdhrecData([null, null])).toBeNull();
  });

  it("returns the one input unchanged when the other is null", () => {
    expect(mergeEdhrecData([A, null])).toEqual(A);
  });

  it("unions topCards, deduped, primary's order first", () => {
    expect(mergeEdhrecData([A, B])?.topCards).toEqual(["Bolt", "Sol Ring", "Path"]);
  });

  it("takes the better of the two figures per card", () => {
    const merged = mergeEdhrecData([A, B]);
    expect(merged?.inclusionByName.Bolt).toBe(0.4);
    expect(merged?.synergyByName.Bolt).toBe(0.9);
  });

  it("keeps the primary's commander-level facts", () => {
    expect(mergeEdhrecData([A, B])?.rank).toBeNull();
  });
});
