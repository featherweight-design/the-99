import { describe, expect, it } from "vitest";

import { upgradeChargeFor } from "./charge";
import { MIN_SWAPS } from "./constants";

describe("upgradeChargeFor", () => {
  it("charges a run that reaches the floor, and refunds whole under it or on failure", () => {
    expect(upgradeChargeFor({ failed: false, kept: MIN_SWAPS })).toEqual({ outcome: "spent" });
    expect(upgradeChargeFor({ failed: false, kept: MIN_SWAPS - 1 })).toEqual({ outcome: "refunded", why: "short" });
    expect(upgradeChargeFor({ failed: false, kept: 0 })).toEqual({ outcome: "refunded", why: "ungrounded" });
    expect(upgradeChargeFor({ failed: true, kept: 0 })).toEqual({ outcome: "refunded", why: "failed" });
  });
});
