import { describe, expect, it } from "vitest";
import { ownedAfterEntry, pendingItemsToOwnedCounts } from "./arrivals-write";

const row = (oracleId: string, before: number | null, after: number | null) => ({
  oracleId,
  before: before === null ? null : { quantity: before },
  after: after === null ? null : { quantity: after },
});

describe("ownedAfterEntry", () => {
  it("is the collection after an Add, not only what the Add carried", () => {
    // One copy added to a card owned three times reads four, so the receipt sees an arrival of
    // one. Reading the Add's items as the collection would compare 1 against 3 and see none.
    expect(ownedAfterEntry({ a: 3, b: 2 }, [row("a", 3, 4)])).toEqual({ a: 4, b: 2 });
    expect(pendingItemsToOwnedCounts([{ oracleId: "a", setCode: "x", condition: null, quantity: 1 }]))
      .toEqual({ a: 1 });
  });

  it("sums printings of one card and drops a card no longer owned", () => {
    expect(ownedAfterEntry({ a: 3 }, [row("a", 1, 2), row("a", 2, null), row("c", null, 1)]))
      .toEqual({ a: 2, c: 1 });
    expect(ownedAfterEntry({ a: 1 }, [row("a", 1, null)])).toEqual({});
  });
});
