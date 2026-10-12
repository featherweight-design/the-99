import { describe, expect, it } from "vitest";

import { refundsCredit } from "./refund";

describe("refundsCredit", () => {
  // The three cases Hugh named: Soldiers' 2 of 11 refunds; 3 of 8 and 9 of 10 spend.
  it("refunds 2 of 11, and spends 3 of 8 and 9 of 10", () => {
    expect(refundsCredit(2, 11)).toBe(true);
    expect(refundsCredit(3, 8)).toBe(false);
    expect(refundsCredit(9, 10)).toBe(false);
  });

  it("refunds fewer than three whatever the share, and a share under a third whatever the count", () => {
    expect(refundsCredit(1, 1)).toBe(true);
    expect(refundsCredit(2, 2)).toBe(true);
    expect(refundsCredit(3, 3)).toBe(false);
    expect(refundsCredit(3, 9)).toBe(false);
    expect(refundsCredit(3, 10)).toBe(true);
    expect(refundsCredit(4, 13)).toBe(true);
    expect(refundsCredit(4, 12)).toBe(false);
  });
});
