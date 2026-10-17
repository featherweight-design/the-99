import { describe, expect, it } from "vitest";
import { closesWhen } from "./when";

describe("closesWhen", () => {
  const now = new Date("2026-10-16T21:40:00Z");

  it("names tomorrow when the table closes on the next calendar day in the zone", () => {
    expect(closesWhen(new Date("2026-10-17T21:40:00Z"), now, "UTC")).toBe("9:40 pm tomorrow");
  });

  it("is the time alone when the table closes today", () => {
    expect(closesWhen(new Date("2026-10-16T23:05:00Z"), now, "UTC")).toBe("11:05 pm");
  });

  it("decides the day in the reader's zone, not the server's", () => {
    // 03:40 UTC on the 17th is 9:40 pm on the 16th in Denver, the same day as 23:00 UTC on the 16th there; in UTC
    // the two straddle midnight, so a day decided in UTC would say tomorrow.
    const now = new Date("2026-10-16T23:00:00Z");
    const closes = new Date("2026-10-17T03:40:00Z");
    expect(closesWhen(closes, now, "America/Denver")).toBe("9:40 pm");
    expect(closesWhen(closes, now, "UTC")).toBe("3:40 am tomorrow");
  });
});
