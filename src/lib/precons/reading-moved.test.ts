// Small items 5, PR 6a, round 2: the change-log half of a stored reading's freshness. `readingMoved` (the
// H1 rule a press recomputes on) is mocked, so each test pins what is asked of it and what it answers.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deckProfile } from "../../components/decks/__fixtures__/deck-profile";
import { NO_PRECON_READING, preconReadingColumns, preconReadingOf } from "./reading-rule";
import { PROFILE_VERSION } from "../profile/version";

const moved = vi.hoisted(() => ({ answer: false, calls: [] as unknown[] }));
vi.mock("../notices/read", () => ({
  readingMoved: vi.fn(async (marks: unknown) => { moved.calls.push(marks); return moved.answer; }),
}));
const { preconColumnsMoved, preconReadingFresh, preconReadingMoved } = await import("./reading");

const WHOLE = { partnerOracleId: null, cards: [{ oracleId: "x", quantity: 99 }] };
const profile = { ...deckProfile(), commanderOracleIds: ["cmd-a", "cmd-b"] };
const cols = preconReadingColumns({ head: WHOLE, profile, list: "list-1", catalog: "1", seenSeq: 42, analyzedOracleIds: ["a", "b"], at: new Date(0) });
const reading = preconReadingOf(cols)!;

beforeEach(() => { moved.answer = false; moved.calls = []; });

describe("preconReadingMoved", () => {
  it("asks readingMoved with the reading's own marks, the commanders included", async () => {
    await preconReadingMoved(reading);
    expect(moved.calls).toEqual([{ seenSeq: 42, rulesVersion: reading.rulesVersion, analyzedOracleIds: ["a", "b"], commanderOracleIds: ["cmd-a", "cmd-b"] }]);
  });
  it("answers what the log says", async () => {
    expect(await preconReadingMoved(reading)).toBe(false);
    moved.answer = true;
    expect(await preconReadingMoved(reading)).toBe(true);
  });
});

describe("preconReadingFresh", () => {
  it("is fresh when the log is unchanged, and not once it moved", async () => {
    expect(await preconReadingFresh(reading, "list-1")).toBe(true);
    moved.answer = true;
    expect(await preconReadingFresh(reading, "list-1")).toBe(false);
    expect(moved.calls).toHaveLength(2);
  });
  it("skips the log read for no reading, another list, or another profile version", async () => {
    moved.answer = true;
    expect(await preconReadingFresh(null, "list-1")).toBe(false);
    expect(await preconReadingFresh(reading, "list-2")).toBe(false);
    expect(await preconReadingFresh({ ...reading, profileVersion: PROFILE_VERSION - 1 }, "list-1")).toBe(false);
    expect(moved.calls).toEqual([]);
  });
});

describe("preconColumnsMoved", () => {
  it("reads the log for a current reading and answers what it says", async () => {
    moved.answer = true;
    expect(await preconColumnsMoved(cols, "list-1")).toBe(true);
    expect(moved.calls).toHaveLength(1);
  });
  it("skips the log read for missing columns and a version-mismatched reading", async () => {
    moved.answer = true;
    expect(await preconColumnsMoved(NO_PRECON_READING, "list-1")).toBe(false);
    expect(await preconColumnsMoved({ ...cols, readingProfileVersion: PROFILE_VERSION - 1 }, "list-1")).toBe(false);
    expect(await preconColumnsMoved({ ...cols, readingRulesVersion: -1 }, "list-1")).toBe(false);
    expect(moved.calls).toEqual([]);
  });
});
