import { describe, expect, it } from "vitest";
import { weakestRole } from "./weakest-role";

describe("weakestRole", () => {
  it("returns null when every role meets its target", () => {
    expect(weakestRole({ ramp: 10, draw: 12, removal: 8, wipes: 3 })).toBeNull();
  });

  // The targets are not equal, so an absolute gap answers the wrong question. One
  // wipe against a target of 3 is two thirds short; two draws against a target of
  // 10 is a bigger number and a smaller problem.
  it("prefers the largest proportional shortfall over the largest absolute gap", () => {
    expect(weakestRole({ ramp: 8, draw: 8, removal: 6, wipes: 1 })).toEqual({
      role: "wipes",
      have: 1,
      target: 3,
    });
  });

  it("names the role that is short when only one is", () => {
    expect(weakestRole({ ramp: 10, draw: 4, removal: 8, wipes: 3 })).toEqual({
      role: "draw",
      have: 4,
      target: 10,
    });
  });

  it("breaks a tie by role order", () => {
    // ramp and draw share a target of 10 and are both half short.
    expect(weakestRole({ ramp: 5, draw: 5, removal: 8, wipes: 3 })?.role).toBe("ramp");
  });

  it("treats an empty collection as thinnest at the first role", () => {
    expect(weakestRole({ ramp: 0, draw: 0, removal: 0, wipes: 0 })).toEqual({
      role: "ramp",
      have: 0,
      target: 10,
    });
  });
});
