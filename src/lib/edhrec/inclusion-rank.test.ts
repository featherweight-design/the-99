import { describe, expect, it } from "vitest";
import { byInclusion, inclusionLookup } from "./inclusion-rank";

describe("byInclusion", () => {
  it("ranks by inclusion, an unlisted name last, list order kept on a tie", () => {
    const pct: Record<string, number> = { a: 10, b: 30, d: 10 };
    expect(byInclusion(["a", "b", "c", "d"], (n) => pct[n] ?? null)).toEqual(["b", "a", "d", "c"]);
  });
});

describe("inclusionLookup", () => {
  it("reads a name case-blind and a double-faced card by its front face", () => {
    const of = inclusionLookup({ "sol ring": 80, "delver of secrets": 12 });
    expect(of("Sol Ring")).toBe(80);
    expect(of("Delver of Secrets // Insectile Aberration")).toBe(12);
    expect(of("Unknown Card")).toBeNull();
  });

  it("treats a non-finite figure as no figure", () => {
    const of = inclusionLookup({ a: Number.NaN, b: Number.POSITIVE_INFINITY });
    expect(of("a")).toBeNull();
    expect(of("b")).toBeNull();
  });
});
