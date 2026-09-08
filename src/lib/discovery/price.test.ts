import { describe, expect, it } from "vitest";
import { slotFor } from "./price";

describe("slotFor", () => {
  it("row 1/2 — a live priced printing prints the figure", () => {
    expect(slotFor({ oracleId: "a", liveCents: 349, everPriced: true, live: true }))
      .toEqual({ kind: "priced", cents: 349 });
    expect(slotFor({ oracleId: "a", liveCents: 12900, everPriced: true, live: true }))
      .toEqual({ kind: "priced", cents: 12900 });
  });

  it("row 3 — priced before, not at the newest as_of, reads not stocked", () => {
    expect(slotFor({ oracleId: "a", liveCents: null, everPriced: true, live: false }))
      .toEqual({ kind: "notStocked" });
  });

  // The printing is in this run's feed with no non-foil figure. It has not sold
  // out, so the slot says nothing rather than claiming it is unstocked.
  it("row 6 — live but priceless leaves the slot absent", () => {
    expect(slotFor({ oracleId: "a", liveCents: null, everPriced: true, live: true }))
      .toEqual({ kind: "absent" });
  });

  it("row 4 — never priced leaves the slot absent", () => {
    expect(slotFor({ oracleId: "a", liveCents: null, everPriced: false, live: false }))
      .toEqual({ kind: "absent" });
    expect(slotFor(undefined)).toEqual({ kind: "absent" });
  });

  // Row 5 of the matrix — an owned commander, priced at nothing — has no test
  // here any more because it has no case: discover lists only commanders the
  // player does not own, so the guarantee moved to the query and is pinned by
  // `discoverCandidates` in candidates.test.ts.

  it("never reads a zero as free", () => {
    expect(slotFor({ oracleId: "a", liveCents: 0, everPriced: true, live: true }))
      .toEqual({ kind: "priced", cents: 0 });
  });
});
