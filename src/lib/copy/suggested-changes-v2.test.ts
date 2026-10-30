import { describe, expect, it } from "vitest";

import { suggestedChangesV2Copy as sc } from "./suggested-changes-v2";

// A count of one reads in the singular ("Found 1 additions." on the walk).
describe("Suggested changes v2 counts", () => {
  it("says a short head's side by its count", () => {
    expect(sc.short.refundHead(1, sc.short.additions(1))).toBe("Found 1 addition.");
    expect(sc.short.refundHead(3, sc.short.additions(3))).toBe("Found 3 additions.");
    expect(sc.short.ownedHead(1, sc.short.cuts(1))).toBe("Found 1 cut you own.");
    expect(sc.short.setHead(2, sc.short.cuts(2))).toBe("Found 2 cuts in the sets you chose.");
    expect(sc.short.aimHead(1, sc.short.additions(1))).toBe("Found 1 addition that fits the bracket you chose.");
    expect(sc.short.aimHead(4, sc.short.additions(4))).toBe("Found 4 additions that fit the bracket you chose.");
  });
  it("says the cap head by its count", () => {
    expect(sc.results.shortCap(1, "$2.00")).toBe("Found 1 addition under your $2.00 cap");
    expect(sc.results.shortCap(14, "$2.00")).toBe("Found 14 additions under your $2.00 cap");
  });
  it("says what stays after an Apply by its count, and nothing when none does", () => {
    expect(sc.run.appliedLead(3, 0)).toBe("Applied 3 in, 3 out. The deck is back at 99.");
    expect(sc.run.appliedLead(3, 1)).toBe("Applied 3 in, 3 out. The deck is back at 99. The other one stays here.");
    expect(sc.run.appliedLead(3, 4)).toBe("Applied 3 in, 3 out. The deck is back at 99. The other 4 stay here.");
  });
});
