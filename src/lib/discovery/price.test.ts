import { describe, expect, it } from "vitest";
import { slotFor } from "./price";

describe("slotFor", () => {
  it("row 1/2 — a live priced printing prints the figure", () => {
    expect(slotFor({ oracleId: "a", liveCents: 349, everPriced: true }, false))
      .toEqual({ kind: "priced", cents: 349 });
    expect(slotFor({ oracleId: "a", liveCents: 12900, everPriced: true }, false))
      .toEqual({ kind: "priced", cents: 12900 });
  });

  it("row 3 — priced before, not at the newest as_of, reads not stocked", () => {
    expect(slotFor({ oracleId: "a", liveCents: null, everPriced: true }, false))
      .toEqual({ kind: "notStocked" });
  });

  it("row 4 — never priced leaves the slot absent", () => {
    expect(slotFor({ oracleId: "a", liveCents: null, everPriced: false }, false))
      .toEqual({ kind: "absent" });
    expect(slotFor(undefined, false)).toEqual({ kind: "absent" });
  });

  it("row 5 — an owned commander has no price slot at all", () => {
    expect(slotFor({ oracleId: "a", liveCents: 349, everPriced: true }, true))
      .toEqual({ kind: "absent" });
  });

  it("never reads a zero as free", () => {
    expect(slotFor({ oracleId: "a", liveCents: 0, everPriced: true }, false))
      .toEqual({ kind: "priced", cents: 0 });
  });
});
