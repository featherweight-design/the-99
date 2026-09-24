import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));

import { RESERVATION_TTL_MS } from "../model/allowance-rule";
import { SYNOPSIS_REAPER_CUTOFF_MS } from "./limits";
import { reapCutoff } from "./reaper";

describe("reapCutoff", () => {
  it("reaps a run abandoned for the cutoff, while its unit is still reserved and refundable", () => {
    const now = new Date("2026-09-24T12:00:00Z");
    expect(now.getTime() - reapCutoff(now).getTime()).toBe(SYNOPSIS_REAPER_CUTOFF_MS);
    expect(SYNOPSIS_REAPER_CUTOFF_MS).toBeLessThan(RESERVATION_TTL_MS);
  });
});
