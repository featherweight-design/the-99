import { describe, expect, it } from "vitest";

import { dropLines, saleAhead, type DropSale } from "./drop-lines";

const NOW = new Date("2026-11-10T15:00:00Z"); // Tue 10 a.m. in New York
// Avatar: sale Mon Nov 16, 9 a.m. PT (17:00Z), pre-queue 8 a.m. PT.
const AVATAR: DropSale = { date: "2026-11-16", at: "2026-11-16T17:00:00Z", preQueueAt: "2026-11-16T16:00:00Z", zone: "America/Los_Angeles" };

describe("a drop with an hour, for a reader in New York (states 2, 2b, 2c, 3, 4)", () => {
  it("names the sale and the pre-queue in the reader's clock, and the store's on the mono line", () => {
    expect(dropLines(AVATAR, NOW, "America/New_York")).toEqual({
      age: "in 6 days", state: "ahead", sale: "On sale Mon Nov 16, 12 p.m. your time", queue: "Pre-queue opens at 11 a.m.", store: "9 a.m. PT on the US store",
    });
  });
  it("has no second line with no pre-queue", () => {
    const l = dropLines({ ...AVATAR, date: "2026-11-12", at: "2026-11-12T17:00:00Z", preQueueAt: null }, NOW, "America/New_York");
    expect(l).toMatchObject({ age: "in 2 days", sale: "On sale Thu Nov 12, 12 p.m. your time", queue: null });
  });
  it("says tomorrow and today by the reader's calendar day", () => {
    expect(dropLines(AVATAR, new Date("2026-11-15T20:00:00Z"), "America/New_York").age).toBe("tomorrow");
    expect(dropLines(AVATAR, new Date("2026-11-16T13:00:00Z"), "America/New_York").age).toBe("today");
  });
  it("marks the pre-queue open, with its line in the past tense", () => {
    expect(dropLines(AVATAR, new Date("2026-11-16T16:30:00Z"), "America/New_York")).toMatchObject({
      age: "pre-queue open", state: "queue", sale: "On sale Mon Nov 16, 12 p.m. your time", queue: "Pre-queue opened at 11 a.m.",
    });
  });
  it("says on sale since once the sale begins, and drops the pre-queue line", () => {
    expect(dropLines(AVATAR, new Date("2026-11-16T17:30:00Z"), "America/New_York")).toMatchObject({
      age: "on sale now", state: "live", sale: "On sale since 12 p.m. your time", queue: null,
    });
  });
});

describe("the store's zone (state 7)", () => {
  const store = { age: "in 6 days", sale: "On sale Mon Nov 16, 9 a.m. PT", queue: "Pre-queue opens at 8 a.m. PT", store: "US store" };
  it("is used with no known zone", () => {
    expect(dropLines(AVATAR, NOW, null)).toMatchObject(store);
  });
  it("is used for a Pacific reader, whose clock is the store's", () => {
    expect(dropLines(AVATAR, NOW, "America/Los_Angeles")).toMatchObject(store);
  });
});

describe("a reader whose day differs from the store's (state 7b)", () => {
  it("takes the store's weekday on the mono line", () => {
    expect(dropLines(AVATAR, new Date("2026-11-10T16:00:00Z"), "Asia/Tokyo")).toMatchObject({
      sale: "On sale Tue Nov 17, 2 a.m. your time", queue: "Pre-queue opens at 1 a.m.", store: "Mon 9 a.m. PT on the US store",
    });
  });
  it("names the pre-queue's weekday when it falls on another day than the sale", () => {
    const l = dropLines({ ...AVATAR, preQueueAt: "2026-11-16T14:30:00Z" }, NOW, "Asia/Tokyo");
    expect(l.queue).toBe("Pre-queue opens Mon at 11:30 p.m.");
  });
});

describe("a day with no hour (state 1)", () => {
  const DAY: DropSale = { date: "2026-11-23", at: null, preQueueAt: null, zone: null };
  it("says the time is to be announced, whatever the reader's zone", () => {
    for (const zone of [null, "America/New_York", "Asia/Tokyo"]) {
      expect(dropLines(DAY, NOW, zone)).toEqual({ age: "in 13 days", state: "ahead", sale: "On sale Mon Nov 23, time to be announced", queue: null, store: "US store" });
    }
  });
  it("is today on its own day in the store's zone", () => {
    expect(dropLines(DAY, new Date("2026-11-23T20:00:00Z"), "America/New_York").age).toBe("today");
  });
});

describe("a zone the post names that has no label", () => {
  it("shows the zone's own name rather than a wrong one", () => {
    const l = dropLines({ ...AVATAR, zone: "Europe/London", at: "2026-11-16T17:00:00Z" }, NOW, null);
    expect(l.sale).toBe("On sale Mon Nov 16, 5 p.m. Europe/London");
  });
});

describe("whether the row still speaks of the sale", () => {
  it("holds a timed drop until an hour after its sale", () => {
    expect(saleAhead(AVATAR, new Date("2026-11-16T17:59:00Z"))).toBe(true);
    expect(saleAhead(AVATAR, new Date("2026-11-16T18:00:00Z"))).toBe(false);
  });
  it("holds a day-only drop through its day in the store's zone", () => {
    const day: DropSale = { date: "2026-11-23", at: null, preQueueAt: null, zone: null };
    expect(saleAhead(day, new Date("2026-11-24T07:59:00Z"))).toBe(true);
    expect(saleAhead(day, new Date("2026-11-24T08:00:00Z"))).toBe(false);
  });
});
