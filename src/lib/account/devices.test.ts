// Settings' Devices rows: only active sessions, this device first then the most recent, Clerk's names said as a reader
// says them, and the "last active" wording in whole units.
import { describe, expect, it } from "vitest";
import { ACTIVE_NOW_MS, deviceAgo, deviceRows, type SessionLike } from "./devices";
import { accountCopy } from "../copy/account";

const NOW = Date.parse("2026-11-14T12:00:00Z");
const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const s = (id: string, agoMs: number, a: SessionLike["latestActivity"] = {}, status = "active"): SessionLike => ({
  id, status, lastActiveAt: new Date(NOW - agoMs), latestActivity: a,
});

describe("deviceAgo", () => {
  it("reads active now inside five minutes", () => {
    expect(deviceAgo(NOW, NOW)).toBeNull();
    expect(deviceAgo(NOW, NOW - ACTIVE_NOW_MS + 1)).toBeNull();
  });

  it("names whole units, singular at one", () => {
    expect(deviceAgo(NOW, NOW - 5 * MIN)).toBe("5 minutes ago");
    expect(deviceAgo(NOW, NOW - 61 * MIN)).toBe("1 hour ago");
    expect(deviceAgo(NOW, NOW - 2 * DAY)).toBe("2 days ago");
    expect(deviceAgo(NOW, NOW - 21 * DAY)).toBe("3 weeks ago");
    expect(deviceAgo(NOW, NOW - 60 * DAY)).toBe("2 months ago");
    expect(deviceAgo(NOW, NOW - 400 * DAY)).toBe("1 year ago");
  });
});

describe("deviceRows", () => {
  it("draws this device first, then the most recently active, and leaves out sessions that ended", () => {
    const rows = deviceRows(
      [
        s("sess_old", 21 * DAY, { browserName: "Safari", deviceType: "iPad", isMobile: true, city: "Sacramento", country: "US" }),
        s("sess_ended", 1 * DAY, { browserName: "Firefox" }, "ended"),
        s("sess_mac", 2 * DAY, { browserName: "Chrome", deviceType: "Macintosh", city: "Oakland", country: "US" }),
        s("sess_this", 10 * MIN, { browserName: "Safari", deviceType: "iPhone", isMobile: true, city: "Oakland", country: "US" }),
      ],
      "sess_this",
      NOW,
    );
    expect(rows).toEqual([
      { id: "sess_this", browser: "Safari", device: "iPhone", kind: "phone", place: "Oakland, US", ago: null, current: true },
      { id: "sess_mac", browser: "Chrome", device: "Mac", kind: "desktop", place: "Oakland, US", ago: "2 days ago", current: false },
      { id: "sess_old", browser: "Safari", device: "iPad", kind: "tablet", place: "Sacramento, US", ago: "3 weeks ago", current: false },
    ]);
  });

  it("falls back when Clerk names no browser, device or place", () => {
    const [phone, computer] = deviceRows([s("a", 1 * DAY, { isMobile: true }), s("b", 2 * DAY, null)], null, NOW);
    expect(phone).toMatchObject({ browser: "Browser", device: accountCopy.devices.unknownPhone, kind: "phone", place: null });
    expect(computer).toMatchObject({ browser: "Browser", device: accountCopy.devices.unknownComputer, kind: "desktop", place: null });
  });

  it("names the country alone when Clerk has no city", () => {
    expect(deviceRows([s("a", DAY, { browserName: "Edge", country: "CA" })], null, NOW)[0].place).toBe("CA");
  });
});
