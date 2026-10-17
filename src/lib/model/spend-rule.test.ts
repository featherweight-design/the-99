import { describe, expect, it } from "vitest";

import { RESERVATION_TTL_MS } from "./allowance-rule";
import { featureWorstCaseMicroUsd } from "./prices";
import {
  monthStartUtc,
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
    expect(OWNER_SHARE_USD).toBe(5);
  });
});

describe("the month", () => {
  it("starts and ends on UTC calendar boundaries", () => {
    expect(monthStartUtc(now).toISOString()).toBe("2026-09-01T00:00:00.000Z");
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
  const share = usdToMicro(OWNER_SHARE_USD);

  it("holds the owner to their share, and a friend never", () => {
    expect(spendRefusal({ ownerMonthMicro: share - call + 1, callMicro: call })).toBe("ownerShare");
    expect(spendRefusal({ ownerMonthMicro: share - call, callMicro: call })).toBeNull();
    expect(spendRefusal({ ownerMonthMicro: null, callMicro: call })).toBeNull();
  });

  it("holds the owner to an overridden share when one is passed", () => {
    const wide = usdToMicro(25);
    const at = (owner: number) => spendRefusal({ ownerMonthMicro: owner, callMicro: call, ownerShareMicro: wide });
    expect(at(share)).toBeNull();
    expect(at(wide - call)).toBeNull();
    expect(at(wide - call + 1)).toBe("ownerShare");
  });

  it("never refuses a friend, however much the month has spent (no app-wide limit, 2026-10-17)", () => {
    expect(spendRefusal({ ownerMonthMicro: null, callMicro: usdToMicro(1_000) })).toBeNull();
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
