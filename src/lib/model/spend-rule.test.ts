import { describe, expect, it } from "vitest";

import { RESERVATION_TTL_MS } from "./allowance-rule";
import { featureWorstCaseMicroUsd } from "./prices";
import {
  ALARM_PCTS,
  BUDGET_USD,
  crossedAlarms,
  HARD_STOP_USD,
  monthStartUtc,
  nextMonthStartUtc,
  OWNER_SHARE_USD,
  ownerShareUsdFrom,
  countsAtWorstCase,
  unpricedWorstCaseMicro,
  spendRefusal,
  usdToMicro,
} from "./spend-rule";

const now = new Date("2026-09-24T12:00:00Z");

describe("the constants", () => {
  it("are the ruled figures", () => {
    expect([HARD_STOP_USD, BUDGET_USD, OWNER_SHARE_USD]).toEqual([20, 10, 5]);
    expect(ALARM_PCTS).toEqual([50, 80]);
  });
});

describe("the month", () => {
  it("starts and ends on UTC calendar boundaries", () => {
    expect(monthStartUtc(now).toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(nextMonthStartUtc(now).toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });

  it("rolls the year in December", () => {
    expect(nextMonthStartUtc(new Date("2026-12-31T23:59:59Z")).toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("reads the instant in UTC, whatever the local clock says", () => {
    expect(monthStartUtc(new Date("2026-10-01T00:30:00Z")).toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });
});

describe("unpricedWorstCaseMicro", () => {
  const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);

  it("counts a reservation in flight at its feature's worst case", () => {
    expect(unpricedWorstCaseMicro([
      { status: "reserved", feature: "tuning", model: "claude-sonnet-5", createdAt: minutesAgo(1) },
      { status: "reserved", feature: "synopsis", model: null, createdAt: minutesAgo(2) },
    ], now)).toBe(featureWorstCaseMicroUsd("tuning") + featureWorstCaseMicroUsd("synopsis"));
  });

  it("counts a Stopped call, refunded with no meters yet, at its worst case too", () => {
    expect(unpricedWorstCaseMicro([
      { status: "refunded", feature: "tuning", model: null, createdAt: minutesAgo(1) },
    ], now)).toBe(featureWorstCaseMicroUsd("tuning"));
  });

  it("drops an unpriced call past its TTL, whether reserved or refunded", () => {
    const aged = new Date(now.getTime() - RESERVATION_TTL_MS);
    expect(unpricedWorstCaseMicro([
      { status: "reserved", feature: "tuning", model: null, createdAt: aged },
      { status: "refunded", feature: "tuning", model: null, createdAt: aged },
    ], now)).toBe(0);
  });

  it("drops one from last month", () => {
    const firstMinute = new Date("2026-10-01T00:01:00Z");
    expect(unpricedWorstCaseMicro([
      { status: "reserved", feature: "tuning", model: null, createdAt: new Date("2026-09-30T23:59:00Z") },
    ], firstMinute)).toBe(0);
  });

  it("never prices a spent row with no cost: it predates the meters", () => {
    expect(countsAtWorstCase({ status: "spent", feature: "tuning", model: null, createdAt: minutesAgo(1) }, now)).toBe(false);
  });
});

describe("spendRefusal", () => {
  const call = 208_000;
  const stop = usdToMicro(HARD_STOP_USD);
  const share = usdToMicro(OWNER_SHARE_USD);

  it("lets a call through that fits under the hard stop exactly", () => {
    expect(spendRefusal({ appMonthMicro: stop - call, ownerMonthMicro: null, callMicro: call })).toBeNull();
  });

  it("pauses the app once one more call would pass the hard stop", () => {
    expect(spendRefusal({ appMonthMicro: stop - call + 1, ownerMonthMicro: null, callMicro: call })).toBe("paused");
  });

  it("holds the owner to their share, and a friend never", () => {
    expect(spendRefusal({ appMonthMicro: 0, ownerMonthMicro: share - call + 1, callMicro: call })).toBe("ownerShare");
    expect(spendRefusal({ appMonthMicro: 0, ownerMonthMicro: share - call, callMicro: call })).toBeNull();
    expect(spendRefusal({ appMonthMicro: share, ownerMonthMicro: null, callMicro: call })).toBeNull();
  });

  it("holds the owner to an overridden share when one is passed", () => {
    const wide = usdToMicro(25);
    expect(spendRefusal({ appMonthMicro: 0, ownerMonthMicro: share, callMicro: call, ownerShareMicro: wide })).toBeNull();
    expect(spendRefusal({ appMonthMicro: 0, ownerMonthMicro: wide - call + 1, callMicro: call, ownerShareMicro: wide })).toBe("ownerShare");
  });

  it("still pauses at the hard stop whatever the owner's share", () => {
    expect(spendRefusal({ appMonthMicro: stop, ownerMonthMicro: 0, callMicro: call, ownerShareMicro: usdToMicro(25) })).toBe("paused");
  });

  it("names the pause over the share when both apply", () => {
    expect(spendRefusal({ appMonthMicro: stop, ownerMonthMicro: share, callMicro: call })).toBe("paused");
  });
});

describe("crossedAlarms", () => {
  const five = usdToMicro(5);
  const eight = usdToMicro(8);

  it("reports a settle that carries spend onto or over a line", () => {
    expect(crossedAlarms(five - 1, five)).toEqual([50]);
    expect(crossedAlarms(eight - 1, eight + 100)).toEqual([80]);
  });

  it("reports both lines when one settle crosses both", () => {
    expect(crossedAlarms(five - 1, eight)).toEqual([50, 80]);
  });

  it("stays quiet below a line, and once past it", () => {
    expect(crossedAlarms(0, five - 1)).toEqual([]);
    expect(crossedAlarms(five, five + 1_000)).toEqual([]);
  });
});

describe("ownerShareUsdFrom", () => {
  it("falls back to the owner's five when unset or blank", () => {
    expect(ownerShareUsdFrom(undefined)).toBe(OWNER_SHARE_USD);
    expect(ownerShareUsdFrom("")).toBe(OWNER_SHARE_USD);
    expect(ownerShareUsdFrom("  ")).toBe(OWNER_SHARE_USD);
  });

  it("takes a positive decimal number, trimmed", () => {
    expect(ownerShareUsdFrom("25")).toBe(25);
    expect(ownerShareUsdFrom(" 7.5 ")).toBe(7.5);
    expect(ownerShareUsdFrom("0.01")).toBe(0.01);
  });

  it("falls back on anything else", () => {
    for (const raw of ["0", "0.0", "0.0000004", "-5", "1e3", "$25", "25usd", ".5", "5.", "abc", "Infinity", "NaN"]) {
      expect(ownerShareUsdFrom(raw), raw).toBe(OWNER_SHARE_USD);
    }
  });
});
