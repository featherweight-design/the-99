// Small items 5 (d9, 2026-10-28): a carry-over with nothing to do says nothing; a real refusal is logged.
import { describe, expect, it } from "vitest";
import { carryLogLine } from "./carry-over";

describe("carryLogLine", () => {
  it("is silent for a repeat (a deck already read), the switch off, no Overview, and an attach", () => {
    expect(carryLogLine({ attached: false, reason: "has_reading" })).toBeNull();
    expect(carryLogLine({ attached: false, reason: "off" })).toBeNull();
    expect(carryLogLine({ attached: false, reason: "none" })).toBeNull();
    expect(carryLogLine({ attached: true, synopsisId: "s" })).toBeNull();
  });
  it("names a real refusal", () => {
    expect(carryLogLine({ attached: false, reason: "not_current" })).toBe("precon overview not carried over: not_current");
    expect(carryLogLine({ attached: false, reason: "no_reading" })).toBe("precon overview not carried over: no_reading");
  });
});
