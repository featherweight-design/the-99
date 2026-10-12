import { describe, expect, it } from "vitest";

import { intakeLive, stubDelayMs, stubMode } from "./stub";

describe("the read's stub switches", () => {
  it("is live only in production or under INTAKE_LIVE=1", () => {
    expect(intakeLive({ NODE_ENV: "development" })).toBe(false);
    expect(intakeLive({ NODE_ENV: "test", INTAKE_LIVE: "1" })).toBe(true);
    expect(intakeLive({ NODE_ENV: "production" })).toBe(true);
  });

  it("reads INTAKE_STUB as a mode, and anything else as mapped", () => {
    expect(stubMode({ INTAKE_STUB: "timeout" })).toBe("timeout");
    expect(stubMode({ INTAKE_STUB: "bogus" })).toBe("mapped");
  });

  it("holds a reply for INTAKE_STUB_DELAY_MS, capped at 30s", () => {
    expect(stubDelayMs({})).toBe(0);
    expect(stubDelayMs({ INTAKE_STUB_DELAY_MS: "250" })).toBe(250);
    expect(stubDelayMs({ INTAKE_STUB_DELAY_MS: "999999" })).toBe(30_000);
  });
});
