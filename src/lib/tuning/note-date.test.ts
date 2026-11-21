import { describe, expect, it } from "vitest";

import { currentYear, mentionsDate, noteDate } from "./note-date";

describe("noteDate", () => {
  it("draws the game log's locator, without the current year", () => {
    expect(noteDate("2026-08-26T20:00:00.000Z", 2026)).toBe("Aug 26");
  });

  it("names the year when it is not the current one", () => {
    expect(noteDate("2025-12-31T20:00:00.000Z", 2026)).toBe("Dec 31, 2025");
  });

  it("names the day in the reader's zone: a game logged at 8pm in Denver is that day, not the next UTC one", () => {
    // 2026-08-27T02:00Z is 8pm on Aug 26 in Denver (MDT, UTC-6).
    expect(noteDate("2026-08-27T02:00:00.000Z", 2026, "America/Denver")).toBe("Aug 26");
    expect(noteDate("2026-08-27T02:00:00.000Z", 2026, null)).toBe("Aug 27");
  });

  it("judges the year in the zone too, so New Year's Eve in Denver is still the old year", () => {
    expect(noteDate("2027-01-01T03:00:00.000Z", 2026, "America/Denver")).toBe("Dec 31");
  });
});

describe("currentYear", () => {
  it("is the clock's UTC year with no zone, as the log row judges against the current year", () => {
    expect(currentYear(new Date("2026-01-02T20:00:00.000Z"))).toBe(2026);
  });

  it("is the reader's year when a zone is given", () => {
    const newYearUtc = new Date("2027-01-01T03:00:00.000Z");
    expect(currentYear(newYearUtc)).toBe(2027);
    expect(currentYear(newYearUtc, "America/Denver")).toBe(2026);
  });
});

describe("mentionsDate", () => {
  it("finds a date whole, never inside another day or another year", () => {
    expect(mentionsDate("Your note from Sep 6 reads", "Sep 6")).toBe(true);
    expect(mentionsDate("Your note from Sep 16 reads", "Sep 6")).toBe(false);
    expect(mentionsDate("Your note from Aug 6, 2025 reads", "Aug 6")).toBe(false);
    expect(mentionsDate("Your note from Aug 6, 2025 reads", "Aug 6, 2025")).toBe(true);
    expect(mentionsDate("Your note from Aug 6 2025 reads", "Aug 6")).toBe(false);
    expect(mentionsDate("Your note from Aug 6, reads", "Aug 6")).toBe(true);
  });
});
