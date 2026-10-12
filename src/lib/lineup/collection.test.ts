import { describe, expect, it } from "vitest";
import { collectionScope, wantedRows } from "./collection";
import type { LineupCollection } from "./types";

const C: LineupCollection = {
  copies: 100, cards: 60, valueCents: 50_000,
  all: { inDeckCopies: 34, inDeckCents: 35_000 },
  finished: { inDeckCopies: 30, inDeckCents: 30_000 },
  wanted: [
    // Two copies, one in deck a: one idle. Gishath's decks run it at 58%, a's at 30%.
    { oracleId: "boots", name: "Swiftfoot Boots", owned: 2, wants: [{ deckId: "a", n: 1 }], hits: [{ deckId: "g", pct: 58 }, { deckId: "a", pct: 30 }] },
    // Every copy in a deck: not idle.
    { oracleId: "sol", name: "Sol Ring", owned: 1, wants: [{ deckId: "g", n: 1 }], hits: [{ deckId: "g", pct: 90 }] },
    { oracleId: "beast", name: "Beast Within", owned: 1, wants: [], hits: [{ deckId: "b", pct: 47 }] },
  ],
};

describe("wantedRows", () => {
  it("lists idle owned copies once, at the best share among the decks in scope, most first", () => {
    expect(wantedRows(C, new Set(["a", "g", "b"]), null)).toEqual([
      { oracleId: "boots", name: "Swiftfoot Boots", pct: 58, deckId: "g", idle: 1 },
      { oracleId: "beast", name: "Beast Within", pct: 47, deckId: "b", idle: 1 },
    ]);
  });

  it("narrows to one deck's own share when a deck is chosen", () => {
    expect(wantedRows(C, new Set(["a", "g", "b"]), "a").map((r) => [r.name, r.pct])).toEqual([["Swiftfoot Boots", 30]]);
  });

  it("counts a copy idle when the deck that needs it is out of scope", () => {
    expect(wantedRows(C, new Set(["g", "b"]), null).find((r) => r.oracleId === "boots")?.idle).toBe(2);
  });
});

describe("collectionScope", () => {
  it("reads the scope's in-deck figures against totals that never narrow", () => {
    expect(collectionScope(C, "all")).toMatchObject({ inDeckCopies: 34, pctCopies: 34, pctValue: 70 });
    expect(collectionScope(C, "finished")).toMatchObject({ inDeckCopies: 30, pctCopies: 30, pctValue: 60 });
  });
});
