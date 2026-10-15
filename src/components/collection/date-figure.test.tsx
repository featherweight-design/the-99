import { describe, expect, it } from "vitest";
import { dateSpoken, readCardDate } from "./date-figure";

const NOW = Date.UTC(2026, 9, 15);

describe("readCardDate", () => {
  it("draws an exact day without a year inside the current UTC year", () => {
    expect(readCardDate({ added: Date.UTC(2026, 9, 12, 15) / 60_000 }, NOW)).toEqual({
      text: "Oct 12",
      spoken: "added Oct 12",
    });
  });
  it("adds the year for a day in an earlier year, exact or since", () => {
    expect(readCardDate({ added: Date.UTC(2025, 11, 31, 12) / 60_000 }, NOW)?.text).toBe("Dec 31, 2025");
    expect(readCardDate({ since: Date.UTC(2025, 8, 2) / 86_400_000 }, NOW)).toEqual({
      text: "since Sep 2, 2025",
      spoken: "in your collection since Sep 2, 2025",
    });
  });
  it("prefers the exact date and is silent with neither", () => {
    expect(readCardDate({ added: Date.UTC(2026, 0, 5) / 60_000, since: 1 }, NOW)?.text).toBe("Jan 5");
    expect(readCardDate({}, NOW)).toBeNull();
    expect(dateSpoken({})).toBeNull();
  });
});
