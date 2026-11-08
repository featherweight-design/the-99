import { describe, expect, it } from "vitest";

import {
  anchorCursor, archiveQuery, countIn, dayLabel, firstYear, groupByMonth, monthLabel, monthShort, nearestMonth, newestMonth, parseArchiveKind,
  parseCursor, parseYm, toMonthCounts, totalFrom, yearsUnder, ymOf,
} from "./archive-model";
import type { FeedView } from "../feed/home";

const counts = toMonthCounts([
  { ym: "2026-11", kind: "secret-lair", n: 2 },
  { ym: "2026-11", kind: "wizards-news", n: "4" },
  { ym: "2026-10", kind: "commander-decklists", n: 3 },
  { ym: "2025-02", kind: "commander-decklists", n: 1 },
  { ym: "2025-03", kind: "wizards-news", n: 5 },
  { ym: "2015-09", kind: "wizards-news", n: 1 },
  { ym: "2024-05", kind: "not-a-kind", n: 9 },
  { ym: "bad", kind: "wizards-news", n: 9 },
]);

describe("month counts", () => {
  it("folds the grouped read, coercing counts and dropping a kind or month the app does not know", () => {
    expect(counts["2026-11"]).toEqual({ "secret-lair": 2, "wizards-news": 4 });
    expect(counts["2024-05"]).toBeUndefined();
    expect(counts.bad).toBeUndefined();
  });

  it("counts a month overall and under a kind", () => {
    expect(countIn(counts, "2026-11", "all")).toBe(6);
    expect(countIn(counts, "2026-11", "secret-lair")).toBe(2);
    expect(countIn(counts, "2026-11", "commander-decklists")).toBe(0);
    expect(countIn(counts, "2000-01", "all")).toBe(0);
  });

  it("totals every post, or those from a month down, under a kind", () => {
    expect(totalFrom(counts, "all", null)).toBe(6 + 3 + 1 + 5 + 1);
    expect(totalFrom(counts, "commander-decklists", null)).toBe(4);
    expect(totalFrom(counts, "all", "2025-03")).toBe(5 + 1 + 1);
  });

  it("reads the first year from the oldest stored post, not a drawn figure", () => {
    expect(firstYear(counts)).toBe(2015);
    expect(firstYear({})).toBeNull();
  });

  it("names the newest month holding a post under a kind", () => {
    expect(newestMonth(counts, "all")).toBe("2026-11");
    expect(newestMonth(counts, "commander-decklists")).toBe("2026-10");
    expect(newestMonth({}, "all")).toBeNull();
  });

  it("lays the jump out newest year first, every year to the oldest, a month with none under a kind at zero", () => {
    const years = yearsUnder(counts, "commander-decklists");
    expect(years.map((y) => y.year)).toEqual([2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015]);
    expect(years[0].n).toBe(3);
    expect(years[0].months).toHaveLength(12);
    expect(years[0].months.find((m) => m.ym === "2026-11")!.n).toBe(0);
    expect(years[0].months.find((m) => m.ym === "2026-10")!.n).toBe(3);
    expect(yearsUnder({}, "all")).toEqual([]);
  });

  it("finds the nearest month with a post, the older on a tie, null when the kind has none", () => {
    // March 2025 under decklists: February 2025 is one away, October 2026 nineteen.
    expect(nearestMonth(counts, "commander-decklists", "2025-03")).toBe("2025-02");
    expect(nearestMonth(counts, "wizards-news", "2025-02")).toBe("2025-03");
    // Equidistant: 2025-02 and 2025-04 around 2025-03 would tie; here 2026-10 and 2025-02 around a midpoint.
    expect(nearestMonth({ "2025-01": { "secret-lair": 1 }, "2025-03": { "secret-lair": 1 } }, "secret-lair", "2025-02")).toBe("2025-01");
    expect(nearestMonth({}, "all", "2025-02")).toBeNull();
  });
});

describe("the address", () => {
  it("reads a kind and a month, and anything else is All and no month", () => {
    expect(parseArchiveKind("secret-lair")).toBe("secret-lair");
    expect(parseArchiveKind("price-drop")).toBe("all");
    expect(parseArchiveKind(undefined)).toBe("all");
    expect(parseYm("2025-03")).toBe("2025-03");
    expect(parseYm("2025-13")).toBeNull();
    expect(parseYm("2025-3")).toBeNull();
  });

  it("writes defaults as absences", () => {
    expect(archiveQuery("all", null)).toBe("");
    expect(archiveQuery("commander-decklists", null)).toBe("?kind=commander-decklists");
    expect(archiveQuery("all", "2025-03")).toBe("?m=2025-03");
    expect(archiveQuery("wizards-news", "2025-03")).toBe("?kind=wizards-news&m=2025-03");
  });
});

describe("the keyset cursor", () => {
  const ID = "0b1c2d3e-0000-4000-8000-00000000abcd";

  it("takes a database timestamp and an id, and nothing else", () => {
    expect(parseCursor(`2026-11-03 17:00:00.123456+00|${ID}`)).toEqual({ at: "2026-11-03 17:00:00.123456+00", id: ID });
    expect(parseCursor(`2026-11-03 17:00:00+00|${ID}`)).not.toBeNull();
    expect(parseCursor(`2026-11-03T17:00:00Z|${ID}`)).toBeNull();
    expect(parseCursor(`2026-11-03 17:00:00+00|not-a-uuid`)).toBeNull();
    expect(parseCursor(`2026-11-03 17:00:00+00|${ID}|extra`)).toBeNull();
    expect(parseCursor("'; drop table x; --|")).toBeNull();
    expect(parseCursor(42)).toBeNull();
  });

  it("anchors a month at the first instant of the next, so the month's newest post is the first row", () => {
    expect(parseCursor(anchorCursor("2025-03"))).toEqual({ at: "2025-04-01 00:00:00+00", id: "00000000-0000-0000-0000-000000000000" });
    expect(parseCursor(anchorCursor("2025-12"))!.at).toBe("2026-01-01 00:00:00+00");
  });
});

describe("months and rows", () => {
  const at = (iso: string): FeedView => ({ key: iso, kind: "wizards-news", at: iso, unseen: false } as FeedView);

  it("groups by UTC month, in order, so a late-evening post stays in the month it is dated", () => {
    const g = groupByMonth([at("2026-11-02T01:00:00Z"), at("2026-11-01T00:00:00Z"), at("2026-10-31T23:59:59Z"), at("2026-11-30T00:00:00Z")]);
    expect(g.map((x) => [x.ym, x.items.length])).toEqual([["2026-11", 2], ["2026-10", 1], ["2026-11", 1]]);
    expect(ymOf("2026-10-31T23:59:59Z")).toBe("2026-10");
  });

  it("words a month and a day", () => {
    expect(monthLabel("2025-03")).toBe("March 2025");
    expect(monthShort("2026-11")).toBe("Nov 2026");
    expect(dayLabel("2026-10-28T09:00:00Z")).toBe("Oct 28");
  });
});
