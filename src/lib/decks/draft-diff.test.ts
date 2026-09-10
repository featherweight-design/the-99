import { describe, expect, it } from "vitest";
import { bucketAdds, draftDiff } from "./draft-diff";

const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";
const C = "00000000-0000-0000-0000-00000000000c";
const D = "00000000-0000-0000-0000-00000000000d";

describe("draftDiff", () => {
  it("reports a card the draft added", () => {
    const d = draftDiff([{ oracleId: A, quantity: 1 }], []);
    expect(d.adds).toEqual([{ oracleId: A, from: 0, to: 1 }]);
    expect(d.removes).toEqual([]);
  });

  it("reports a card the draft dropped", () => {
    const d = draftDiff([], [{ oracleId: A, quantity: 1 }]);
    expect(d.removes).toEqual([{ oracleId: A, from: 1, to: 0 }]);
    expect(d.adds).toEqual([]);
  });

  // A quantity change is one change, not a remove plus an add. Rendering it as
  // both would put the same card on the buy list and the pull list at once.
  it("reports an increased quantity as a single add", () => {
    const d = draftDiff([{ oracleId: A, quantity: 3 }], [{ oracleId: A, quantity: 1 }]);
    expect(d.adds).toEqual([{ oracleId: A, from: 1, to: 3 }]);
    expect(d.removes).toEqual([]);
  });

  it("reports a decreased quantity as a single remove", () => {
    const d = draftDiff([{ oracleId: A, quantity: 1 }], [{ oracleId: A, quantity: 4 }]);
    expect(d.removes).toEqual([{ oracleId: A, from: 4, to: 1 }]);
  });

  it("reports nothing when the lists agree, whatever their order", () => {
    const d = draftDiff(
      [{ oracleId: B, quantity: 1 }, { oracleId: A, quantity: 2 }],
      [{ oracleId: A, quantity: 2 }, { oracleId: B, quantity: 1 }],
    );
    expect(d).toEqual({ adds: [], removes: [] });
  });

  // Both inputs are selects with no `order by`, so row order is the database's
  // to choose. The receipt is a list a player reads, and reading it twice has
  // to give the same list in the same order.
  it("orders each list the same way whatever order the rows arrive in", () => {
    const forwards = draftDiff(
      [{ oracleId: B, quantity: 1 }, { oracleId: A, quantity: 1 }],
      [],
    );
    const backwards = draftDiff(
      [{ oracleId: A, quantity: 1 }, { oracleId: B, quantity: 1 }],
      [],
    );
    expect(forwards.adds.map((c) => c.oracleId)).toEqual([A, B].sort());
    expect(forwards).toEqual(backwards);
  });
});

describe("bucketAdds", () => {
  const avail = new Map([
    [A, { free: 2, claims: [] as { id: string; name: string }[] }],
    [B, { free: 0, claims: [{ id: "d1", name: "Scrim Recovery" }] }],
    [D, { free: 1, claims: [{ id: "d1", name: "Scrim Recovery" }] }],
  ]);

  it("calls a card with enough free copies free", () => {
    const [row] = bucketAdds([{ oracleId: A, from: 0, to: 1 }], avail);
    expect(row.bucket).toBe("free");
    expect(row.needed).toBe(1);
  });

  // The distinction the Deckcheck workaround cannot make: owned but spoken
  // for is not the same as not owned, because only one of them has a deck to
  // name and a pull to offer.
  it("calls a card held by another deck claimed, and names the deck", () => {
    const [row] = bucketAdds([{ oracleId: B, from: 0, to: 1 }], avail);
    expect(row.bucket).toBe("claimed");
    expect(row.heldBy).toEqual([{ id: "d1", name: "Scrim Recovery" }]);
  });

  it("calls a card absent from availability unowned", () => {
    const [row] = bucketAdds([{ oracleId: C, from: 0, to: 1 }], avail);
    expect(row.bucket).toBe("unowned");
    expect(row.heldBy).toEqual([]);
  });

  // needed is the DELTA, not the draft's whole ask: a deck going from one copy
  // to three buys two. Returning the ask would double-charge the price total.
  it("needs only the delta when the quantity rose", () => {
    const [row] = bucketAdds([{ oracleId: A, from: 1, to: 3 }], avail);
    expect(row.needed).toBe(2);
  });

  // One free copy against an ask of five still sends the player shopping, so
  // it is never `free`. Which of the other two it is depends on whether there
  // is a deck to name: with a holder it is a pull offer, without one it is a
  // purchase, and only the shortfall is a purchase either way.
  it("calls a partially covered add claimed when another deck holds one", () => {
    const [row] = bucketAdds([{ oracleId: D, from: 0, to: 5 }], avail);
    expect(row.bucket).toBe("claimed");
    expect(row.heldBy).toEqual([{ id: "d1", name: "Scrim Recovery" }]);
  });

  it("calls a partially covered add unowned when nobody holds the rest", () => {
    const [row] = bucketAdds([{ oracleId: A, from: 0, to: 5 }], avail);
    expect(row.bucket).toBe("unowned");
    expect(row.heldBy).toEqual([]);
  });

  // The figure a price total multiplies. Five wanted against one free copy is
  // a purchase of four, and quoting five prices a card already on the table.
  it("charges only for the copies the free ones do not cover", () => {
    const [row] = bucketAdds([{ oracleId: D, from: 0, to: 5 }], avail);
    expect(row.needed).toBe(5);
    expect(row.shortfall).toBe(4);
  });

  it("charges nothing for an add the free copies cover", () => {
    const [row] = bucketAdds([{ oracleId: A, from: 0, to: 1 }], avail);
    expect(row.shortfall).toBe(0);
  });

  // A negative free is this deck's own deficit, already owed to a senior deck.
  // Subtracting it would add the same missing copy to the bill twice.
  it("does not double-charge when free is negative", () => {
    const short = new Map([[B, { free: -2, claims: [] as { id: string; name: string }[] }]]);
    const [row] = bucketAdds([{ oracleId: B, from: 0, to: 1 }], short);
    expect(row.shortfall).toBe(1);
  });
});
