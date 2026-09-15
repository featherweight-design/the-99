import { describe, expect, it } from "vitest";
import { buildArrivalsSummary, summaryIsEmpty, type ArrivalsInput } from "./arrivals";

const CARD = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";
const DECK_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const DECK_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function input(over: Partial<ArrivalsInput> = {}): ArrivalsInput {
  return {
    ownedBefore: {},
    ownedAfter: {},
    buyBefore: [],
    buyAfter: [],
    claims: {},
    unmatched: [],
    parseErrorCount: 0,
    cardNames: { [CARD]: "Brushland", [OTHER]: "Birds of Paradise" },
    deckNames: { [DECK_A]: "HD Avatar Aang", [DECK_B]: "Elemental Dragons" },
    ...over,
  };
}

describe("arrivals — copies", () => {
  it("counts copies gained and lost apart, not as a net figure", () => {
    const s = buildArrivalsSummary(input({
      ownedBefore: { [CARD]: 1, [OTHER]: 3 },
      ownedAfter: { [CARD]: 3, [OTHER]: 1 },
    }));
    expect(s.arrived).toBe(2);
    expect(s.left).toBe(2);
    // A net figure would report zero here and the receipt would say nothing moved.
    expect(s.totalBefore).toBe(4);
    expect(s.totalAfter).toBe(4);
  });

  it("reads an absent oracle as nought rather than skipping it", () => {
    const s = buildArrivalsSummary(input({ ownedBefore: {}, ownedAfter: { [CARD]: 2 } }));
    expect(s.arrived).toBe(2);
    expect(s.left).toBe(0);
  });
});

describe("arrivals — the buy-row diff", () => {
  it("clears a deck that stopped owing a card", () => {
    const s = buildArrivalsSummary(input({
      ownedBefore: {},
      ownedAfter: { [CARD]: 1 },
      buyBefore: [{ deckId: DECK_A, oracleId: CARD, quantity: 1 }],
      buyAfter: [],
    }));
    expect(s.cleared).toEqual([{ deckId: DECK_A, oracleId: CARD, copies: 1 }]);
    expect(s.still).toEqual([]);
  });

  it("reports a deficit that only fell, which a membership diff cannot see", () => {
    const s = buildArrivalsSummary(input({
      ownedBefore: { [CARD]: 0 },
      ownedAfter: { [CARD]: 1 },
      buyBefore: [{ deckId: DECK_A, oracleId: CARD, quantity: 2 }],
      buyAfter: [{ deckId: DECK_A, oracleId: CARD, quantity: 1 }],
    }));
    expect(s.cleared).toEqual([]);
    expect(s.still).toEqual([{
      deckId: DECK_A,
      oracleId: CARD,
      owed: 1,
      reason: { kind: "partly", arrived: 1, wanted: 2 },
    }]);
  });

  it("reports a deck put back into debt by a card that left the collection", () => {
    const s = buildArrivalsSummary(input({
      ownedBefore: { [CARD]: 1 },
      ownedAfter: {},
      buyBefore: [],
      buyAfter: [{ deckId: DECK_B, oracleId: CARD, quantity: 1 }],
    }));
    expect(s.still).toEqual([{
      deckId: DECK_B, oracleId: CARD, owed: 1, reason: { kind: "gone" },
    }]);
  });

  it("keys on the deck as well as the card, so two decks owing one card are two rows", () => {
    const s = buildArrivalsSummary(input({
      buyBefore: [
        { deckId: DECK_A, oracleId: CARD, quantity: 1 },
        { deckId: DECK_B, oracleId: CARD, quantity: 1 },
      ],
      buyAfter: [{ deckId: DECK_B, oracleId: CARD, quantity: 1 }],
    }));
    expect(s.cleared).toHaveLength(1);
    expect(s.cleared[0].deckId).toBe(DECK_A);
    expect(s.still).toEqual([]);
  });

  it("says nothing about a deficit that did not move", () => {
    const rows = [{ deckId: DECK_A, oracleId: CARD, quantity: 2 }];
    const s = buildArrivalsSummary(input({ buyBefore: rows, buyAfter: rows }));
    expect(s.cleared).toEqual([]);
    expect(s.still).toEqual([]);
  });
});

describe("arrivals — an unmatched name overrides the buy-row reason", () => {
  it("names the file rather than sending the player shopping", () => {
    const s = buildArrivalsSummary(input({
      buyAfter: [{ deckId: DECK_A, oracleId: CARD, quantity: 1 }],
      unmatched: [{ name: "Brushland", line: 12 }],
    }));
    expect(s.still[0].reason).toEqual({ kind: "unmatched" });
  });

  it("matches through the importer's own name normalisation", () => {
    const s = buildArrivalsSummary(input({
      cardNames: { [CARD]: "Fire // Ice" },
      buyAfter: [{ deckId: DECK_A, oracleId: CARD, quantity: 1 }],
      unmatched: [{ name: "fire/ice", line: 3 }],
    }));
    expect(s.still[0].reason).toEqual({ kind: "unmatched" });
  });

  it("leaves an unrelated failed name alone", () => {
    const s = buildArrivalsSummary(input({
      buyAfter: [{ deckId: DECK_A, oracleId: CARD, quantity: 1 }],
      unmatched: [{ name: "Some Other Card", line: 9 }],
    }));
    expect(s.still[0].reason).toEqual({ kind: "gone" });
  });

  // An upload can hold a good copy of a card AND a second line naming it that failed to
  // match. The deck is then exactly as short as it was — nothing cleared, nothing reduced,
  // nothing raised — so the row only exists because the name failed, and without it the one
  // reason the player can act on is invisible.
  it("emits an unchanged deficit when that card's own line failed to match", () => {
    const rows = [{ deckId: DECK_A, oracleId: CARD, quantity: 1 }];
    const s = buildArrivalsSummary(input({
      buyBefore: rows,
      buyAfter: rows,
      unmatched: [{ name: "Brushland", line: 7 }],
    }));
    expect(s.still).toEqual([{
      deckId: DECK_A, oracleId: CARD, owed: 1, reason: { kind: "unmatched" },
    }]);
  });

  it("leaves every other unchanged deficit out of the receipt", () => {
    const rows = [{ deckId: DECK_A, oracleId: CARD, quantity: 1 }];
    const s = buildArrivalsSummary(input({
      buyBefore: rows,
      buyAfter: rows,
      unmatched: [{ name: "Something Else", line: 7 }],
    }));
    expect(s.still).toEqual([]);
  });

  it("counts parse errors without attributing them to a row", () => {
    const s = buildArrivalsSummary(input({
      buyAfter: [{ deckId: DECK_A, oracleId: CARD, quantity: 1 }],
      parseErrorCount: 3,
    }));
    expect(s.issues).toEqual({ unmatched: 0, parseErrors: 3 });
    expect(s.still[0].reason).toEqual({ kind: "gone" });
  });
});

describe("arrivals — contention", () => {
  it("is a card that arrived and is still wanted by more committed decks than there are copies", () => {
    const s = buildArrivalsSummary(input({
      ownedBefore: {},
      ownedAfter: { [CARD]: 1 },
      claims: { [CARD]: { owned: 1, hard: 2 } },
    }));
    expect(s.contested).toEqual([{ oracleId: CARD, arrived: 1 }]);
  });

  it("is not a card that arrived with copies to spare", () => {
    const s = buildArrivalsSummary(input({
      ownedBefore: {},
      ownedAfter: { [CARD]: 2 },
      claims: { [CARD]: { owned: 2, hard: 2 } },
    }));
    expect(s.contested).toEqual([]);
  });

  it("is not a card that was already contested and did not move", () => {
    const s = buildArrivalsSummary(input({
      ownedBefore: { [CARD]: 1 },
      ownedAfter: { [CARD]: 1 },
      claims: { [CARD]: { owned: 1, hard: 3 } },
    }));
    expect(s.contested).toEqual([]);
  });
});

describe("arrivals — the frozen names", () => {
  it("carries a name for every row it emits and nothing else", () => {
    const s = buildArrivalsSummary(input({
      ownedAfter: { [CARD]: 1 },
      buyBefore: [{ deckId: DECK_A, oracleId: CARD, quantity: 1 }],
      buyAfter: [],
    }));
    expect(s.names.cards).toEqual({ [CARD]: "Brushland" });
    expect(s.names.decks).toEqual({ [DECK_A]: "HD Avatar Aang" });
    // Birds of Paradise is in the catalog map and on no row, so it is not frozen.
    expect(s.names.cards[OTHER]).toBeUndefined();
  });
});

describe("arrivals — the empty receipt", () => {
  it("is empty when no deck was affected, however much the file changed", () => {
    const s = buildArrivalsSummary(input({
      ownedBefore: { [CARD]: 1 },
      ownedAfter: { [OTHER]: 1 },
    }));
    expect(summaryIsEmpty(s)).toBe(true);
    // …and still reports the file's own delta, so "nothing moved" reads as a fact
    // about decks rather than a failed import.
    expect(s.arrived).toBe(1);
    expect(s.left).toBe(1);
  });

  it("is not empty when only the contested section has rows", () => {
    const s = buildArrivalsSummary(input({
      ownedAfter: { [CARD]: 1 },
      claims: { [CARD]: { owned: 1, hard: 2 } },
    }));
    expect(summaryIsEmpty(s)).toBe(false);
  });
});
