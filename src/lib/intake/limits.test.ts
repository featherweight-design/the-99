import { describe, expect, it } from "vitest";

import { INTAKE_DEADLINE_MS, INTAKE_REAPER_CUTOFF_MS, INTAKE_RETRY_FLOOR_MS } from "./limits";

/** The choose page's `maxDuration` (PR 5), which bounds the Server Action. */
const PAGE_MAX_DURATION_MS = 120_000;

describe("the deeper read's limits", () => {
  it("fits the call under the page's maxDuration with room to reserve and settle", () => {
    expect(INTAKE_DEADLINE_MS).toBeLessThanOrEqual(PAGE_MAX_DURATION_MS - 10_000);
  });
  it("leaves a retry room to start inside the deadline", () => {
    expect(INTAKE_RETRY_FLOOR_MS).toBeLessThan(INTAKE_DEADLINE_MS);
  });
  it("never reaps a read that could still be live", () => {
    expect(INTAKE_REAPER_CUTOFF_MS).toBeGreaterThan(PAGE_MAX_DURATION_MS);
  });
});
