import { describe, expect, it } from "vitest";
import { receiptFacts } from "./mark-bought";
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
