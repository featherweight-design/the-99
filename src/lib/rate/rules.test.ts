import { describe, expect, it } from "vitest";
import { overLimit, RATE_RULES, reachesHalf, retryAfterSec, windowStart } from "./rules";

describe("windowStart", () => {
  it("floors a time to its window", () => {
    expect(windowStart(new Date("2026-10-13T12:00:59.999Z"), 60_000).toISOString()).toBe("2026-10-13T12:00:00.000Z");
    expect(windowStart(new Date("2026-10-13T12:01:00.000Z"), 60_000).toISOString()).toBe("2026-10-13T12:01:00.000Z");
  });
});

describe("overLimit", () => {
  it("refuses the hit AFTER the limit, not the limit itself", () => {
    const rule = { limit: 3, windowMs: 1000 };
    expect([1, 2, 3, 4].map((n) => overLimit(n, rule))).toEqual([false, false, false, true]);
  });
});

describe("RATE_RULES", () => {
  it("leaves room for the app's own background fetches", () => {
    // /collection pulls ~15 batches of 200 for a 3,000-card collection; a limit under that would refuse the app to itself.
    expect(RATE_RULES["draw-fields"].limit).toBeGreaterThanOrEqual(60);
  });
});

describe("the enforced caps", () => {
  it("caps a signed-out report at 10 an hour and 30 a UTC day per network", () => {
    expect(RATE_RULES["report-anon"]).toEqual({ limit: 10, windowMs: 3_600_000 });
    expect(RATE_RULES["report-anon-day"]).toEqual({ limit: 30, windowMs: 86_400_000 });
    expect(RATE_RULES["report-anon-all"]).toEqual({ limit: 30, windowMs: 3_600_000 });
    expect(RATE_RULES["report-anon-all-day"]).toEqual({ limit: 100, windowMs: 86_400_000 });
    expect(RATE_RULES["launch-list-all"]).toEqual({ limit: 60, windowMs: 3_600_000 });
    expect(RATE_RULES["launch-list-all-day"]).toEqual({ limit: 300, windowMs: 86_400_000 });
    // Friend links R1 (Hugh: assume abuse): code tries 10 an hour and 30 a day, requests 20 a day, resets 5 a day.
    expect(RATE_RULES["friend-code"]).toEqual({ limit: 10, windowMs: 3_600_000 });
    expect(RATE_RULES["friend-code-day"]).toEqual({ limit: 30, windowMs: 86_400_000 });
    expect(RATE_RULES["friend-request-day"]).toEqual({ limit: 20, windowMs: 86_400_000 });
    expect(RATE_RULES["friend-reset-day"]).toEqual({ limit: 5, windowMs: 86_400_000 });
  });
});

describe("retryAfterSec", () => {
  it("is the whole seconds left in the window, at least 1", () => {
    const rule = { limit: 1, windowMs: 60_000 };
    expect(retryAfterSec(new Date("2026-10-13T12:00:45.200Z"), rule)).toBe(15);
    expect(retryAfterSec(new Date("2026-10-13T12:00:00.000Z"), rule)).toBe(60);
    expect(retryAfterSec(new Date("2026-10-13T12:00:59.999Z"), rule)).toBe(1);
  });
});

describe("reachesHalf", () => {
  it("is true for exactly one hit a window, rounding an odd limit up", () => {
    expect([59, 60, 61].map((n) => reachesHalf(n, { limit: 120, windowMs: 1 }))).toEqual([false, true, false]);
    expect(reachesHalf(8, { limit: 15, windowMs: 1 })).toBe(true);
  });
});
