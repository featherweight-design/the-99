import { describe, expect, it } from "vitest";
import { weakestRole } from "./weakest-role";
import { ROLE_TARGETS } from "./roles";

const FLAT = ROLE_TARGETS;

describe("weakestRole", () => {
  it("returns null when every role meets its target", () => {
    expect(weakestRole({ ramp: 10, draw: 12, removal: 8, wipes: 3 }, FLAT)).toBeNull();
  });

  // The targets are not equal, so an absolute gap answers the wrong question. One
  // wipe against a target of 3 is two thirds short; two draws against a target of
  // 10 is a bigger number and a smaller problem.
  it("prefers the largest proportional shortfall over the largest absolute gap", () => {
    expect(weakestRole({ ramp: 8, draw: 8, removal: 6, wipes: 1 }, FLAT)).toEqual({
      role: "wipes",
      have: 1,
      target: 3,
    });
  });

  it("names the role that is short when only one is", () => {
    expect(weakestRole({ ramp: 10, draw: 4, removal: 8, wipes: 3 }, FLAT)).toEqual({
      role: "draw",
      have: 4,
      target: 10,
    });
  });

  it("breaks a tie by role order", () => {
    // ramp and draw share a target of 10 and are both half short.
    expect(weakestRole({ ramp: 5, draw: 5, removal: 8, wipes: 3 }, FLAT)?.role).toBe("ramp");
  });

  // THE MEASURED TARGETS, which is what the commander page passes since 5.4b: the role the
  // paragraph names has to be the one the fit score docked.
  it("names the thinnest role against the commander's own targets", () => {
    // Flat, removal is 4 short of 8; against these targets, wipes is 2 short of 2.
    expect(weakestRole({ ramp: 10, draw: 10, removal: 4, wipes: 0 }, { ramp: 9, draw: 9, removal: 4, wipes: 2 }))
      .toEqual({ role: "wipes", have: 0, target: 2 });
  });

  it("rounds a measured target to whole cards, as the fit score does", () => {
    expect(weakestRole({ ramp: 9, draw: 9, removal: 4, wipes: 1 }, { ramp: 9.4, draw: 9, removal: 4, wipes: 1.6 }))
      .toEqual({ role: "wipes", have: 1, target: 2 });
  });

  // A role its decks run none of is never short, however few the reader owns.
  it("never names a role whose measured target is 0", () => {
    expect(weakestRole({ ramp: 10, draw: 10, removal: 8, wipes: 0 }, { ramp: 10, draw: 10, removal: 8, wipes: 0.3 }))
      .toBeNull();
  });

  it("treats an empty collection as thinnest at the first role", () => {
    expect(weakestRole({ ramp: 0, draw: 0, removal: 0, wipes: 0 }, FLAT)).toEqual({
      role: "ramp",
      have: 0,
      target: 10,
    });
  });
});
