import { describe, expect, it } from "vitest";
import { cartReceiptFacts, cartSource, cartSourceDecks, receiptFacts, regrant } from "./mark-bought";
import type { Availability } from "./availability";

const claim = (id: string, since: number, quantity = 1, mature = true) =>
  ({ id, name: `deck ${id}`, quantity, mature, since }) as Availability["claims"][number];

const snap = (owned: number, claims: Availability["claims"]) => ({ owned, claims });

describe("receiptFacts", () => {
  it("names a senior deck that seniority gave the copy, never the source", () => {
    const before = snap(0, [claim("senior", 1), claim("source", 2)]);
    const after = snap(1, [claim("senior", 1), claim("source", 2)]);
    const facts = receiptFacts(before, after, { owned: 1, free: -1, soft: 0 }, "source");
    expect(facts.tookCopy).toEqual([{ deckId: "senior", deckName: "deck senior", copies: 1 }]);
    expect(facts.stillNeeds).toBe(1);
  });

  it("names nobody when the source deck is the senior one", () => {
    const before = snap(0, [claim("source", 1), claim("junior", 2)]);
    const after = snap(1, [claim("source", 1), claim("junior", 2)]);
    expect(receiptFacts(before, after, { owned: 1, free: 0, soft: 0 }, "source"))
      .toEqual({ tookCopy: [], stillNeeds: 0 });
  });

  it("reads a card nobody owned before (no snapshot) as zero allocated", () => {
    const after = snap(2, [claim("a", 1), claim("source", 2)]);
    expect(receiptFacts(null, after, { owned: 2, free: 0, soft: 0 }, "source").tookCopy)
      .toEqual([{ deckId: "a", deckName: "deck a", copies: 1 }]);
  });

  it("never names a brew for its soft share", () => {
    const brew = { ...claim("brew", 0, 1, false), since: null };
    // Two copies: the source takes one and the brew reads the spare as its soft share.
    const after = snap(2, [brew, claim("source", 2)]);
    expect(receiptFacts(null, after, { owned: 2, free: 0, soft: 0 }, "source").tookCopy).toEqual([]);
  });

  it("names a brew the player gave the copy to (2026-10-11)", () => {
    const brew = { ...claim("brew", 0, 1, false), since: null, granted: 1 };
    const after = snap(1, [brew, claim("source", 2)]);
    expect(receiptFacts(null, after, { owned: 1, free: -1, soft: 0 }, "source").tookCopy)
      .toEqual([{ deckId: "brew", deckName: "deck brew", copies: 1 }]);
  });

  it("reads the remaining need from the deck's own vantage only when it is over", () => {
    expect(receiptFacts(null, null, { owned: 3, free: -2, soft: 0 }, "s").stillNeeds).toBe(2);
    expect(receiptFacts(null, null, { owned: 3, free: 0, soft: 1 }, "s").stillNeeds).toBe(0);
    expect(receiptFacts(null, null, null, "s").stillNeeds).toBe(0);
  });
});

describe("cartReceiptFacts", () => {
  it("splits the line's decks into covered and still short, in the line's order, off one snapshot", () => {
    // Two copies, three committed decks: g and k (senior) take them, t still needs one.
    const after = snap(2, [claim("g", 1), claim("k", 2), claim("t", 3)]);
    expect(cartReceiptFacts(null, after, ["t", "g", "k"])).toEqual({
      covered: [{ deckId: "g", deckName: "deck g" }, { deckId: "k", deckName: "deck k" }],
      still: [{ deckId: "t", deckName: "deck t", need: 1 }],
    });
  });

  it("reads a line deck the read lists no claim for as covered, with no name", () => {
    expect(cartReceiptFacts(null, snap(0, []), ["g"])).toEqual({ covered: [{ deckId: "g", deckName: "" }], still: [] });
  });

  it("reads a brew on the line covered by the spare it reads, as its own Shopping row does", () => {
    const brew = { ...claim("brew", 0, 1, false), since: null };
    expect(cartReceiptFacts(null, snap(2, [claim("held", 1), brew]), ["brew"]).covered)
      .toEqual([{ deckId: "brew", deckName: "deck brew" }]);
  });

  it("names a senior deck off the line that the copy went to instead (S6)", () => {
    // The senior deck was unselected; one copy bought for the junior goes to it by seniority.
    const was = snap(0, [claim("senior", 1), claim("junior", 2)]);
    const now = snap(1, [claim("senior", 1), claim("junior", 2)]);
    expect(cartReceiptFacts(was, now, ["junior"])).toEqual({
      covered: [{ deckId: "senior", deckName: "deck senior" }],
      still: [{ deckId: "junior", deckName: "deck junior", need: 1 }],
    });
  });

  it("never names an off-line deck that was already covered, or a brew for its soft share", () => {
    const brew = { ...claim("brew", 0, 1, false), since: null };
    // Two copies covered both committed decks before; the third is a spare the brew only reads.
    const was = snap(2, [claim("held", 1), brew, claim("line", 2)]);
    const now = snap(3, [claim("held", 1), brew, claim("line", 2)]);
    expect(cartReceiptFacts(was, now, ["line"]).covered).toEqual([{ deckId: "line", deckName: "deck line" }]);
  });
});

describe("cartSource", () => {
  it("records the line's decks, and reads them back only off a cart entry", () => {
    expect(cartSourceDecks(cartSource(["a", "b"]))).toEqual(["a", "b"]);
    expect(cartSourceDecks("shopping:a")).toBeNull();
    expect(cartSourceDecks("shopping:cart")).toBeNull();
    expect(cartSourceDecks(null)).toBeNull();
  });
});

describe("regrant", () => {
  const withGrant = (c: Availability["claims"][number], granted: number) => ({ ...c, granted });

  it("grants the prior reservation out of the copies no commander holds, and nothing else", () => {
    const after = snap(2, [withGrant(claim("picked", 2), 1), claim("prior", 1), claim("other", 3)]);
    const before = regrant({ ...after, owned: 1 }, [{ deckId: "prior", copies: 1 }]);
    expect(before.claims.map((c) => [c.id, c.granted])).toEqual([["picked", 0], ["prior", 1], ["other", 0]]);
  });

  it("caps a want at the list ask and the supply left after earlier wants", () => {
    const cmd = { ...claim("cmd", 0, 1), commander: true, commanderCopies: 1 };
    const after = snap(2, [cmd, claim("a", 1, 2), claim("b", 2, 1)]);
    // Two owned, one held as a commander: one copy reservable. a wants 2 and gets 1; b gets none.
    const before = regrant(after, [{ deckId: "a", copies: 2 }, { deckId: "b", copies: 1 }]);
    expect(before.claims.map((c) => [c.id, c.granted])).toEqual([["cmd", 0], ["a", 1], ["b", 0]]);
  });
});
