// Small items 5, PR 6a: the stored precon reading's columns and the rule that judges it.
import { describe, expect, it } from "vitest";
import { deckProfile } from "../../components/decks/__fixtures__/deck-profile";
import { slotDeck } from "../bracket/slot";
import { BRACKET_RULES_VERSION } from "../bracket/rules-version";
import { PROFILE_VERSION } from "../profile/version";
import { NO_PRECON_READING, preconReadingColumns, preconReadingCurrent, preconReadingDue, preconReadingOf } from "./reading-rule";

const profile = deckProfile();
const at = new Date("2026-10-28T00:00:00Z");
const cols = preconReadingColumns({ profile, list: "list-1", catalog: "1793155191579", seenSeq: 42, analyzedOracleIds: ["a", "b"], at });

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
