import { describe, expect, it } from "vitest";

import { currentYear, mentionsDate, noteDate } from "./note-date";

describe("noteDate", () => {
  it("draws the game log's locator, without the current year", () => {
    expect(noteDate("2026-08-26T20:00:00.000Z", 2026)).toBe("26 Aug");
  });

  it("names the year when it is not the current one", () => {
    expect(noteDate("2025-12-31T20:00:00.000Z", 2026)).toBe("31 Dec 2025");
  });
});

describe("currentYear", () => {
  it("is the clock's UTC year, as the log row judges against the current year", () => {
    expect(currentYear(new Date("2026-01-02T20:00:00.000Z"))).toBe(2026);
  });
});

describe("mentionsDate", () => {
  it("finds a date whole, never inside another day or another year", () => {
    expect(mentionsDate("Your note from 6 Sep reads", "6 Sep")).toBe(true);
    expect(mentionsDate("Your note from 16 Sep reads", "6 Sep")).toBe(false);
    expect(mentionsDate("Your note from 6 Aug 2025 reads", "6 Aug")).toBe(false);
    expect(mentionsDate("Your note from 6 Aug 2025 reads", "6 Aug 2025")).toBe(true);
  });
});
