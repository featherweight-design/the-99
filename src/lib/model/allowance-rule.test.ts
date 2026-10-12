import { describe, expect, it } from "vitest";

import {
  ALLOWANCE_WINDOW_MS,
  MODEL_FRIEND_DAILY_ALLOWANCE,
  MODEL_OWNER_DAILY_ALLOWANCE,
  RESERVATION_TTL_MS,
  allowanceFrom,
  counts,
  ownerDailyAllowanceFrom,
} from "./allowance-rule";

const now = new Date("2026-09-23T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

describe("allowanceFrom", () => {
  const spent = (createdAt: Date) => ({ status: "spent" as const, createdAt });
  const reserved = (createdAt: Date) => ({ status: "reserved" as const, createdAt });
  const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);

  it("counts only calls inside the rolling window", () => {
    expect(allowanceFrom([spent(hoursAgo(1)), spent(hoursAgo(23.9)), spent(hoursAgo(25))], now).used).toBe(2);
  });

  it("drops a call exactly one window old", () => {
    expect(allowanceFrom([spent(new Date(now.getTime() - ALLOWANCE_WINDOW_MS))], now).used).toBe(0);
  });

  it("does not count a refunded unit", () => {
    expect(allowanceFrom([{ status: "refunded", createdAt: hoursAgo(1) }], now).used).toBe(0);
  });

  it("names no reopening time while units remain", () => {
    const rows = Array.from({ length: MODEL_FRIEND_DAILY_ALLOWANCE - 1 }, (_, i) => spent(hoursAgo(i + 1)));
    expect(allowanceFrom(rows, now)).toEqual({
      used: MODEL_FRIEND_DAILY_ALLOWANCE - 1,
      limit: MODEL_FRIEND_DAILY_ALLOWANCE,
      reopensAt: null,
      // The credit line names the next one while credits remain: the oldest unit's expiry.
      nextAt: new Date(hoursAgo(MODEL_FRIEND_DAILY_ALLOWANCE - 1).getTime() + ALLOWANCE_WINDOW_MS),
    });
  });

  it("names no next time when nothing counts", () => {
    expect(allowanceFrom([{ status: "refunded", createdAt: hoursAgo(1) }], now).nextAt).toBeNull();
  });

  it("names a reservation's TTL as the next time when it expires first", () => {
    const a = allowanceFrom([spent(hoursAgo(1)), reserved(minutesAgo(2))], now);
    expect(a.nextAt).toEqual(new Date(minutesAgo(2).getTime() + RESERVATION_TTL_MS));
  });

  it("reopens when the oldest counted call leaves the window", () => {
    // Given out of order on purpose: the reopening time is the OLDEST, not the first listed.
    const rows = Array.from({ length: MODEL_FRIEND_DAILY_ALLOWANCE }, (_, i) => spent(hoursAgo(20 - i))).reverse();
    const a = allowanceFrom(rows, now);
    expect(a.used).toBe(MODEL_FRIEND_DAILY_ALLOWANCE);
    expect(a.reopensAt).toEqual(new Date(hoursAgo(20).getTime() + ALLOWANCE_WINDOW_MS));
  });

  it("over the limit, waits for enough units to leave that one is free", () => {
    // Limit 2, three counted (a concurrent reserve landed): one leaving is not enough.
    const a = allowanceFrom([spent(hoursAgo(20)), spent(hoursAgo(10)), spent(hoursAgo(5))], now, 2);
    expect(a.reopensAt).toEqual(new Date(hoursAgo(10).getTime() + ALLOWANCE_WINDOW_MS));
  });

  it("names no reopening time, and no invalid one, when the limit is zero and nothing counts", () => {
    expect(allowanceFrom([], now, 0)).toEqual({ used: 0, limit: 0, reopensAt: null, nextAt: null });
  });

  it("reopens when a reservation's TTL runs out, not a day later", () => {
    // Full because one run is in flight: its unit frees at the reservation TTL at the latest.
    const a = allowanceFrom([spent(hoursAgo(20)), reserved(minutesAgo(2))], now, 2);
    expect(a.reopensAt).toEqual(new Date(minutesAgo(2).getTime() + RESERVATION_TTL_MS));
  });

  it("picks the earliest expiry across spent and reserved units", () => {
    // The spent unit leaves the window a minute from now, before the reservation's TTL.
    const a = allowanceFrom([spent(new Date(now.getTime() - ALLOWANCE_WINDOW_MS + 60_000)), reserved(minutesAgo(1))], now, 2);
    expect(a.reopensAt).toEqual(new Date(now.getTime() + 60_000));
  });
});

describe("counts", () => {
  const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);

  it("counts a spent unit for the whole window, and not after", () => {
    expect(counts({ status: "spent", createdAt: hoursAgo(23) }, now)).toBe(true);
    expect(counts({ status: "spent", createdAt: hoursAgo(24) }, now)).toBe(false);
  });

  it("never counts a refunded unit", () => {
    expect(counts({ status: "refunded", createdAt: minutesAgo(1) }, now)).toBe(false);
  });

  it("counts a reservation while a run could still be in flight", () => {
    expect(counts({ status: "reserved", createdAt: minutesAgo(1) }, now)).toBe(true);
  });

  it("stops counting a reservation nothing can still be running under", () => {
    // A deck deleted mid-run cascades its run away, and nothing is left to settle the unit.
    expect(counts({ status: "reserved", createdAt: new Date(now.getTime() - RESERVATION_TTL_MS) }, now)).toBe(false);
  });
});

describe("ownerDailyAllowanceFrom", () => {
  it("falls back to the owner's ten when unset or blank", () => {
    expect(ownerDailyAllowanceFrom(undefined)).toBe(MODEL_OWNER_DAILY_ALLOWANCE);
    expect(ownerDailyAllowanceFrom("")).toBe(MODEL_OWNER_DAILY_ALLOWANCE);
    expect(ownerDailyAllowanceFrom("   ")).toBe(MODEL_OWNER_DAILY_ALLOWANCE);
  });

  it("takes a positive whole number, trimmed", () => {
    expect(ownerDailyAllowanceFrom("100")).toBe(100);
    expect(ownerDailyAllowanceFrom(" 25 ")).toBe(25);
    expect(ownerDailyAllowanceFrom("1")).toBe(1);
  });

  it("falls back on anything else", () => {
    for (const raw of ["0", "-5", "2.5", "1e3", "abc", "10abc", "0x10", "Infinity", "NaN", "99999999999999999999"]) {
      expect(ownerDailyAllowanceFrom(raw), raw).toBe(MODEL_OWNER_DAILY_ALLOWANCE);
    }
  });
});
