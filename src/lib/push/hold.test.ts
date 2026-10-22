import { describe, expect, it } from "vitest";

import { isHeld, judgedZone, releaseAt, validTimeZone } from "./hold";

const at = (iso: string) => new Date(iso);

describe("the overnight hold", () => {
  it("holds from 21:00 up to, not including, 09:00 in the device's zone", () => {
    // New York is UTC-4 in October.
    expect(isHeld(at("2026-10-22T00:59:00Z"), "America/New_York")).toBe(false); // 20:59
    expect(isHeld(at("2026-10-22T01:00:00Z"), "America/New_York")).toBe(true); // 21:00
    expect(isHeld(at("2026-10-22T12:59:00Z"), "America/New_York")).toBe(true); // 08:59
    expect(isHeld(at("2026-10-22T13:00:00Z"), "America/New_York")).toBe(false); // 09:00
  });

  it("judges the same instant differently in two zones", () => {
    const now = at("2026-10-22T20:00:00Z");
    expect(isHeld(now, "America/New_York")).toBe(false); // 16:00
    expect(isHeld(now, "Asia/Tokyo")).toBe(true); // 05:00 next day
  });

  it("releases at the next 09:00 local, tomorrow from 21:00 and today before 09:00", () => {
    expect(releaseAt(at("2026-10-22T01:30:00Z"), "America/New_York")?.toISOString()).toBe("2026-10-22T13:00:00.000Z");
    expect(releaseAt(at("2026-10-22T10:00:00Z"), "America/New_York")?.toISOString()).toBe("2026-10-22T13:00:00.000Z");
    expect(releaseAt(at("2026-10-22T20:00:00Z"), "Asia/Tokyo")?.toISOString()).toBe("2026-10-23T00:00:00.000Z");
  });

  it("is null outside the held hours", () => {
    expect(releaseAt(at("2026-10-22T15:00:00Z"), "America/New_York")).toBeNull();
  });

  it("releases at 09:00 local across a DST change", () => {
    // US clocks go back on 2026-11-01: 09:00 that morning is UTC-5, the night before it was UTC-4.
    expect(releaseAt(at("2026-11-01T03:00:00Z"), "America/New_York")?.toISOString()).toBe("2026-11-01T14:00:00.000Z");
    expect(releaseAt(at("2026-11-01T02:00:00Z"), "America/New_York")?.toISOString()).toBe("2026-11-01T14:00:00.000Z");
    // And forward on 2026-03-08: the night of the 7th holds until 09:00 EDT (13:00Z).
    expect(releaseAt(at("2026-03-08T05:00:00Z"), "America/New_York")?.toISOString()).toBe("2026-03-08T13:00:00.000Z");
  });

  it("judges an unknown zone as UTC rather than refusing", () => {
    expect(validTimeZone("Not/AZone")).toBe(false);
    expect(validTimeZone("")).toBe(false);
    expect(judgedZone("Not/AZone")).toBe("UTC");
    expect(isHeld(at("2026-10-22T22:00:00Z"), "Not/AZone")).toBe(true);
    expect(isHeld(at("2026-10-22T12:00:00Z"), "Not/AZone")).toBe(false);
  });
});
