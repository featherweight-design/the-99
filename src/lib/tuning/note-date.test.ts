import { describe, expect, it } from "vitest";

import { currentYear, mentionsDate, noteDate } from "./note-date";

describe("noteDate", () => {
  it("draws the game log's locator, without the current year", () => {
    expect(noteDate("2026-08-26T20:00:00.000Z", 2026)).toBe("Aug 26");
  });

  it("names the year when it is not the current one", () => {
    expect(noteDate("2025-12-31T20:00:00.000Z", 2026)).toBe("Dec 31, 2025");
  });
});

describe("currentYear", () => {
  it("is the clock's UTC year, as the log row judges against the current year", () => {
    expect(currentYear(new Date("2026-01-02T20:00:00.000Z"))).toBe(2026);
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
