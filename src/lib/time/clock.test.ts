import { describe, expect, it } from "vitest";

import { clockWords, dateWords, dayKey, dayWords, daysBetween, weekdayWords, zoneLabel } from "./clock";

const SALE = new Date("2026-11-16T17:00:00Z");

describe("clock and day words", () => {
  it("drops the minutes of a whole hour and keeps a half hour's", () => {
    expect(clockWords(SALE, "America/Los_Angeles")).toBe("9 a.m.");
    expect(clockWords(new Date("2026-11-16T21:30:00Z"), "America/New_York")).toBe("4:30 p.m.");
    expect(clockWords(new Date("2026-11-16T08:00:00Z"), "UTC")).toBe("8 a.m.");
  });
  it("names the day in the zone, so one instant is two days", () => {
    expect(dayWords(SALE, "America/Los_Angeles")).toBe("Mon Nov 16");
    expect(dayWords(SALE, "Asia/Tokyo")).toBe("Tue Nov 17");
    expect(weekdayWords(SALE, "Asia/Tokyo")).toBe("Tue");
  });
  it("names a calendar date without shifting it", () => {
    expect(dateWords("2026-11-23")).toBe("Mon Nov 23");
  });
  it("counts calendar days, across a clock change", () => {
    expect(dayKey(SALE, "America/New_York")).toBe("2026-11-16");
    expect(daysBetween(new Date("2026-11-01T05:30:00Z"), new Date("2026-11-03T20:00:00Z"), "America/New_York")).toBe(2);
  });
  it("labels the US zones and leaves any other as it is", () => {
    expect(zoneLabel("America/Los_Angeles")).toBe("PT");
    expect(zoneLabel("Europe/London")).toBe("Europe/London");
  });
});
