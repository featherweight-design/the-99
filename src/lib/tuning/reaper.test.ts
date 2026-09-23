import { describe, expect, it } from "vitest";

import { RESERVATION_TTL_MS } from "../model/allowance-rule";
import { MODEL_TIMEOUT_MS, REAPER_CUTOFF_MS } from "./limits";
import { reapCutoff } from "./reaper";

describe("reapCutoff", () => {
  it("cuts off exactly one window back", () => {
    const now = new Date("2026-09-07T12:00:00Z");
    expect(reapCutoff(now).getTime()).toBe(now.getTime() - REAPER_CUTOFF_MS);
  });

  // The three windows have to nest, or a live run is reaped, or a reaped run's unit is still
  // counted after the reaper said it failed.
  it("reaps only runs that outlived their deadline, and before the allowance stops counting them", () => {
    expect(REAPER_CUTOFF_MS).toBeGreaterThan(MODEL_TIMEOUT_MS);
    expect(REAPER_CUTOFF_MS).toBeLessThan(RESERVATION_TTL_MS);
  });
});
