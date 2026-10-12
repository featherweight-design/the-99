import { describe, expect, it, vi } from "vitest";

import { heldStubOutcome, TUNING_STUB_MAX_MS, tuningStubDelayMs } from "./stub";

describe("the tuning stub", () => {
  it("is off unless a delay is set, and never in a production build", () => {
    expect(tuningStubDelayMs({})).toBeNull();
    expect(tuningStubDelayMs({ TUNING_STUB_DELAY_MS: "0" })).toBeNull();
    expect(tuningStubDelayMs({ TUNING_STUB_DELAY_MS: "abc" })).toBeNull();
    expect(tuningStubDelayMs({ TUNING_STUB_DELAY_MS: "5000", NODE_ENV: "production" })).toBeNull();
    expect(tuningStubDelayMs({ TUNING_STUB_DELAY_MS: "5000", NODE_ENV: "development" })).toBe(5000);
  });

  it("caps the hold", () => {
    expect(tuningStubDelayMs({ TUNING_STUB_DELAY_MS: "9999999" })).toBe(TUNING_STUB_MAX_MS);
  });

  it("holds, then fails busy; answers null when off", async () => {
    expect(await heldStubOutcome({})).toBeNull();
    vi.useFakeTimers();
    const held = heldStubOutcome({ TUNING_STUB_DELAY_MS: "3000" });
    await vi.advanceTimersByTimeAsync(3000);
    expect(await held).toEqual({ ok: false, errorClass: "upstream_busy" });
    vi.useRealTimers();
  });
});
