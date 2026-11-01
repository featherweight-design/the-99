import { describe, expect, it } from "vitest";
import { settleLabelRead } from "./label-read-settle";

describe("settleLabelRead", () => {
  it("merges the reads and records what they covered", () => {
    const s = settleLabelRead([{ a: ["ramp"] }, {}], ["a", "b"]);
    expect(s).toEqual({ rows: { a: ["ramp"] }, queried: ["a", "b"], classifierTargets: false });
  });
  it("falls everything back to the classifier when the base read failed", () => {
    expect(settleLabelRead([null], ["a"])).toEqual({ rows: null, queried: null, classifierTargets: true });
  });
  it("falls everything back when only the extra read failed", () => {
    expect(settleLabelRead([{ a: ["ramp"] }, null], ["a", "b"])).toEqual({ rows: null, queried: null, classifierTargets: true });
  });
});
