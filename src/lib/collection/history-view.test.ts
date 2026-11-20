import { describe, expect, it } from "vitest";
import type { HistoryRow } from "../../db/schema";
import type { HistoryListEntry } from "./history";
import {
  clockLabel, dateLabel, entryTitle, fullStamp, groupByDay, groupRows, hasRecent, historyReachesBack, msToLocalMidnight, rowGroup, timeSlot, whenPhrase,
} from "./history-view";

const entry = (over: Partial<HistoryListEntry>): HistoryListEntry => ({
  id: "e", seq: 1, createdAt: new Date("2026-10-09T14:02:00Z"), kind: "add", source: null, raised: 1, lowered: 0, rowCount: 1,
  copiesUp: 1, copiesDown: 0, removesOnly: false, revertsId: null, revertedBy: null, revertsVisible: false, revertedByVisible: false,
  uploadFilename: null, firstName: "Sol Ring", shoppingDeck: null, shoppingCart: false, preconName: null, addedFromDeck: null, cartDecks: null, wentTo: null, ...over,
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
      "UTC",
    );
    expect(g.map((x) => x.label)).toEqual(["Today · Oct 9", "Yesterday · Oct 8", "Saturday · Oct 3"]);
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
      "UTC",
    );
    expect(new Set(g.map((x) => x.key)).size).toBe(g.length);
    expect(g.map((x) => x.entries.map((e) => e.id))).toEqual([["a", "c"], ["b"]]);
  });

});

// The reader's zone, not the store's (#2986): Wed Nov 18 2026, 2:14 PM MST (21:14Z), America/Denver.
const DENVER = "America/Denver";
const DEN_NOW = Date.parse("2026-11-18T21:14:00Z");
const at = (iso: string) => new Date(iso);

describe("groupByDay in the reader's zone", () => {
  it("files an entry at 06:40Z on the day before in Denver: Yesterday, 11:40 PM", () => {
    const e = entry({ createdAt: at("2026-11-18T06:40:00Z") });
    expect(groupByDay([e], DEN_NOW, DENVER)[0].label).toBe("Yesterday · Nov 17");
    expect(groupByDay([e], DEN_NOW, "UTC")[0].label).toBe("Today · Nov 18");
    expect(clockLabel(e.createdAt, DENVER, "en-US")).toBe("11:40 PM");
  });

  it("names Today, Yesterday, then a weekday for two to six days back, then the date, then the year when it is another one", () => {
    const g = groupByDay(
      [
        entry({ id: "a", createdAt: at("2026-11-18T20:13:00Z") }),
        entry({ id: "b", createdAt: at("2026-11-17T22:15:00Z") }),
        entry({ id: "c", createdAt: at("2026-11-16T17:00:00Z") }),
        entry({ id: "d", createdAt: at("2026-11-12T17:00:00Z") }),
        entry({ id: "e", createdAt: at("2026-11-08T17:00:00Z") }),
        entry({ id: "f", createdAt: at("2025-12-30T17:00:00Z") }),
      ],
      DEN_NOW,
      DENVER,
    );
    expect(g.map((x) => x.label)).toEqual(["Today · Nov 18", "Yesterday · Nov 17", "Monday · Nov 16", "Thursday · Nov 12", "Nov 8", "Dec 30, 2025"]);
  });

  it("puts the sixth day back on a weekday and the seventh on a date", () => {
    const g = groupByDay([entry({ id: "a", createdAt: at("2026-11-12T17:00:00Z") }), entry({ id: "b", createdAt: at("2026-11-11T17:00:00Z") })], DEN_NOW, DENVER);
    expect(g.map((x) => x.label)).toEqual(["Thursday · Nov 12", "Nov 11"]);
  });

  it("keeps one wall-clock day across a DST change (Denver falls back on Nov 1, 2026)", () => {
    const now = Date.parse("2026-11-02T20:00:00Z");
    const g = groupByDay(
      [entry({ id: "a", createdAt: at("2026-11-02T08:30:00Z") }), entry({ id: "b", createdAt: at("2026-11-01T07:30:00Z") }), entry({ id: "c", createdAt: at("2026-11-01T05:30:00Z") })],
      now,
      DENVER,
    );
    // 08:30Z Nov 2 is 1:30 AM MST Nov 2 (today); 07:30Z Nov 1 is 12:30 AM MST Nov 1 and 05:30Z is 11:30 PM MDT Oct 31.
    expect(g.map((x) => [x.label, x.entries.map((y) => y.id)])).toEqual([["Today · Nov 2", ["a"]], ["Yesterday · Nov 1", ["b"]], ["Saturday · Oct 31", ["c"]]]);
  });
});

describe("the time slot and the phrase", () => {
  const e = (iso: string) => at(iso);
  it("reads Just now under a minute, N min ago under an hour, then the clock", () => {
    expect(timeSlot(e("2026-11-18T21:13:30Z"), DEN_NOW, DENVER, "en-US")).toBe("Just now");
    expect(timeSlot(e("2026-11-18T21:02:00Z"), DEN_NOW, DENVER, "en-US")).toBe("12 min ago");
    expect(timeSlot(e("2026-11-18T20:14:00Z"), DEN_NOW, DENVER, "en-US")).toBe("1:14 PM");
    expect(timeSlot(e("2026-11-18T15:25:00Z"), DEN_NOW, DENVER, "en-US")).toBe("8:25 AM");
  });

  it("follows the browser locale's hour cycle (14:02 in en-GB)", () => {
    expect(clockLabel(e("2026-11-18T21:02:00Z"), DENVER, "en-GB")).toBe("14:02");
    expect(clockLabel(e("2026-11-18T21:02:00Z"), DENVER, "en-US")).toBe("2:02 PM");
  });

  it("phrases a moment inside a sentence, with its own day", () => {
    expect(whenPhrase(e("2026-11-18T21:13:30Z"), DEN_NOW, DENVER, "en-US")).toBe("just now");
    expect(whenPhrase(e("2026-11-18T21:02:00Z"), DEN_NOW, DENVER, "en-US")).toBe("12 min ago");
    expect(whenPhrase(e("2026-11-18T16:30:00Z"), DEN_NOW, DENVER, "en-US")).toBe("today at 9:30 AM");
    expect(whenPhrase(e("2026-11-17T22:15:00Z"), DEN_NOW, DENVER, "en-US")).toBe("yesterday at 3:15 PM");
    expect(whenPhrase(e("2026-11-12T19:05:00Z"), DEN_NOW, DENVER, "en-US")).toBe("Nov 12 at 12:05 PM");
    expect(whenPhrase(e("2025-12-30T23:00:00Z"), DEN_NOW, DENVER, "en-US")).toBe("Dec 30, 2025 at 4:00 PM");
  });

  it("does not read a revert from another day as the same day's", () => {
    // 16:30Z yesterday is 9:30 AM MST on Nov 17, an hour after now (21:14Z) on Nov 18: never "today".
    expect(whenPhrase(e("2026-11-17T16:30:00Z"), DEN_NOW, DENVER, "en-US")).toBe("yesterday at 9:30 AM");
  });

  it("reads a stamp from the future as just now, not a negative age", () => {
    expect(timeSlot(e("2026-11-18T21:20:00Z"), DEN_NOW, DENVER, "en-US")).toBe("Just now");
  });

  it("spells the full stamp for the title", () => {
    expect(fullStamp(e("2026-11-18T21:13:00Z"), DENVER, "en-US")).toBe("Wednesday, November 18, 2026 at 2:13 PM MST");
  });

  it("labels a date with the year only outside the reader's current year", () => {
    expect(dateLabel(e("2026-11-08T17:00:00Z"), new Date(DEN_NOW), DENVER)).toBe("Nov 8");
    expect(dateLabel(e("2025-12-30T17:00:00Z"), new Date(DEN_NOW), DENVER)).toBe("Dec 30, 2025");
  });
});

describe("the clock's schedule", () => {
  it("owes a tick only while an entry is under an hour old", () => {
    expect(hasRecent([entry({ createdAt: at("2026-11-18T20:30:00Z") })], DEN_NOW)).toBe(true);
    expect(hasRecent([entry({ createdAt: at("2026-11-18T20:14:00Z") })], DEN_NOW)).toBe(false);
  });

  it("is the time to the reader's next local midnight (Denver: 7:00Z in winter)", () => {
    // 21:14Z Nov 18 is 2:14 PM MST; midnight Nov 19 MST is 07:00Z Nov 19: 9 h 46 min away.
    expect(msToLocalMidnight(DEN_NOW, DENVER)).toBe((9 * 60 + 46) * 60_000);
  });

  it("lands on the right midnight across a DST change (Denver falls back Nov 1: a 25-hour day)", () => {
    // 12:00Z Oct 31 is 6:00 AM MDT; midnight Nov 1 MDT is 06:00Z Nov 1, 18 h away. The next, midnight Nov 2 MST, is 07:00Z Nov 2.
    expect(msToLocalMidnight(Date.parse("2026-10-31T12:00:00Z"), DENVER)).toBe(18 * 3_600_000);
    expect(msToLocalMidnight(Date.parse("2026-11-01T08:00:00Z"), DENVER)).toBe(23 * 3_600_000);
  });

  it("does not spin where a zone skips midnight on a DST night (Santiago springs forward 24:00 to 01:00 on Sep 6, 2026)", () => {
    // 00:00Z Sep 6 is 8 PM Sep 5 in Santiago; there is no 00:00 on Sep 6, the day begins at 01:00 (04:00Z): 4 h away, never 0.
    expect(msToLocalMidnight(Date.parse("2026-09-06T00:00:00Z"), "America/Santiago")).toBe(4 * 3_600_000);
    // Just past the skipped hour, the next day start is a full day on.
    expect(msToLocalMidnight(Date.parse("2026-09-06T05:00:00Z"), "America/Santiago")).toBeGreaterThan(20 * 3_600_000);
  });

  it("spells the clock with a plain space before AM/PM on any ICU", () => {
    expect(clockLabel(at("2026-11-18T21:02:00Z"), DENVER, "en-US")).toBe("2:02 PM");
    expect(fullStamp(at("2026-11-18T21:13:00Z"), DENVER, "en-US")).not.toContain("\u202f");
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
    expect(entryTitle(entry({ kind: "upload_replace", uploadFilename: "manabox-oct.csv" }), none, reach, "UTC")).toBe("manabox-oct.csv");
    expect(entryTitle(entry({ kind: "upload_add", uploadFilename: null }), none, reach, "UTC")).toBe("Untitled change");
    // A Sync is titled by its file, never by its first card: a tokens-only Sync names no card at all.
    expect(entryTitle(entry({ kind: "upload_sync", uploadFilename: "The Vault.csv", firstName: "Sol Ring" }), none, reach, "UTC")).toBe("The Vault.csv");
  });
  it("titles a hand change by its first card and how many more", () => {
    expect(entryTitle(entry({ rowCount: 100, source: "precon:Multiverse_Reforged", preconName: "Multiverse Reforged" }), none, reach, "UTC")).toBe("Added from Multiverse Reforged");
    // A precon since dropped from the feed has no name to give, so the entry reads as any add does.
    expect(entryTitle(entry({ rowCount: 100, source: "precon:Gone", preconName: null }), none, reach, "UTC")).toBe("Sol Ring and 99 more");
    expect(entryTitle(entry({ rowCount: 1 }), none, reach, "UTC")).toBe("Sol Ring");
    // An import's own-these-cards add is titled by its deck, by the deck's current name; a deck since
    // deleted reads as any add does.
    const DECK = "7284ff0a-6e76-4dc0-8af5-fc630a403b2b";
    expect(entryTitle(entry({ rowCount: 100, source: `deck:${DECK}`, addedFromDeck: { id: DECK, name: "Father and son" } }), none, reach, "UTC")).toBe("Added from Father and son");
    expect(entryTitle(entry({ rowCount: 100, source: `deck:${DECK}`, addedFromDeck: { id: DECK, name: null } }), none, reach, "UTC")).toBe("Sol Ring and 99 more");
    expect(entryTitle(entry({ rowCount: 3 }), none, reach, "UTC")).toBe("Sol Ring and 2 more");
  });
  it("titles a revert by what it undid: the entry when on the page, else the aged or earlier wording", () => {
    const undone = entry({ id: "u", kind: "upload_replace", uploadFilename: "x.csv" });
    const byId = new Map([["u", undone]]);
    expect(entryTitle(entry({ kind: "revert", revertsId: "u", revertsVisible: true }), byId, reach, "UTC")).toBe("Reverted “x.csv”");
    expect(entryTitle(entry({ kind: "revert", revertsId: "gone", revertsVisible: false }), none, reach, "UTC")).toBe("Reverted a change from before Oct 1");
    expect(entryTitle(entry({ kind: "revert", revertsId: "old", revertsVisible: true }), none, reach, "UTC")).toBe("Reverted an earlier change");
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
