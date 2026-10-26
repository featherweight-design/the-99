import { describe, expect, it } from "vitest";
import { identityFits } from "./write";

describe("identityFits", () => {
  it("asks a same-size change for exactly the deck's identity (ruling 2)", () => {
    expect(identityFits(["U", "W"], ["U", "W"], false)).toBe(true);
    expect(identityFits(["U", "W"], ["B", "U", "W"], false)).toBe(false);
  });

  it("lets a single becoming a pair widen it, never narrow it", () => {
    expect(identityFits(["U"], ["R", "U"], true)).toBe(true);
    expect(identityFits(["B", "G", "R", "U", "W"], ["B", "G", "R", "U", "W"], true)).toBe(true);
    expect(identityFits(["B", "G", "R", "U", "W"], ["R", "U"], true)).toBe(false);
  });
});
