import { describe, expect, it } from "vitest";

import { intentTooLong } from "./limits";

describe("intentTooLong", () => {
  it("accepts an intent at the cap and refuses one over it", () => {
    expect(intentTooLong("a".repeat(120))).toBe(false);
    expect(intentTooLong("a".repeat(121))).toBe(true);
    expect(intentTooLong("")).toBe(false);
  });

  it("counts code points, as the column does", () => {
    // 120 emoji are 240 UTF-16 units and 120 code points: the column stores them.
    expect(intentTooLong("🂡".repeat(120))).toBe(false);
    expect(intentTooLong("🂡".repeat(121))).toBe(true);
  });
});
