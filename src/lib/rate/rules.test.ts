import { describe, expect, it } from "vitest";
import { overLimit, RATE_RULES, windowStart } from "./rules";

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
  });
});
