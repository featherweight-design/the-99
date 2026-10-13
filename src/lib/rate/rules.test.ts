import { describe, expect, it } from "vitest";
import { overLimit, RATE_RULES, windowStart } from "./rules";
import { rateLimitEnabled } from "./flag";

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

describe("the request counting switch", () => {
  it("is on only for the exact string 'true'", () => {
    for (const v of [undefined, "", "false", "TRUE", "1", " true", "off"]) {
      expect(rateLimitEnabled({ RATE_LIMIT_ENABLED: v } as unknown as NodeJS.ProcessEnv)).toBe(false);
    }
    expect(rateLimitEnabled({ RATE_LIMIT_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });
});
