import { describe, expect, it } from "vitest";
import { formatWhen } from "./when";

const now = new Date("2026-09-07T12:00:00Z");
const daysBefore = (n: number) => new Date(now.getTime() - n * 86_400_000);

describe("formatWhen", () => {
  it("names the day for the first two days", () => {
    expect(formatWhen(daysBefore(0), now)).toBe("today");
    expect(formatWhen(daysBefore(1), now)).toBe("yesterday");
  });

  it("counts days up to the end of the first week", () => {
    expect(formatWhen(daysBefore(2), now)).toBe("2 days ago");
    expect(formatWhen(daysBefore(6), now)).toBe("6 days ago");
  });

  it("says last week rather than 7 days ago", () => {
    expect(formatWhen(daysBefore(7), now)).toBe("last week");
    expect(formatWhen(daysBefore(13), now)).toBe("last week");
  });

  it("counts whole weeks up to two months", () => {
    expect(formatWhen(daysBefore(21), now)).toBe("3 weeks ago");
    expect(formatWhen(daysBefore(56), now)).toBe("8 weeks ago");
  });

  it("counts months beyond that, and years beyond a year", () => {
    expect(formatWhen(daysBefore(70), now)).toBe("2 months ago");
    expect(formatWhen(daysBefore(300), now)).toBe("9 months ago");
    expect(formatWhen(daysBefore(400), now)).toBe("last year");
    expect(formatWhen(daysBefore(900), now)).toBe("2 years ago");
  });

  it("reads a future timestamp as today rather than as a negative count", () => {
    // Clock skew between the database and the renderer is real and small. It
    // must not print "-1 days ago".
    expect(formatWhen(new Date(now.getTime() + 60_000), now)).toBe("today");
  });
});
