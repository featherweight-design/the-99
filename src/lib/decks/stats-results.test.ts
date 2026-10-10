import { describe, expect, it } from "vitest";

import { recordText, resultsStats } from "./stats-results";

const g = (result: "win" | "loss" | "draw", day: number, versionNumber: number | null = null) => ({
  result,
  playedAt: new Date(new Date().getFullYear(), 7, day, 12),
  versionNumber,
});
const v = (number: number, day: number) => ({ number, committedAt: new Date(Date.UTC(new Date().getFullYear(), 7, day)) });

// listDeckGames is newest first.
const sixNewestFirst = [g("win", 28, null), g("draw", 14, 2), g("win", 6, 2), g("loss", 3, 1), g("win", 2, 1), g("win", 1, 2)];

describe("resultsStats", () => {
  it("reads the record and the beads oldest first", () => {
    const r = resultsStats(sixNewestFirst, []);
    expect(r.games).toBe(6);
    expect(recordText(r.record)).toBe("4–1–1");
    expect(r.beads.map((b) => b.result)).toEqual(["win", "win", "loss", "win", "draw", "win"]);
    expect(r.span).toEqual({ from: sixNewestFirst[5].playedAt, to: sixNewestFirst[0].playedAt });
  });

  it("marks the last five only past the fifth game, and states their record", () => {
    const r = resultsStats(sixNewestFirst, []);
    expect(r.beads.map((b) => b.lastFive)).toEqual([false, true, true, true, true, true]);
    expect(recordText(r.lastFive!)).toBe("3–1–1");
    const five = resultsStats(sixNewestFirst.slice(1), []);
    expect(five.games).toBe(5);
    expect(five.beads.some((b) => b.lastFive)).toBe(false);
    expect(five.lastFive).toBeNull();
  });

  it("keeps two games on one date in the order they were logged", () => {
    // Newest first: the one logged later comes first, so it is the later bead.
    const r = resultsStats([g("loss", 5), g("win", 5)], []);
    expect(r.beads.map((b) => b.result)).toEqual(["win", "loss"]);
  });

  it("is empty with no games, with no record to print", () => {
    const r = resultsStats([], [v(1, 10)]);
    expect(r.games).toBe(0);
    expect(r.beads).toEqual([]);
    expect(r.span).toBeNull();
    expect(r.lastFive).toBeNull();
  });

  it("has no by-version section for a brew", () => {
    expect(resultsStats(sixNewestFirst, []).versions).toBeNull();
  });

  it("groups by version, current first, an empty version without a record, Version not recorded last", () => {
    const r = resultsStats(sixNewestFirst, [v(3, 30), v(2, 1), v(1, 10)]);
    const rows = r.versions!;
    expect(rows.map((x) => x.key)).toEqual(["3", "2", "1", "unrecorded"]);
    expect(rows.map((x) => x.current)).toEqual([true, false, false, false]);
    expect(rows[0].record).toBeNull();
    expect(rows[0].beads).toEqual([]);
    expect(recordText(rows[1].record!)).toBe("2–0–1");
    expect(rows[1].beads).toEqual(["win", "win", "draw"]);
    expect(recordText(rows[2].record!)).toBe("1–1–0");
    expect(recordText(rows[3].record!)).toBe("1–0–0");
  });

  it("puts a game stamped with a version the deck does not hold in Version not recorded, never dropping it", () => {
    const r = resultsStats([g("win", 3, 9), g("loss", 2, null)], [v(1, 10)]);
    expect(r.versions!.map((x) => x.key)).toEqual(["1", "unrecorded"]);
    expect(recordText(r.versions![1].record!)).toBe("1–1–0");
    const total = r.versions!.reduce((n, x) => n + x.beads.length, 0);
    expect(total).toBe(r.games);
  });

  it("omits Version not recorded when every game is stamped", () => {
    const r = resultsStats([g("win", 3, 1)], [v(1, 10)]);
    expect(r.versions!.map((x) => x.key)).toEqual(["1"]);
  });
});
