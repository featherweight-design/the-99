import { describe, expect, it } from "vitest";
import { money, revenueOf } from "./admin-read-rule";

describe("revenueOf", () => {
  it("nets tax out of gross per currency, never adding currencies together, largest gross first", () => {
    const rows = [
      { currency: "eur", payments: 1, grossCents: 500, taxCents: 100, unattributed: 0 },
      { currency: "usd", payments: 3, grossCents: 2_997, taxCents: 240, unattributed: 1 },
    ];
    expect(revenueOf(rows)).toEqual([
      { currency: "usd", payments: 3, grossCents: 2_997, taxCents: 240, unattributed: 1, netCents: 2_757 },
      { currency: "eur", payments: 1, grossCents: 500, taxCents: 100, unattributed: 0, netCents: 400 },
    ]);
    expect(revenueOf([])).toEqual([]);
  });
});

describe("money", () => {
  it("draws USD with a dollar sign and any other currency by its code", () => {
    expect(money(2_757, "usd")).toBe("$27.57");
    expect(money(0, "USD")).toBe("$0.00");
    expect(money(400, "eur")).toBe("4.00 EUR");
  });
});
