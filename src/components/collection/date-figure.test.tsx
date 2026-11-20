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
    expect(readCardDate({ added: Date.UTC(2025, 11, 31, 12) / 60_000 }, NOW)).toEqual({
      text: "Dec 31 \u201925",
      spoken: "added Dec 31, 2025",
    });
    expect(readCardDate({ since: Date.UTC(2025, 8, 2) / 86_400_000 }, NOW)).toEqual({
      text: "since Sep 2 \u201925",
      spoken: "in your collection since Sep 2, 2025",
    });
  });
  it("prefers the exact date and is silent with neither", () => {
    expect(readCardDate({ added: Date.UTC(2026, 0, 5) / 60_000, since: 1 }, NOW)?.text).toBe("Jan 5");
    expect(readCardDate({}, NOW)).toBeNull();
    expect(dateSpoken({})).toBeNull();
  });
});

describe("readCardDate in the reader's zone", () => {
  it("reads an exact day on the reader's calendar, and a since day as UTC", () => {
    const added = Date.UTC(2026, 9, 12, 3) / 60_000; // Oct 11 evening in Denver
    expect(readCardDate({ added }, NOW, "America/Denver")?.text).toBe("Oct 11");
    expect(readCardDate({ added }, NOW, null)?.text).toBe("Oct 12");
    expect(readCardDate({ since: Date.UTC(2026, 8, 2) / 86_400_000 }, NOW, "America/Denver")?.text).toBe("since Sep 2");
  });
});
