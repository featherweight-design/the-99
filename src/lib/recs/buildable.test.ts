import { describe, expect, it } from "vitest";
import { buildableCount } from "./buildable";

describe("buildableCount", () => {
  it("is every ranked commander, uncapped", () => {
    expect(buildableCount({ items: Array.from({ length: 230 }) })).toBe(230);
  });

  it("is null when there is no ranking to count", () => {
    expect(buildableCount(null)).toBeNull();
    expect(buildableCount(undefined)).toBeNull();
  });
});
