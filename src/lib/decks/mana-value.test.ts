import { describe, expect, it } from "vitest";
import { averageManaValue } from "./mana-value";

describe("averageManaValue", () => {
  it("weights by quantity", () => {
    expect(averageManaValue([
      { cmc: 1, quantity: 3, typeLine: "Artifact" },
      { cmc: 5, quantity: 1, typeLine: "Creature — Dragon" },
    ])).toBe(2);
  });

  it("excludes lands, which have no cost to average", () => {
    expect(averageManaValue([
      { cmc: 2, quantity: 1, typeLine: "Artifact" },
      { cmc: 0, quantity: 37, typeLine: "Basic Land — Forest" },
      { cmc: 0, quantity: 1, typeLine: "Land — Gate" },
    ])).toBe(2);
  });

  it("is null when there is nothing to average", () => {
    expect(averageManaValue([{ cmc: 0, quantity: 37, typeLine: "Land" }])).toBeNull();
  });

  it("rounds to one decimal, the only precision the cell draws", () => {
    expect(averageManaValue([
      { cmc: 1, quantity: 1, typeLine: "Artifact" },
      { cmc: 2, quantity: 1, typeLine: "Artifact" },
      { cmc: 2, quantity: 1, typeLine: "Artifact" },
    ])).toBe(1.7);
  });
});
