import { describe, expect, it } from "vitest";
import { isCalendarDay, parseLaunchDateInput, utcDay } from "./launch-date-rule";

const now = new Date("2026-10-31T23:30:00Z");

describe("parseLaunchDateInput", () => {
  it("reads a blank (or whitespace) as a clear", () => {
    expect(parseLaunchDateInput("", now)).toEqual({ kind: "clear" });
    expect(parseLaunchDateInput("  ", now)).toEqual({ kind: "clear" });
  });
  it("accepts today (UTC) and any later day", () => {
    expect(parseLaunchDateInput("2026-10-31", now)).toEqual({ kind: "set", day: "2026-10-31" });
    expect(parseLaunchDateInput("2026-11-20", now)).toEqual({ kind: "set", day: "2026-11-20" });
  });
  it("refuses a past day, comparing with today's UTC day", () => {
    expect(parseLaunchDateInput("2026-10-30", now)).toEqual({ kind: "refused", reason: "past" });
    expect(utcDay(new Date("2026-11-01T00:00:00Z"))).toBe("2026-11-01");
    expect(parseLaunchDateInput("2026-10-31", new Date("2026-11-01T00:00:00Z"))).toEqual({ kind: "refused", reason: "past" });
  });
  it("refuses a malformed value or an impossible day, and a non-string", () => {
    for (const v of ["soon", "11/20/2026", "2026-11", "2026-13-01", "2026-02-30", "2026-11-20T00:00:00Z", "20261120"]) {
      expect(parseLaunchDateInput(v, now), v).toEqual({ kind: "refused", reason: "invalid" });
    }
    expect(parseLaunchDateInput(null, now)).toEqual({ kind: "refused", reason: "invalid" });
    expect(parseLaunchDateInput(20261120, now)).toEqual({ kind: "refused", reason: "invalid" });
  });
});

describe("isCalendarDay", () => {
  it("does not roll a day over", () => {
    expect(isCalendarDay("2028-02-29")).toBe(true);
    expect(isCalendarDay("2027-02-29")).toBe(false);
  });
});
