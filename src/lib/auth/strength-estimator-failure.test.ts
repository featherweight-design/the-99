// @vitest-environment node
//
// Errs weak (READINESS clarification 2): when the estimator cannot be built, the reading is the not-loaded one. Length and
// number or symbol still tick, the meter draws no word and the third guide stays open. The failure is remembered, so a broken
// chunk is not rebuilt on every keystroke.
import { describe, expect, it, vi } from "vitest";
import { estimate } from "./strength-estimator";

const built = vi.hoisted(() => ({ count: 0 }));
vi.mock("@zxcvbn-ts/core", () => ({
  ZxcvbnFactory: class {
    constructor() {
      built.count++;
      throw new Error("dictionaries failed to load");
    }
  },
}));

describe("estimate when the estimator fails", () => {
  it("reads as not loaded, never Good or Strong", () => {
    expect(estimate("Rk4$wP9n!tYc", ["colin@example.com"])).toEqual({
      strength: "short",
      commonOk: false,
      guides: { length: true, numberOrSymbol: true, common: false },
    });
  });

  it("tries the build once, not on every keystroke", () => {
    for (const pw of ["Rk4$wP9n!tYc1", "Rk4$wP9n!tYc12", "Rk4$wP9n!tYc123"]) estimate(pw, []);
    expect(built.count).toBe(1);
  });
});
