import { describe, expect, it } from "vitest";
import type { HistoryRow } from "../../db/schema";
import type { HistoryListEntry } from "./history";
import { entryTitle, groupByDay, groupRows, historyReachesBack, rowGroup, timeLabel } from "./history-view";

const entry = (over: Partial<HistoryListEntry>): HistoryListEntry => ({
  id: "e", seq: 1, createdAt: new Date("2026-10-09T14:02:00Z"), kind: "add", source: null, raised: 1, lowered: 0, rowCount: 1,
  copiesUp: 1, copiesDown: 0, removesOnly: false, revertsId: null, revertedBy: null, revertsVisible: false, revertedByVisible: false,
  uploadFilename: null, firstName: "Sol Ring", shoppingDeck: null, shoppingCart: false, cartDecks: null, ...over,
});
const row = (before: number | null, after: number | null): HistoryRow => ({
  oracleId: "o", setCode: "lea", collectorNumber: "1", finish: "nonfoil", name: "X",
  before: before === null ? null : { quantity: before, scryfallId: null, condition: null },
  after: after === null ? null : { quantity: after, scryfallId: null, condition: null },
});
const NOW = Date.parse("2026-10-09T20:00:00Z");

describe("groupByDay", () => {
  it("names today and yesterday and dates the rest, in UTC, newest first", () => {
    const g = groupByDay(
      [
        entry({ id: "a", createdAt: new Date("2026-10-09T14:02:00Z") }),
        entry({ id: "b", createdAt: new Date("2026-10-09T09:14:00Z") }),
        entry({ id: "c", createdAt: new Date("2026-10-08T21:10:00Z") }),
        entry({ id: "d", createdAt: new Date("2026-10-03T01:00:00Z") }),
      ],
      NOW,
    );
    expect(g.map((x) => x.label)).toEqual(["Today · 9 Oct", "Yesterday · 8 Oct", "3 Oct"]);
    expect(g[0].entries.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("keeps one group, and so one key, per day when createdAt is not monotonic", () => {
    const g = groupByDay(
      [
        entry({ id: "a", createdAt: new Date("2026-10-09T14:02:00Z") }),
        entry({ id: "b", createdAt: new Date("2026-10-08T21:10:00Z") }),
        entry({ id: "c", createdAt: new Date("2026-10-09T09:14:00Z") }),
      ],
      NOW,
    );
    expect(new Set(g.map((x) => x.key)).size).toBe(g.length);
    expect(g.map((x) => x.entries.map((e) => e.id))).toEqual([["a", "c"], ["b"]]);
  });

  it("reads a late-evening UTC entry on its UTC day, not the reader's", () => {
    expect(groupByDay([entry({ createdAt: new Date("2026-10-09T23:59:00Z") })], NOW)[0].label).toBe("Today · 9 Oct");
    expect(timeLabel(new Date("2026-10-09T09:05:00Z"))).toBe("09:05");
  });
});

describe("historyReachesBack", () => {
  it("is the ship date while history is younger than 90 days, and the 90-day edge after", () => {
    const ship = new Date("2026-10-01T00:00:00Z");
    expect(historyReachesBack(ship, NOW)).toEqual(ship);
    expect(historyReachesBack(ship, Date.parse("2027-03-01T00:00:00Z")).toISOString()).toBe("2026-12-01T00:00:00.000Z");
  });
});

describe("entryTitle", () => {
  const none = new Map<string, HistoryListEntry>();
  const reach = new Date("2026-10-01T00:00:00Z");
  it("titles an upload by its file, and falls back rather than printing a blank", () => {
    expect(entryTitle(entry({ kind: "upload_replace", uploadFilename: "manabox-oct.csv" }), none, reach)).toBe("manabox-oct.csv");
    expect(entryTitle(entry({ kind: "upload_add", uploadFilename: null }), none, reach)).toBe("Untitled change");
  });
  it("titles a hand change by its first card and how many more", () => {
    expect(entryTitle(entry({ rowCount: 1 }), none, reach)).toBe("Sol Ring");
    expect(entryTitle(entry({ rowCount: 3 }), none, reach)).toBe("Sol Ring and 2 more");
  });
  it("titles a revert by what it undid: the entry when on the page, else the aged or earlier wording", () => {
    const undone = entry({ id: "u", kind: "upload_replace", uploadFilename: "x.csv" });
    const byId = new Map([["u", undone]]);
    expect(entryTitle(entry({ kind: "revert", revertsId: "u", revertsVisible: true }), byId, reach)).toBe("Undid “x.csv”");
    expect(entryTitle(entry({ kind: "revert", revertsId: "gone", revertsVisible: false }), none, reach)).toBe("Undid a change from before 1 Oct");
    expect(entryTitle(entry({ kind: "revert", revertsId: "old", revertsVisible: true }), none, reach)).toBe("Undid an earlier change");
  });
});

describe("rowGroup and groupRows", () => {
  it("splits a long entry into Left, Went down, Went up, New and Details, in that order", () => {
    expect(rowGroup(row(3, null))).toBe("left");
    expect(rowGroup(row(3, 0))).toBe("left");
    expect(rowGroup(row(3, 1))).toBe("down");
    expect(rowGroup(row(1, 3))).toBe("up");
    expect(rowGroup(row(null, 2))).toBe("new");
    // Same copies, different printing or condition: still a change, so it is kept.
    expect(rowGroup(row(2, 2))).toBe("details");
    expect(groupRows([row(null, 1), row(1, 4), row(2, null), row(2, 2)]).map((g) => g.group)).toEqual(["left", "up", "new", "details"]);
    expect(groupRows([row(2, 2)]).map((g) => g.group)).toEqual(["details"]);
  });
});
