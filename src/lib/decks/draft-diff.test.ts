import { describe, expect, it } from "vitest";
import { bucketAdds, draftDiff } from "./draft-diff";

const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";
const C = "00000000-0000-0000-0000-00000000000c";
const D = "00000000-0000-0000-0000-00000000000d";
const E = "00000000-0000-0000-0000-00000000000e";

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
  // Every `free` here is the DRAFT vantage: this deck's surplus with its whole
  // ask, the add included, already subtracted. A non-negative figure therefore
  // means the collection covers the add, and a negative one is the deficit over
  // the whole ask — which is why the fixtures below state how much each deck is
  // asking for rather than how many copies it owns.
  const avail = new Map([
    // Two copies spare after the ask.
    [A, { free: 2, claims: [] as { id: string; name: string }[] }],
    // One copy owned, sleeved senior in Scrim Recovery, and this draft wants it.
    [B, { free: -1, claims: [{ id: "d1", name: "Scrim Recovery" }] }],
    // Asking five against one copy held by Scrim Recovery: four short.
    [D, { free: -4, claims: [{ id: "d1", name: "Scrim Recovery" }] }],
    // The same arithmetic with nobody to name.
    [E, { free: -4, claims: [] as { id: string; name: string }[] }],
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

  // The same absence on a basic land, which is the shape every basic arrives in:
  // nothing asks the claim model about one, so the map can never hold a row for
  // it. Answered before the lookup rather than after, ten Forests are free
  // instead of a shopping list.
  it("calls a basic free on that same absence", () => {
    const [row] = bucketAdds([{ oracleId: C, from: 0, to: 10 }], avail, new Set([C]));
    expect(row.bucket).toBe("free");
    expect(row.shortfall).toBe(0);
    expect(row.needed).toBe(10);
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
    const [row] = bucketAdds([{ oracleId: E, from: 0, to: 5 }], avail);
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

  // The deficit spans the deck's whole ask while the receipt covers one edit, so
  // the shortfall is capped at the delta. A deck two copies short overall that
  // added one copy this session is quoted one, not two: the other was already
  // owed before this draft touched the card.
  it("caps the shortfall at the copies this edit added", () => {
    const short = new Map([[B, { free: -2, claims: [] as { id: string; name: string }[] }]]);
    const [row] = bucketAdds([{ oracleId: B, from: 1, to: 2 }], short);
    expect(row.needed).toBe(1);
    expect(row.shortfall).toBe(1);
  });

  // Nothing spare and nothing missing. The collection covers the ask exactly, so
  // the add is free — the figure is a surplus, and zero surplus is still covered.
  it("calls an exactly covered add free", () => {
    const exact = new Map([[B, { free: 0, claims: [{ id: "d1", name: "Scrim Recovery" }] }]]);
    const [row] = bucketAdds([{ oracleId: B, from: 0, to: 1 }], exact);
    expect(row.bucket).toBe("free");
    expect(row.shortfall).toBe(0);
  });
});
