import { describe, expect, it } from "vitest";

import { aimDrops, reachesAim } from "./bracket-aim";

describe("the bracket choice", () => {
  it("never drops a line that moves nothing", () => {
    for (const choice of ["keep", "down", "up"] as const) expect(aimDrops({ choice, target: 2 }, "add", null)).toBe(false);
  });

  it("Keep drops a line on either list that takes the deck out of its bracket", () => {
    expect(aimDrops({ choice: "keep", target: 2 }, "add", [3])).toBe(true);
    expect(aimDrops({ choice: "keep", target: 2 }, "cut", [1])).toBe(true);
    // A range that still includes the kept bracket stays.
    expect(aimDrops({ choice: "keep", target: 2 }, "add", [2, 3])).toBe(false);
  });

  it("Down keeps additions inside the target and never drops a cut for it", () => {
    expect(aimDrops({ choice: "down", target: 1 }, "add", [2])).toBe(true);
    expect(aimDrops({ choice: "down", target: 1 }, "add", [1, 2])).toBe(false);
    expect(aimDrops({ choice: "down", target: 1 }, "cut", [2])).toBe(false);
    // A second Game Changer leaves a bracket-3 deck's permits as they were (null delta) but still bars the target.
    expect(aimDrops({ choice: "down", target: 1 }, "add", null, 3)).toBe(true);
    expect(aimDrops({ choice: "down", target: 3 }, "add", null, 3)).toBe(false);
    expect(aimDrops({ choice: "keep", target: 3 }, "add", null, 4)).toBe(false);
  });

  it("Up drops nothing and flags an addition that reaches the target", () => {
    expect(aimDrops({ choice: "up", target: 4 }, "add", [3])).toBe(false);
    expect(reachesAim({ choice: "up", target: 4 }, "add", [3, 4])).toBe(true);
    expect(reachesAim({ choice: "up", target: 4 }, "add", [3])).toBe(false);
    expect(reachesAim({ choice: "up", target: 4 }, "cut", [4])).toBe(false);
    expect(reachesAim({ choice: "keep", target: 4 }, "add", [4])).toBe(false);
  });
});
