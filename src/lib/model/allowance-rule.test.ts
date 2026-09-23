import { describe, expect, it } from "vitest";

import { ALLOWANCE_WINDOW_MS, MODEL_DAILY_ALLOWANCE, allowanceFrom } from "./allowance-rule";

const now = new Date("2026-09-23T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

describe("allowanceFrom", () => {
  it("counts only calls inside the rolling window", () => {
    expect(allowanceFrom([hoursAgo(1), hoursAgo(23.9), hoursAgo(25)], now).used).toBe(2);
  });

  it("drops a call exactly one window old", () => {
    expect(allowanceFrom([new Date(now.getTime() - ALLOWANCE_WINDOW_MS)], now).used).toBe(0);
  });

  it("names no reopening time while units remain", () => {
    const times = Array.from({ length: MODEL_DAILY_ALLOWANCE - 1 }, (_, i) => hoursAgo(i + 1));
    expect(allowanceFrom(times, now)).toEqual({ used: MODEL_DAILY_ALLOWANCE - 1, limit: MODEL_DAILY_ALLOWANCE, reopensAt: null });
  });

  it("reopens when the oldest counted call leaves the window", () => {
    // Given out of order on purpose: the reopening time is the OLDEST, not the first listed.
    const times = Array.from({ length: MODEL_DAILY_ALLOWANCE }, (_, i) => hoursAgo(20 - i)).reverse();
    const a = allowanceFrom(times, now);
    expect(a.used).toBe(MODEL_DAILY_ALLOWANCE);
    expect(a.reopensAt).toEqual(new Date(hoursAgo(20).getTime() + ALLOWANCE_WINDOW_MS));
  });

  it("over the limit, waits for enough units to leave that one is free", () => {
    // Limit 2, three counted (a concurrent reserve landed): one leaving is not enough.
    const a = allowanceFrom([hoursAgo(20), hoursAgo(10), hoursAgo(5)], now, 2);
    expect(a.reopensAt).toEqual(new Date(hoursAgo(10).getTime() + ALLOWANCE_WINDOW_MS));
  });
});
