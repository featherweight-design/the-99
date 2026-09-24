import { describe, expect, it } from "vitest";

import type { PriceFact } from "../decks/price";
import { DEFAULT_LIMIT_CENTS, effectiveLimit, formatLimit, isOverLimit, parseLimitDollars } from "./limit";

const NOW = new Date("2026-09-21T09:00:00Z");
const fact = (cents: number | null, asOf = NOW, foil: number | null = null): PriceFact =>
  ({ cents, foilCents: foil, etchedCents: null, asOf });

describe("the Shopping limit", () => {
  it("reads a deck with none as the $10 default", () => {
    expect(effectiveLimit(null)).toBe(DEFAULT_LIMIT_CENTS);
    expect(effectiveLimit(2500)).toBe(2500);
  });

  it("marks a drawn figure strictly over the limit", () => {
    expect(isOverLimit(fact(1001), NOW, 1000)).toBe(true);
    expect(isOverLimit(fact(1000), NOW, 1000)).toBe(false);
    expect(isOverLimit(fact(null, NOW, 2500), NOW, 1000)).toBe(true);
  });

  it("never marks a card with no price, or one sold out (F5)", () => {
    expect(isOverLimit(undefined, NOW, 1000)).toBe(false);
    expect(isOverLimit(fact(29000, new Date("2026-09-14T09:00:00Z")), NOW, 1000)).toBe(false);
    expect(isOverLimit(fact(29000), null, 1000)).toBe(false);
  });

  it("formats whole dollars", () => {
    expect(formatLimit(1000)).toBe("$10");
    expect(formatLimit(250000)).toBe("$2,500");
  });

  it("takes whole dollars of 1 or more, and nothing else", () => {
    expect(parseLimitDollars("25")).toBe(2500);
    expect(parseLimitDollars(" 7 ")).toBe(700);
    expect(parseLimitDollars("100000")).toBe(10_000_000);
    for (const bad of ["0", "", "2.5", "1,000", "-3", "ten", "$5", "100001", "21474837"]) expect(parseLimitDollars(bad), bad).toBeNull();
  });
});
