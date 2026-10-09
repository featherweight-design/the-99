import { describe, expect, it } from "vitest";
import { ownedBeforeEntry } from "./arrivals-write";

const row = (oracleId: string, before: number | null, after: number | null) => ({
  oracleId,
  before: before === null ? null : { quantity: before },
  after: after === null ? null : { quantity: after },
});

describe("ownedBeforeEntry", () => {
  it("backs out exactly what the entry did, whatever else the collection holds", () => {
    // One copy added to a card held three times reads four after; before is three, so the
    // receipt sees an arrival of one, and the untouched card is the same on both sides.
    expect(ownedBeforeEntry({ a: 4, b: 2 }, [row("a", 3, 4)])).toEqual({ a: 3, b: 2 });
  });

  it("sums printings of one card, and leaves out a card the entry brought in from none", () => {
    expect(ownedBeforeEntry({ a: 2, c: 1 }, [row("a", 1, 2), row("a", 2, null), row("c", null, 1)]))
      .toEqual({ a: 3 });
  });
});
