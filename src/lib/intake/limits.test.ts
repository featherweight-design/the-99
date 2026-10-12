import { describe, expect, it } from "vitest";

import { INTAKE_REAPER_CUTOFF_MS, INTAKE_RETRY_FLOOR_MS } from "./limits";

/**
 * The choose page's `maxDuration`, which bounds the Server Action. Stated here because the page
 * arrives in PR 5 and a segment config must be a literal Next can read statically; PR 5's page test
 * pins its literal to this same figure.
 */
const PAGE_MAX_DURATION_MS = 120_000;

describe("the read's limits", () => {
  it("leaves a retry room to start inside the page's maxDuration", () => {
    expect(INTAKE_RETRY_FLOOR_MS).toBeLessThan(PAGE_MAX_DURATION_MS - 10_000);
  });
  it("never reaps a read that could still be live", () => {
    expect(INTAKE_REAPER_CUTOFF_MS).toBeGreaterThan(PAGE_MAX_DURATION_MS);
  });
});
