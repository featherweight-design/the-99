import { describe, expect, it } from "vitest";

import { cutsFootStanding, cutsStanding } from "./cuts-free-count";
import type { CutsPanel } from "../../lib/tuning/cuts-state";

const panel = (allowance: object) => ({ allowance }) as unknown as CutsPanel;
const paidNext = { used: 5, limit: 5, nextAt: null, reopensAt: null, pack: 114, paidUsedToday: 0, paidLimit: 20 };

describe("the credit line under a finished Look deeper result", () => {
  it("counts where the credits stand; the offer's line names what the next run will spend (L3)", () => {
    expect(cutsStanding(panel(paidNext))).toContain("this run uses 1 of 114\u00a0paid");
    expect(cutsFootStanding(panel(paidNext))).toContain("114\u00a0paid");
    expect(cutsFootStanding(panel(paidNext))).not.toContain("this run uses");
  });

  it("is the offer's own line when the share is used or every credit is out", () => {
    const spent = { used: 5, limit: 5, nextAt: null, reopensAt: null };
    expect(cutsFootStanding(panel(spent))).toBe(cutsStanding(panel(spent)));
  });
});
