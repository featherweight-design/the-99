import { describe, expect, it } from "vitest";
import type { Bracket, BracketLean, ComboRef } from "../bracket/types";
import {
  distanceFrom,
  driversFor,
  inRead,
  seatState,
  seatValue,
  startingDeck,
  suggestionsFor,
  tableRead,
  type SeatValue,
  type TableRead,
  setterZone,
  tableClosesAt,
} from "./rules";

const one = (bracket: Bracket): SeatValue => ({ kind: "one", bracket });
const range = (lo: Bracket, hi: Bracket): SeatValue => ({ kind: "range", lo, hi });

/** Seats named a, b, c... in order, so each case reads as its brackets. */
const table = (...values: (SeatValue | null)[]) =>
  tableRead(values.map((value, i) => ({ id: String.fromCharCode(97 + i), value })));

const flags = (r: TableRead) =>
  r.kind === "read" ? Object.fromEntries(r.seats.map((s) => [s.id, s.flag ? `${s.flag.dir}${s.flag.split ? " split" : ""}` : null])) : r;

describe("seatValue", () => {
  it("is the bracket a single reading permits", () => {
    expect(seatValue([3], null)).toEqual(one(3));
    expect(seatValue([3], 1)).toEqual(one(3));
  });

  it("takes a declaration inside a range as the answer", () => {
    expect(seatValue([4, 5], 4)).toEqual(one(4));
    expect(seatValue([1, 2], 2)).toEqual(one(2));
  });

  it("keeps an undeclared range open", () => {
    expect(seatValue([1, 2], null)).toEqual(range(1, 2));
  });

  it("never compares a drifted declaration: a [4,5] reading declared 1 stays the range", () => {
    expect(seatValue([4, 5], 1)).toEqual(range(4, 5));
  });
});

describe("tableRead", () => {
  it("flags both ends of 2, 3, 3, 4 (two outliers)", () => {
    const r = table(one(2), one(3), one(3), one(4));
    expect(r).toMatchObject({ kind: "read", middle: 3, band: true });
    expect(flags(r)).toEqual({ a: "low", b: null, c: null, d: "high" });
  });

  it("flags the 4 at 2, 2, 4", () => {
    const r = table(one(2), one(2), one(4));
    expect(r).toMatchObject({ middle: 2 });
    expect(flags(r)).toEqual({ a: null, b: null, c: "high" });
  });

  it("reads 3, 3, 3 as balanced", () => {
    expect(flags(table(one(3), one(3), one(3)))).toEqual({ a: null, b: null, c: null });
  });

  it("leaves an undeclared [1,2] unflagged beside 1, 1 and beside 2, 2, its face at the nearer end", () => {
    const low = table(range(1, 2), one(1), one(1));
    expect(flags(low)).toEqual({ a: null, b: null, c: null });
    expect(low.kind === "read" && low.seats[0].face).toBe(1);

    const high = table(range(1, 2), one(2), one(2));
    expect(flags(high)).toEqual({ a: null, b: null, c: null });
    expect(high.kind === "read" && high.seats[0].face).toBe(2);
  });

  it("measures [1,2], [1,2], 1, 3 from 1.5 with no circularity: only the 3 is flagged", () => {
    const r = table(range(1, 2), range(1, 2), one(1), one(3));
    expect(r).toMatchObject({ middle: 1.5 });
    expect(flags(r)).toEqual({ a: null, b: null, c: null, d: "high" });
  });

  it("draws a range's face at its lower end when the middle is its midpoint", () => {
    const r = table(range(1, 2), one(1), one(2));
    expect(r.kind === "read" && r.seats[0].face).toBe(1);
  });

  it("compares a declared [4,5] as its answer", () => {
    expect(flags(table(seatValue([4, 5], 4), one(2), one(2)))).toEqual({ a: "high", b: null, c: null });
  });

  it("measures a drifted [4,5] declared 1 as the range, never as 1", () => {
    const r = table(seatValue([4, 5], 1), one(4), one(4));
    expect(flags(r)).toEqual({ a: null, b: null, c: null });
  });

  it("flags a two-seat table a bracket or more apart as a split, with no band", () => {
    const r = table(one(2), one(4));
    expect(r).toMatchObject({ kind: "read", band: false });
    expect(flags(r)).toEqual({ a: "low split", b: "high split" });
  });

  it("reads a two-seat [1,2] and 2 as balanced, since the range covers the 2", () => {
    const r = table(range(1, 2), one(2));
    expect(r).toMatchObject({ band: true });
    expect(flags(r)).toEqual({ a: null, b: null });
  });

  it("has nothing to compare with one read seat beside one left out", () => {
    expect(table(one(3), null)).toEqual({ kind: "notEnough", read: 1 });
  });

  it("leaves a seat out of the read without dropping the others", () => {
    const r = table(one(2), null, one(2), one(4));
    expect(flags(r)).toEqual({ a: null, c: null, d: "high" });
  });
});

describe("seatState", () => {
  it("waits for a seat with no deck", () => {
    expect(seatState(null)).toEqual({ kind: "waiting" });
  });

  it("counts the whole deck for one not legal now, commanders in, even with a reading", () => {
    expect(seatState({ built: 86, size: 99, reading: { fresh: true } })).toEqual({ kind: "illegal", cards: 87 });
    expect(seatState({ built: 100, size: 99, reading: "none" })).toEqual({ kind: "illegal", cards: 101 });
    expect(seatState({ built: 97, size: 98, reading: "none" })).toEqual({ kind: "illegal", cards: 99 });
  });

  it("reads on the spot only a legal deck with no row at all", () => {
    expect(seatState({ built: 99, size: 99, reading: "none" })).toEqual({ kind: "unread" });
  });

  it("asks the player to analyze a legal deck whose row this deployment cannot read", () => {
    expect(seatState({ built: 99, size: 99, reading: "unreadable" })).toEqual({ kind: "needsAnalysis" });
  });

  it("keeps a stale reading, marked so", () => {
    expect(seatState({ built: 98, size: 98, reading: { fresh: true } })).toEqual({ kind: "fresh" });
    expect(seatState({ built: 99, size: 99, reading: { fresh: false } })).toEqual({ kind: "stale" });
  });

  it("compares only fresh and stale seats", () => {
    const kinds = ["waiting", "illegal", "unread", "needsAnalysis", "fresh", "stale"] as const;
    expect(kinds.filter((kind) => inRead({ kind, cards: 0 } as never))).toEqual(["fresh", "stale"]);
  });
});

const card = (n: string) => ({ oracleId: n, name: n });
const combo: ComboRef = { variantId: "v1", cards: [card("Thassa"), card("Consultation")], produces: [], bracketTag: "" } as unknown as ComboRef;

describe("driversFor", () => {
  const high = { dir: "high", split: false } as const;

  it("names the counts that passed the bracket below", () => {
    const d = driversFor({
      permits: [4],
      violations: [{ rule: "gameChangers", bracket: 3, have: 5, limit: 3 }, { rule: "gameChangers", bracket: 2, have: 5, limit: 0 }],
      lean: null,
    }, high, 4);
    expect(d).toEqual({ kind: "ruledOut", below: 3, reasons: [{ rule: "gameChangers", have: 5, limit: 3 }] });
  });

  it("names the assembled combo and counts the distinct tutors that reach it", () => {
    const lean: BracketLean = {
      likely: 4,
      reason: "reachable",
      decidedBy: combo,
      receipts: [{ combo, pieces: [
        { piece: card("Thassa"), tutors: [card("Demonic"), card("Vampiric")] },
        { piece: card("Consultation"), tutors: [card("Demonic")] },
      ] }],
    };
    expect(driversFor({ permits: [4], violations: [], lean }, high, 4))
      .toEqual({ kind: "assembled", below: 3, combo, tutors: 2 });
  });

  it("takes a high [4,5] range's reasons from bracket 3, where its sub-line would only say intent", () => {
    const d = driversFor({ permits: [4, 5], violations: [{ rule: "gameChangers", bracket: 3, have: 5, limit: 3 }], lean: null }, high, 4);
    expect(d).toEqual({ kind: "ruledOut", below: 3, reasons: [{ rule: "gameChangers", have: 5, limit: 3 }] });
  });

  it("names each rule once on a range's reasons, however many violations carry it", () => {
    const twice = { rule: "gameChangers" as const, bracket: 3 as const, have: 5, limit: 3 };
    const d = driversFor({ permits: [4, 5], violations: [twice, twice], lean: null }, high, 4);
    expect(d).toEqual({ kind: "ruledOut", below: 3, reasons: [{ rule: "gameChangers", have: 5, limit: 3 }] });
  });

  it("speaks a low seat by its own bracket", () => {
    expect(driversFor({ permits: [2], violations: [], lean: null }, { dir: "low", split: false }, 2)).toEqual({ kind: "low", bracket: 2 });
  });
});

describe("suggestionsFor", () => {
  const at = (day: number) => new Date(Date.UTC(2026, 9, day));

  it("offers no single-bracket deck at a two-seat split of adjacent brackets, whose middle is a half-bracket (open for PR 7)", () => {
    // [2] and [3]: middle 2.5, each seat 0.5 from it. Another 3 is also 0.5 from it, so it is not strictly nearer;
    // only an open [2,3] range (0 from the middle) is. PR 7, the suggestion's first caller, decides whether a split
    // should instead offer decks nearer the OTHER seat.
    const own = [
      { deckId: "seated", value: one(2), lastPlayedAt: at(10) },
      { deckId: "three", value: one(3), lastPlayedAt: at(9) },
      { deckId: "range", value: range(2, 3), lastPlayedAt: at(8) },
    ];
    expect(suggestionsFor("seated", 0.5, own, 2.5).map((d) => d.deckId)).toEqual(["range"]);
  });

  it("offers at most three of the player's decks strictly nearer the middle, nearest first, then most recently played", () => {
    const own = [
      { deckId: "seated", value: one(4), lastPlayedAt: at(10) },
      { deckId: "far", value: one(4), lastPlayedAt: at(9) },
      { deckId: "near-old", value: one(3), lastPlayedAt: at(1) },
      { deckId: "near-new", value: one(3), lastPlayedAt: at(5) },
      { deckId: "near-never", value: one(3), lastPlayedAt: null },
      // Nearest (0 from a middle of 2) and never played: it leads only because distance comes before recency.
      { deckId: "mid", value: range(1, 2), lastPlayedAt: null },
      { deckId: "unread", value: null, lastPlayedAt: at(12) },
    ];
    const got = suggestionsFor("seated", distanceFrom(one(4), 2), own, 2);
    expect(got.map((d) => d.deckId)).toEqual(["mid", "near-new", "near-old"]);
  });

  it("offers nothing when no deck is nearer", () => {
    expect(suggestionsFor("a", 1, [{ deckId: "b", value: one(4), lastPlayedAt: null }], 3)).toEqual([]);
  });
});

describe("startingDeck", () => {
  const at = (day: number) => new Date(Date.UTC(2026, 9, day));

  it("starts on the most recently played deck", () => {
    expect(startingDeck([
      { deckId: "a", lastPlayedAt: at(2), lastEditedAt: at(9) },
      { deckId: "b", lastPlayedAt: at(5), lastEditedAt: at(1) },
    ])).toBe("b");
  });

  it("falls back to the most recently edited when none was played", () => {
    expect(startingDeck([
      { deckId: "a", lastPlayedAt: null, lastEditedAt: at(2) },
      { deckId: "b", lastPlayedAt: null, lastEditedAt: at(7) },
    ])).toBe("b");
  });

  it("has nothing to start on with no decks", () => {
    expect(startingDeck([])).toBeNull();
  });
});

describe("tableClosesAt", () => {
  const LA = "America/Los_Angeles";
  const at = (iso: string) => new Date(iso);

  it("closes at the next 6:00 am in the setter's zone", () => {
    // Fri 9:17 pm PDT closes Sat 6:00 am PDT.
    expect(tableClosesAt(at("2026-10-31T04:17:00Z"), LA).toISOString()).toBe("2026-10-31T13:00:00.000Z");
    // A table set in the afternoon runs to the next morning.
    expect(tableClosesAt(at("2026-10-30T21:00:00Z"), LA).toISOString()).toBe("2026-10-31T13:00:00.000Z");
  });

  it("runs at least four hours: 1:30 am closes that 6:00 am, 2:00:01 am and 5:50 am the next", () => {
    expect(tableClosesAt(at("2026-10-31T08:30:00Z"), LA).toISOString()).toBe("2026-10-31T13:00:00.000Z");
    // The boundary is 2:00 am PDT (09:00Z): 6:00 am is exactly four hours on.
    expect(tableClosesAt(at("2026-10-31T09:00:00Z"), LA).toISOString()).toBe("2026-10-31T13:00:00.000Z");
    expect(tableClosesAt(at("2026-10-31T09:00:01Z"), LA).toISOString()).toBe("2026-11-01T14:00:00.000Z");
    // 5:50 am PDT Sat closes 6:00 am Sun, which is PST after the clocks fall back.
    expect(tableClosesAt(at("2026-10-31T12:50:00Z"), LA).toISOString()).toBe("2026-11-01T14:00:00.000Z");
  });

  it("judges an unknown zone as UTC", () => {
    expect(tableClosesAt(at("2026-10-31T00:00:00Z"), "Not/AZone").toISOString()).toBe("2026-10-31T06:00:00.000Z");
  });
});

describe("setterZone", () => {
  it("takes the browser's zone, else the IP's, else UTC", () => {
    expect(setterZone("Europe/London", "America/New_York")).toBe("Europe/London");
    expect(setterZone("bogus", "America/New_York")).toBe("America/New_York");
    expect(setterZone(42, null)).toBe("UTC");
    expect(setterZone(undefined, "nope")).toBe("UTC");
  });
});
