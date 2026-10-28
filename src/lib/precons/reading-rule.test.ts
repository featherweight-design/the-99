// Small items 5, PR 6a: the stored precon reading's columns and the rule that judges it.
import { describe, expect, it } from "vitest";
import { deckProfile } from "../../components/decks/__fixtures__/deck-profile";
import { slotDeck } from "../bracket/slot";
import { BRACKET_RULES_VERSION } from "../bracket/rules-version";
import { PROFILE_VERSION } from "../profile/version";
import { NO_PRECON_READING, preconReadingColumns, preconReadingCurrent, preconReadingDue, preconReadingOf, preconReadingWrite } from "./reading-rule";
import { deckLegality } from "../profile/stored";

const profile = deckProfile();
const at = new Date("2026-10-28T00:00:00Z");
// A whole body (99 cards under one commander, 98 under a pair): what Analyze's size gate accepts.
const WHOLE = { partnerOracleId: null, cards: [{ oracleId: "x", quantity: 98 }, { oracleId: "y", quantity: 1 }] };
const base = { head: WHOLE, profile, list: "list-1", catalog: "1793155191579", seenSeq: 42, analyzedOracleIds: ["a", "b"], at };
const cols = preconReadingColumns(base);

describe("preconReadingColumns", () => {
  it("stores the profile row an Analyze press writes: the reading, its permits, its list and its marks", () => {
    expect(cols.reading).toBe(profile);
    expect(cols.readingPermits).toEqual([...slotDeck(profile).permits].sort((a, b) => a - b));
    expect(cols).toMatchObject({
      readingList: "list-1", readingCatalog: "1793155191579", readingSeenSeq: 42, readingAnalyzedOracleIds: ["a", "b"], readingAt: at,
      readingProfileVersion: PROFILE_VERSION, readingRulesVersion: BRACKET_RULES_VERSION,
    });
  });
});

describe("preconReadingOf", () => {
  it("is the whole reading, or null when any column is missing", () => {
    expect(preconReadingOf(cols)).toMatchObject({ list: "list-1", seenSeq: 42, permits: cols.readingPermits, profile });
    expect(preconReadingOf(NO_PRECON_READING)).toBeNull();
    expect(preconReadingOf({ ...cols, readingSeenSeq: null })).toBeNull();
    expect(preconReadingOf({ ...cols, reading: null })).toBeNull();
  });
});

describe("preconReadingCurrent", () => {
  const r = preconReadingOf(cols);
  it("is current for its own list under this code's profile and rules versions", () => {
    expect(preconReadingCurrent(r, { list: "list-1" })).toBe(true);
  });
  it("is not for another list, an older profile or rules version, or none at all", () => {
    expect(preconReadingCurrent(r, { list: "list-2" })).toBe(false);
    expect(preconReadingCurrent(preconReadingOf({ ...cols, readingProfileVersion: PROFILE_VERSION - 1 }), { list: "list-1" })).toBe(false);
    expect(preconReadingCurrent(preconReadingOf({ ...cols, readingRulesVersion: BRACKET_RULES_VERSION - 1 }), { list: "list-1" })).toBe(false);
    expect(preconReadingCurrent(null, { list: "list-1" })).toBe(false);
  });
  it("never reads the catalog generation: every catalog write stamps it, and a deck's own reading is not judged by it", () => {
    expect(preconReadingCurrent(preconReadingOf({ ...cols, readingCatalog: "0" }), { list: "list-1" })).toBe(true);
  });
});

describe("preconReadingDue", () => {
  it("is due with none stored, when not current, or when the data under it moved, whatever else holds", () => {
    expect(preconReadingDue(NO_PRECON_READING, { list: "list-1", moved: false })).toBe(true);
    expect(preconReadingDue(cols, { list: "list-2", moved: false })).toBe(true);
    expect(preconReadingDue(cols, { list: "list-1", moved: true })).toBe(true);
    expect(preconReadingDue(cols, { list: "list-1", moved: false })).toBe(false);
  });
});

// Round 2: a precon kept by the ingest with unmapped copies left out has a short list, which Analyze
// refuses (`deckLegality`, the press's own gate). It stores no reading, and a stale one is cleared.
describe("a short precon list (Analyze's size gate)", () => {
  const short = { partnerOracleId: null, cards: [{ oracleId: "x", quantity: 97 }] };
  it("stores no reading for a list the press would refuse, under one commander or a pair", () => {
    expect(deckLegality({ ...short, cards: [...short.cards] }).legal).toBe(false);
    expect(preconReadingColumns({ ...base, head: short })).toEqual(NO_PRECON_READING);
    expect(preconReadingColumns({ ...base, head: { partnerOracleId: "p", cards: [{ oracleId: "x", quantity: 99 }] } })).toEqual(NO_PRECON_READING);
  });
  it("stores one for a whole list, a pair's 98 included", () => {
    expect(preconReadingColumns({ ...base, head: { partnerOracleId: "p", cards: [{ oracleId: "x", quantity: 98 }] } }).reading).toBe(profile);
  });
});

describe("preconReadingWrite", () => {
  const none = NO_PRECON_READING;
  it("writes a reading that is due, and not one that is current", () => {
    expect(preconReadingWrite(null, cols, false)).toBe(true);
    expect(preconReadingWrite(none, cols, false)).toBe(true);
    expect(preconReadingWrite(cols, cols, false)).toBe(false);
    expect(preconReadingWrite(cols, cols, true)).toBe(true);
  });
  it("clears a stored reading once the list is short, and writes nothing where none is stored", () => {
    expect(preconReadingWrite(cols, none, false)).toBe(true);
    expect(preconReadingWrite(none, none, false)).toBe(false);
    expect(preconReadingWrite(null, none, false)).toBe(false);
  });
});
