import { describe, expect, it } from "vitest";
import type { HistoryRow } from "../../db/schema";
import type { WentRow } from "./arrivals";
import { annotateWentTo, wentByOracle, wentToOf } from "./went-to";
import type { Availability, DeckClaim } from "../decks/availability";

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

describe("wentByOracle, for a precon start", () => {
  // Production's shape (2026-10-14): one copy already held, which the senior deck holds, a junior deck short of it,
  // and the box's copy reserved to the new deck in the start's own transaction.
  const claim = (id: string, since: number, granted = 0): DeckClaim =>
    ({ id, name: id, quantity: 1, mature: true, since, pending: false, commander: false, senior: true, granted });
  const after = { owned: 2, claims: [claim("senior", 100), claim("junior", 200), claim("started", 300, 1)] } as unknown as Availability;
  const decksOf = (reservations: { deckId: string; copies: number }[]) =>
    wentByOracle({ sol: { after, brought: 1, reservations } }).get("sol")?.decks.map((d) => d.deckId);

  it("names the new deck when its before is granted with the reservations as they stood before the start", () => {
    expect(decksOf([])).toEqual(["started"]);
  });

  it("would credit an older deck if the before kept the start's own reservation", () => {
    // Why the write reads them before its inside work: the reservation hands the new deck the OLD copy in the
    // before, so the arriving one appears to land on the deck that copy had held.
    expect(decksOf([{ deckId: "started", copies: 1 }])).toEqual(["senior"]);
  });
});
