import { describe, expect, it } from "vitest";
import { refreshCopy } from "./refresh";

describe("refreshCopy", () => {
  it("prints every count with its denominator, never a percentage", () => {
    expect(refreshCopy.home.fit(74, 100)).toBe("74 /100 fit");
    expect(refreshCopy.home.fit(32, 40)).toBe("32 /40 fit");
    expect(refreshCopy.home.inUseValue("312", "1,284")).toBe("312 of 1,284");
    expect(refreshCopy.decks.shown(3, 6)).toBe("3 of 6");
    expect(refreshCopy.filters.sheetMatch(3, 6)).toBe("3 of 6 match");
  });

  it("has one label per shipped status and no more", () => {
    expect(Object.values(refreshCopy.status)).toEqual([
      "Draft",
      "Building",
      "Over",
      "Unresolved",
      "To buy",
      "Complete",
    ]);
  });

  it("singularises the counted strings at one", () => {
    expect(refreshCopy.decks.detailUnresolved(1)).toBe("1 line unresolved");
    expect(refreshCopy.decks.detailUnresolved(2)).toBe("2 lines unresolved");
    expect(refreshCopy.home.overCommittedValue(1)).toBe("1 card");
    expect(refreshCopy.home.overCommittedValue(3)).toBe("3 cards");
    expect(refreshCopy.filters.someOn(1)).toBe("1 status on");
    expect(refreshCopy.filters.someOn(4)).toBe("4 statuses on");
    expect(refreshCopy.filters.sheetDismiss(1)).toBe("Show 1 deck");
    expect(refreshCopy.filters.sheetDismiss(3)).toBe("Show 3 decks");
  });

  it("carries the price-free unowned clause added under ruling 5", () => {
    expect(refreshCopy.decks.detailUnowned(3)).toBe("3 unowned");
  });
});
