import { describe, expect, it } from "vitest";
import { settleLabelRead } from "./label-read-settle";

describe("settleLabelRead", () => {
  it("is inert with the switch off", () => {
    expect(settleLabelRead(false, [{ a: ["ramp"] }], ["a"])).toEqual({ rows: null, queried: null, classifierTargets: false });
  });
  it("merges the reads and records what they covered", () => {
    const s = settleLabelRead(true, [{ a: ["ramp"] }, {}], ["a", "b"]);
    expect(s).toEqual({ rows: { a: ["ramp"] }, queried: ["a", "b"], classifierTargets: false });
  });
  it("falls everything back to the classifier when the base read failed", () => {
    expect(settleLabelRead(true, [null], ["a"])).toEqual({ rows: null, queried: null, classifierTargets: true });
  });
  it("falls everything back when only the extra read failed", () => {
    expect(settleLabelRead(true, [{ a: ["ramp"] }, null], ["a", "b"])).toEqual({ rows: null, queried: null, classifierTargets: true });
  });
});
