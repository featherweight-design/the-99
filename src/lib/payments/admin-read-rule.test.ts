import { describe, expect, it } from "vitest";
import { money, revenueOf } from "./admin-read-rule";

describe("revenueOf", () => {
  it("nets tax out of gross per currency, never adding currencies together, largest gross first", () => {
    const rows = [
      { currency: "eur", payments: 1, grossCents: 500, taxCents: 100, unattributed: 0, refundedCents: 0, refundedTaxCents: 0 },
      { currency: "usd", payments: 3, grossCents: 2_997, taxCents: 240, unattributed: 1, refundedCents: 0, refundedTaxCents: 0 },
    ];
    expect(revenueOf(rows).map((r) => [r.currency, r.netCents])).toEqual([
      ["usd", 2_757],
      ["eur", 400],
    ]);
    expect(revenueOf([])).toEqual([]);
  });

  it("takes a refund off net less the tax that went back with it", () => {
    // $10.80 paid with $0.80 tax, fully refunded: nothing kept. Half refunded ($5.40, $0.40 of it tax): $5.00 kept.
    const row = (refundedCents: number, refundedTaxCents: number) =>
      ({ currency: "usd", payments: 1, grossCents: 1_080, taxCents: 80, unattributed: 0, refundedCents, refundedTaxCents });
    expect(revenueOf([row(1_080, 80)])[0].netCents).toBe(0);
    expect(revenueOf([row(540, 40)])[0].netCents).toBe(500);
  });
});

describe("money", () => {
  it("draws USD with a dollar sign and any other currency by its code", () => {
    expect(money(2_757, "usd")).toBe("$27.57");
    expect(money(0, "USD")).toBe("$0.00");
    expect(money(400, "eur")).toBe("4.00 EUR");
  });
});
