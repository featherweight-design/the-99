import { describe, expect, it } from "vitest";
import { discoveryCopy } from "./commander-discovery";

describe("discoveryCopy", () => {
  it("locale-formats four-digit counts", () => {
    expect(discoveryCopy.scope.subtitlePlay(3334, 2805, "fit")).toContain("3,334");
    expect(discoveryCopy.scope.subtitlePlay(3334, 2805, "fit")).toContain("2,805");
  });

  it("names the sort in the play subtitle", () => {
    expect(discoveryCopy.scope.subtitlePlay(10, 10, "new")).toContain("new to you");
    expect(discoveryCopy.scope.subtitlePlay(10, 10, "fit")).toContain("best fit");
  });

  it("prints a denominator with every figure", () => {
    expect(discoveryCopy.justify.overlap(12, 99)).toMatch(/12.*99/);
  });

  it("never says buy", () => {
    const all = JSON.stringify(discoveryCopy, (_k, v) =>
      typeof v === "function" ? (v.length === 0 ? v() : String(v)) : v,
    );
    expect(all.toLowerCase()).not.toMatch(/\bbuy\b/);
  });
});
