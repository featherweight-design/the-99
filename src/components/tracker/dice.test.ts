import { describe, expect, it } from "vitest";
import { trackerCopy } from "../../lib/copy/tracker";
import { rollFair, SIDES } from "./dice";

describe("rollFair", () => {
  it("rolls every side of each die and nothing outside it", () => {
    for (const sides of Object.values(SIDES)) {
      const seen = new Set<number>();
      for (let i = 0; i < sides * 60; i++) seen.add(rollFair(sides));
      expect([...seen].sort((a, b) => a - b)).toEqual(Array.from({ length: sides }, (_, i) => i + 1));
    }
  });
});

describe("dice copy", () => {
  it("says an before 8, 11 and 18 and a before the rest", () => {
    expect(trackerCopy.dice.rolled(8)).toBe("Rolled an 8");
    expect(trackerCopy.dice.rolled(11)).toBe("Rolled an 11");
    expect(trackerCopy.dice.rolled(18)).toBe("Rolled an 18");
    expect(trackerCopy.dice.rolled(1)).toBe("Rolled a 1");
    expect(trackerCopy.dice.rolled(20)).toBe("Rolled a 20");
  });
});
