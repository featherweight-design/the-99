import { describe, expect, it } from "vitest";
import { arrivalPlacement, buildArrivalsSummary, summaryIsEmpty, withoutUndecided, type ArrivalsInput } from "./arrivals";
import type { Availability } from "../decks/availability";

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
    nowShort: [],
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
      claims: { [CARD]: { owned: 1, hard: 2, committedDecks: 2 } },
    }));
    // `ownedBefore` rides along frozen: it is what decides whether a commander's option may say
    // `keeps it`, which claims the deck had the card before this import.
    expect(s.contested).toEqual([{ oracleId: CARD, arrived: 1, ownedBefore: 0 }]);
  });

  it("is not a card that arrived with copies to spare", () => {
    const s = buildArrivalsSummary(input({
      ownedBefore: {},
      ownedAfter: { [CARD]: 2 },
      claims: { [CARD]: { owned: 2, hard: 2, committedDecks: 2 } },
    }));
    expect(s.contested).toEqual([]);
  });

  // A shortage is not a contention. One committed deck asking for three copies of a card the
  // player owns one of is short by two and has nobody to be short against — drawn as a row it
  // would offer a single option and no decision. Its purchase is reported in `Still to buy`.
  it("is not a card only one committed deck wants, however many copies it wants", () => {
    const s = buildArrivalsSummary(input({
      ownedBefore: {},
      ownedAfter: { [CARD]: 1 },
      claims: { [CARD]: { owned: 1, hard: 3, committedDecks: 1 } },
    }));
    expect(s.contested).toEqual([]);
  });

  it("is not a card that was already contested and did not move", () => {
    const s = buildArrivalsSummary(input({
      ownedBefore: { [CARD]: 1 },
      ownedAfter: { [CARD]: 1 },
      claims: { [CARD]: { owned: 1, hard: 3, committedDecks: 2 } },
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
      claims: { [CARD]: { owned: 1, hard: 2, committedDecks: 2 } },
    }));
    expect(summaryIsEmpty(s)).toBe(false);
  });
});

describe("withoutUndecided", () => {
  // The receipt listed a card under `No longer to buy` against whichever deck seniority favoured
  // while the chooser below was still asking which deck gets it, so picking the other deck
  // falsified the line above without touching it.
  const summary = () => buildArrivalsSummary(input({
    ownedBefore: {},
    ownedAfter: { [CARD]: 1, [OTHER]: 1 },
    buyBefore: [
      { deckId: DECK_A, oracleId: CARD, quantity: 1 },
      { deckId: DECK_A, oracleId: OTHER, quantity: 1 },
      { deckId: DECK_B, oracleId: CARD, quantity: 2 },
    ],
    buyAfter: [{ deckId: DECK_B, oracleId: CARD, quantity: 1 }],
    claims: { [CARD]: { owned: 1, hard: 2, committedDecks: 2 } },
  }));
  const both = [{ oracleId: CARD, deckIds: [DECK_A, DECK_B] }];

  it("takes an undecided card out of both money sections", () => {
    const s = withoutUndecided(summary(), both);
    expect(s.cleared.map((r) => r.oracleId)).toEqual([OTHER]);
    expect(s.still.map((r) => r.oracleId)).not.toContain(CARD);
  });

  it("leaves every other row where it was, so this is an exclusion and not a silence", () => {
    const before = summary();
    const after = withoutUndecided(before, both);
    expect(after.cleared.length).toBe(before.cleared.length - 1);
    expect(after.arrived).toBe(before.arrived);
    expect(after.contested).toEqual(before.contested);
    // The names map is untouched, so the chooser can still title the card it took.
    expect(after.names.cards[CARD]).toBe("Brushland");
  });

  it("returns the summary itself when nothing is undecided", () => {
    const before = summary();
    expect(withoutUndecided(before, [])).toBe(before);
  });

  it("keeps a row whose deck the chooser does not list as a claimant", () => {
    // The money rows are DRAFT-shaped and the chooser is version-shaped, so a deck whose draft
    // adds the card has a row here and no option there. Dropping it would report its demand
    // nowhere at all. Here the chooser claims DECK_A only, so DECK_B's deficit must survive.
    const s = withoutUndecided(summary(), [{ oracleId: CARD, deckIds: [DECK_A] }]);
    // DECK_A is a claimant, so its cleared row goes to the chooser.
    expect(s.cleared.some((r) => r.deckId === DECK_A && r.oracleId === CARD)).toBe(false);
    // DECK_B is not, so its row is the only report of that demand and stays.
    expect(s.still.some((r) => r.deckId === DECK_B && r.oracleId === CARD)).toBe(true);
  });

  it("keeps an unmatched row, which is about the FILE rather than the allocation", () => {
    // The issues line promises that any deck still billing an unparsed name is marked below, and
    // the chooser draws no file-error marker — so this row is the only thing keeping that true.
    const s = withoutUndecided(buildArrivalsSummary(input({
      ownedBefore: {},
      ownedAfter: { [CARD]: 1 },
      buyBefore: [{ deckId: DECK_A, oracleId: CARD, quantity: 1 }],
      buyAfter: [{ deckId: DECK_A, oracleId: CARD, quantity: 1 }],
      // Matched to the card by NAME, which is how `isUnmatched` reads it.
      unmatched: [{ name: "Brushland", line: 12 }],
      claims: { [CARD]: { owned: 1, hard: 2, committedDecks: 2 } },
    })), both);
    expect(s.still.map((r) => r.reason.kind)).toContain("unmatched");
  });

  it("keys on the LIVE list, not on what the payload recorded as contested", () => {
    // The payload still names CARD as contested; the caller passes what the claim read says NOW.
    const s = withoutUndecided(summary(), [{ oracleId: OTHER, deckIds: [DECK_A] }]);
    expect(s.contested.map((c) => c.oracleId)).toEqual([CARD]);
    expect(s.cleared.map((r) => r.oracleId)).toContain(CARD);
    expect(s.cleared.map((r) => r.oracleId)).not.toContain(OTHER);
    expect(s.still.map((r) => r.oracleId)).toContain(CARD);
  });
});

describe("arrivals — decks left short", () => {
  it("freezes the write's short decks and their names into a version-3 receipt", () => {
    const s = buildArrivalsSummary(input({
      ownedBefore: { [CARD]: 2 },
      ownedAfter: {},
      nowShort: [{ deckId: DECK_A, oracleId: CARD, short: 2 }],
    }));
    expect(s.version).toBe(3);
    expect(s.nowShort).toEqual([{ deckId: DECK_A, oracleId: CARD, short: 2 }]);
    expect(s.names.decks[DECK_A]).toBe("HD Avatar Aang");
    expect(s.names.cards[CARD]).toBe("Brushland");
  });

  it("is not an empty receipt when it left a deck short", () => {
    const s = buildArrivalsSummary(input({ nowShort: [{ deckId: DECK_A, oracleId: CARD, short: 1 }] }));
    expect(summaryIsEmpty(s)).toBe(false);
  });
});

describe("arrivals — where the copies went (version 4)", () => {
  const held = { held: [{ deckId: DECK_B, deckName: "x", copies: 1, picked: false }], soft: [], unplaced: 0 };

  it("stays a version 3 with no `went` when no placements are passed (the switch off)", () => {
    const s = buildArrivalsSummary(input({ ownedBefore: { [CARD]: 1 }, ownedAfter: { [CARD]: 2 } }));
    expect(s.version).toBe(3);
    expect("went" in s).toBe(false);
  });

  it("records each arrived card's destination per card, with the copies and what it held before", () => {
    const s = buildArrivalsSummary(input({
      ownedBefore: { [CARD]: 1 },
      ownedAfter: { [CARD]: 2 },
      placements: { [CARD]: held },
    }));
    expect(s.version).toBe(4);
    expect(s.went).toEqual({
      [CARD]: { kind: "held", decks: [{ deckId: DECK_B, copies: 1, picked: false }], copies: 1, ownedBefore: 1 },
    });
    // The deck the line names is frozen with the rest, so a rename cannot rewrite the receipt.
    expect(s.names.decks[DECK_B]).toBe("Elemental Dragons");
    expect(s.names.cards[CARD]).toBe("Brushland");
  });

  it("calls a loose copy brews read `soft`, and a copy nobody took `none`", () => {
    const s = buildArrivalsSummary(input({
      ownedAfter: { [CARD]: 1, [OTHER]: 1 },
      placements: {
        [CARD]: { held: [], soft: [{ deckId: DECK_A, deckName: "x" }], unplaced: 1 },
        [OTHER]: { held: [], soft: [], unplaced: 1 },
      },
    }));
    expect(s.went?.[CARD]).toMatchObject({ kind: "soft", decks: [{ deckId: DECK_A, copies: 0, picked: false }] });
    expect(s.went?.[OTHER]).toMatchObject({ kind: "none", decks: [] });
  });

  it("records nothing for a card that brought no copies", () => {
    const s = buildArrivalsSummary(input({
      ownedBefore: { [CARD]: 2 },
      ownedAfter: { [CARD]: 2 },
      placements: { [CARD]: held },
    }));
    expect(s.went).toEqual({});
  });
});

describe("arrivalPlacement", () => {
  const claim = (id: string, since: number | null, granted = 0, mature = true) =>
    ({ id, name: `deck ${id}`, quantity: 1, mature, since, granted }) as Availability["claims"][number];

  it("gives the import's copy to the deck seniority now covers", () => {
    const after = { owned: 2, claims: [claim("a", 1), claim("b", 2)] };
    expect(arrivalPlacement(after, 1, []).held).toEqual([{ deckId: "b", deckName: "deck b", copies: 1, picked: false }]);
  });

  it("reads a reservation the import filled as a pick made earlier", () => {
    // No copy before: the player had picked the junior deck, which the claim model could not grant
    // until a copy arrived. The grant outranks seniority, so the senior deck still buys it.
    const after = { owned: 1, claims: [claim("a", 1), claim("b", 2, 1)] };
    expect(arrivalPlacement(after, 1, [{ deckId: "b", copies: 1 }]).held).toEqual([{ deckId: "b", deckName: "deck b", copies: 1, picked: true }]);
  });

  it("reads a pick the collection already covered as no news", () => {
    // Two copies before: the pick was granted already, and the third copy goes nowhere.
    const after = { owned: 3, claims: [claim("a", 1), claim("b", 2, 1)] };
    expect(arrivalPlacement(after, 1, [{ deckId: "b", copies: 1 }])).toEqual({ held: [], soft: [], unplaced: 1 });
  });

  it("covers the OLDEST reservation from the smaller supply, whatever the decks are called", () => {
    // Two reservations, both granted now that two copies are owned. Before the import there was
    // one copy, and it went to `z`, reserved first; `a` sorts first by name and is the one the
    // import filled.
    const after = { owned: 2, claims: [claim("a", 1, 1), claim("z", 2, 1)] };
    expect(arrivalPlacement(after, 1, [{ deckId: "z", copies: 1 }, { deckId: "a", copies: 1 }]).held)
      .toEqual([{ deckId: "a", deckName: "deck a", copies: 1, picked: true }]);
  });
});
