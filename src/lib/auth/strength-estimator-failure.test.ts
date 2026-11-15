// @vitest-environment node
//
// Errs weak (READINESS clarification 2): when the estimator throws, the reading is the not-loaded one. Length and number or
// symbol still tick, the meter draws no word and the third guide stays open.
import { describe, expect, it, vi } from "vitest";
import { estimate } from "./strength-estimator";

vi.mock("@zxcvbn-ts/core", () => ({
  ZxcvbnFactory: class {
    constructor() {
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
});
