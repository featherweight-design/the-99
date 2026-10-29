import { describe, expect, it } from "vitest";

import type { GateFacts } from "../../intake/fill-gate";
import { aimDrops, cardFloorOf, reachesAim } from "./bracket-aim";

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

  it("Keep on a range keeps a line that settles anywhere inside it, and drops one outside it", () => {
    const keep45 = { choice: "keep" as const, target: 5, low: 4 };
    expect(aimDrops(keep45, "cut", [4])).toBe(false);
    expect(aimDrops(keep45, "add", [5])).toBe(false);
    expect(aimDrops(keep45, "cut", [3])).toBe(true);
    const keep12 = { choice: "keep" as const, target: 2, low: 1 };
    expect(aimDrops(keep12, "cut", [1])).toBe(false);
    expect(aimDrops(keep12, "add", [3])).toBe(true);
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

describe("cardFloorOf (H3's Down rule, plan PR 3)", () => {
  const facts = (flags: Partial<Record<"gameChanger" | "massLandDenial" | "extraTurn", boolean>>): GateFacts => ({
    flagsOf: () => ({ gameChanger: false, massLandDenial: false, extraTurn: false, ...flags }),
    combosOf: () => [], searches: () => false, reaches: () => false,
  });

  it("floors a plain card at 1, and a Game Changer, mass land denial or an extra turn above the low brackets", () => {
    expect(cardFloorOf("plain", facts({}))).toBe(1);
    expect(cardFloorOf("gc", facts({ gameChanger: true }))).toBe(3);
    expect(cardFloorOf("mld", facts({ massLandDenial: true }))).toBeGreaterThan(2);
    expect(cardFloorOf("turns", facts({ extraTurn: true }))).toBeGreaterThan(1);
  });

  it("drops a second Game Changer on the way down, though the deck's permits do not move", () => {
    expect(aimDrops({ choice: "down", target: 2 }, "add", null, cardFloorOf("gc", facts({ gameChanger: true })))).toBe(true);
  });
});
