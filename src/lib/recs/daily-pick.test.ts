import { describe, expect, it } from "vitest";
import { dailyPick, ROTATION_WINDOW } from "./daily-pick";

const items = (n: number) => Array.from({ length: n }, (_, i) => `c${i}`);

// 2026-09-07T23:30Z is the following UTC day from 2026-09-07T00:30Z, and both sit
// inside a single local day in most of the world. The cut is UTC on purpose.
const day = (iso: string) => new Date(iso);

describe("dailyPick", () => {
  it("returns null for an empty list rather than an index into nothing", () => {
    expect(dailyPick([], "user-a", day("2026-09-07T09:00:00Z"))).toBeNull();
  });

  it("holds the same pick across a whole UTC day", () => {
    const list = items(20);
    const morning = dailyPick(list, "user-a", day("2026-09-07T00:00:00Z"));
    const night = dailyPick(list, "user-a", day("2026-09-07T23:59:59Z"));
    expect(morning).toBe(night);
  });

  it("gives two users different days their own pick", () => {
    const list = items(20);
    const a = new Set(
      ["2026-09-07", "2026-09-08", "2026-09-09", "2026-09-10"].map(
        (d) => dailyPick(list, "user-a", day(`${d}T09:00:00Z`)) as string,
      ),
    );
    const b = new Set(
      ["2026-09-07", "2026-09-08", "2026-09-09", "2026-09-10"].map(
        (d) => dailyPick(list, "user-b", day(`${d}T09:00:00Z`)) as string,
      ),
    );
    // Not an assertion that they never coincide — with a five-card window they
    // sometimes must. Only that the seed reaches both inputs, so the two users
    // are not locked to one shared sequence.
    expect([...a].join()).not.toBe([...b].join());
  });

  // The window is the point of the feature: rank 1 was what shipped before, and a
  // rotation that can still only reach rank 1 is not one.
  it("never picks outside the rotation window", () => {
    const list = items(50);
    const seen = new Set<string>();
    for (let d = 1; d <= 60; d += 1) {
      const iso = `2026-10-${String(d).padStart(2, "0")}T09:00:00Z`;
      if (d > 31) continue;
      seen.add(dailyPick(list, "user-a", day(iso)) as string);
    }
    expect(seen.size).toBeGreaterThan(1);
    for (const pick of seen) {
      expect(list.slice(0, ROTATION_WINDOW)).toContain(pick);
    }
  });

  // A new collection can have fewer candidates than the window.
  it("stays inside a list shorter than the window", () => {
    const list = items(2);
    for (let d = 1; d <= 31; d += 1) {
      const iso = `2026-10-${String(d).padStart(2, "0")}T09:00:00Z`;
      expect(list).toContain(dailyPick(list, "user-a", day(iso)) as string);
    }
  });

  it("picks the only candidate when there is one", () => {
    expect(dailyPick(["solo"], "user-a", day("2026-09-07T09:00:00Z"))).toBe("solo");
  });
});
