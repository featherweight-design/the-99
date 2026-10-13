import { describe, expect, it } from "vitest";
import type { HistoryRow } from "../../db/schema";
import type { WentRow } from "./arrivals";
import { annotateWentTo, wentToOf } from "./went-to";

const row = (oracleId: string, before: number, after: number, finish = "nonfoil"): HistoryRow => ({
  oracleId, setCode: "lea", collectorNumber: "1", finish, name: oracleId,
  before: before ? { quantity: before, scryfallId: null, condition: null } : null,
  after: after ? { quantity: after, scryfallId: null, condition: null } : null,
});
const held: WentRow = { kind: "held", decks: [{ deckId: "d1", copies: 1, picked: true }, { deckId: "d2", copies: 2, picked: false }], copies: 3, ownedBefore: 0 };
const soft: WentRow = { kind: "soft", decks: [{ deckId: "b1", copies: 0, picked: false }], copies: 1, ownedBefore: 0 };
const none: WentRow = { kind: "none", decks: [], copies: 1, ownedBefore: 0 };

describe("wentToOf", () => {
  it("keeps the decks and copies of a held placement, and marks a brew's read soft", () => {
    expect(wentToOf(held)).toEqual({ decks: [{ deckId: "d1", copies: 1 }, { deckId: "d2", copies: 2 }] });
    expect(wentToOf(soft)).toEqual({ soft: true, decks: [{ deckId: "b1", copies: 0 }] });
  });
  it("keeps nothing when no deck took a copy", () => {
    expect(wentToOf(none)).toBeNull();
  });
});

describe("annotateWentTo", () => {
  it("stamps the first raised row of each card and no other", () => {
    const rows = [row("a", 0, 1), row("a", 0, 1, "foil"), row("b", 2, 1), row("c", 0, 1), row("d", 1, 2)];
    annotateWentTo(rows, new Map([["a", held], ["b", held], ["c", none]]));
    expect(rows[0].wentTo?.decks).toHaveLength(2);
    expect(rows[1].wentTo).toBeUndefined(); // the same card's second finish
    expect(rows[2].wentTo).toBeUndefined(); // the count fell
    expect(rows[3].wentTo).toBeUndefined(); // no deck took it
    expect(rows[4].wentTo).toBeUndefined(); // no placement known for it
  });
});
