import { describe, expect, it } from "vitest";

import {
  paidLimit,
  PAID_DAILY_LIMIT,
  ALLOWANCE_WINDOW_MS,
  MODEL_DEFAULT_DAILY_ALLOWANCE,
  MODEL_OWNER_DAILY_ALLOWANCE,
  RESERVATION_TTL_MS,
  allowanceFrom,
  counts,
  hasCredit,
  heldCredits,
  ownerDailyAllowanceFrom,
  paidAtLimit,
  freeRoom,
  paidRoom,
  runFunding,
} from "./allowance-rule";
import { pickGrant, type CreditGrant } from "./credit-rule";
import { unitsFor } from "../tuning/v2/charge";

const now = new Date("2026-09-23T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

describe("allowanceFrom", () => {
  const spent = (createdAt: Date) => ({ status: "spent" as const, createdAt });
  const reserved = (createdAt: Date) => ({ status: "reserved" as const, createdAt });
  const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);

  it("counts only calls inside the rolling window", () => {
    expect(allowanceFrom([spent(hoursAgo(1)), spent(hoursAgo(23.9)), spent(hoursAgo(25))], now).used).toBe(2);
  });

  it("drops a call exactly one window old", () => {
    expect(allowanceFrom([spent(new Date(now.getTime() - ALLOWANCE_WINDOW_MS))], now).used).toBe(0);
  });

  it("does not count a refunded unit", () => {
    expect(allowanceFrom([{ status: "refunded", createdAt: hoursAgo(1) }], now).used).toBe(0);
  });

  it("names no reopening time while units remain", () => {
    // A limit of several (a group's), so units can be spent and still remain: the default is one.
    const limit = 5;
    const rows = Array.from({ length: limit - 1 }, (_, i) => spent(hoursAgo(i + 1)));
    expect(allowanceFrom(rows, now, limit)).toEqual({
      used: limit - 1,
      limit,
      reopensAt: null,
      // The credit line names the next one while credits remain: the oldest unit's expiry.
      nextAt: new Date(hoursAgo(limit - 1).getTime() + ALLOWANCE_WINDOW_MS),
    });
  });

  it("defaults to one run a day for a player on the public default", () => {
    expect(MODEL_DEFAULT_DAILY_ALLOWANCE).toBe(1);
    expect(allowanceFrom([], now).limit).toBe(1);
    expect(allowanceFrom([spent(hoursAgo(1))], now).used).toBe(1);
  });

  it("names no next time when nothing counts", () => {
    expect(allowanceFrom([{ status: "refunded", createdAt: hoursAgo(1) }], now).nextAt).toBeNull();
  });

  it("names a reservation's TTL as the next time when it expires first", () => {
    const a = allowanceFrom([spent(hoursAgo(1)), reserved(minutesAgo(2))], now);
    expect(a.nextAt).toEqual(new Date(minutesAgo(2).getTime() + RESERVATION_TTL_MS));
  });

  it("reopens when the oldest counted call leaves the window", () => {
    // Given out of order on purpose: the reopening time is the OLDEST, not the first listed. A limit of several, so the
    // order means something (the default is one run).
    const rows = Array.from({ length: 5 }, (_, i) => spent(hoursAgo(20 - i))).reverse();
    const a = allowanceFrom(rows, now, 5);
    expect(a.used).toBe(5);
    expect(a.reopensAt).toEqual(new Date(hoursAgo(20).getTime() + ALLOWANCE_WINDOW_MS));
  });

  it("over the limit, waits for enough units to leave that one is free", () => {
    // Limit 2, three counted (a concurrent reserve landed): one leaving is not enough.
    const a = allowanceFrom([spent(hoursAgo(20)), spent(hoursAgo(10)), spent(hoursAgo(5))], now, 2);
    expect(a.reopensAt).toEqual(new Date(hoursAgo(10).getTime() + ALLOWANCE_WINDOW_MS));
  });

  it("names no reopening time, and no invalid one, when the limit is zero and nothing counts", () => {
    expect(allowanceFrom([], now, 0)).toEqual({ used: 0, limit: 0, reopensAt: null, nextAt: null });
  });

  it("reopens when a reservation's TTL runs out, not a day later", () => {
    // Full because one run is in flight: its unit frees at the reservation TTL at the latest.
    const a = allowanceFrom([spent(hoursAgo(20)), reserved(minutesAgo(2))], now, 2);
    expect(a.reopensAt).toEqual(new Date(minutesAgo(2).getTime() + RESERVATION_TTL_MS));
  });

  it("picks the earliest expiry across spent and reserved units", () => {
    // The spent unit leaves the window a minute from now, before the reservation's TTL.
    const a = allowanceFrom([spent(new Date(now.getTime() - ALLOWANCE_WINDOW_MS + 60_000)), reserved(minutesAgo(1))], now, 2);
    expect(a.reopensAt).toEqual(new Date(now.getTime() + 60_000));
  });
});

describe("paidLimit", () => {
  it("is the default with no group limit, else the group's, ignoring anything off the column's range", () => {
    expect(paidLimit({ groupLimits: [] })).toBe(PAID_DAILY_LIMIT);
    expect(PAID_DAILY_LIMIT).toBe(20);
    expect(paidLimit({ groupLimits: [3] })).toBe(3);
    expect(paidLimit({ groupLimits: [3, 40] })).toBe(40);
    expect(paidLimit({ groupLimits: [0, -1, Number.NaN, 2.5] })).toBe(PAID_DAILY_LIMIT);
  });
});

describe("counts", () => {
  const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);

  it("counts a spent unit for the whole window, and not after", () => {
    expect(counts({ status: "spent", createdAt: hoursAgo(23) }, now)).toBe(true);
    expect(counts({ status: "spent", createdAt: hoursAgo(24) }, now)).toBe(false);
  });

  it("never counts a refunded unit", () => {
    expect(counts({ status: "refunded", createdAt: minutesAgo(1) }, now)).toBe(false);
  });

  it("counts a reservation while a run could still be in flight", () => {
    expect(counts({ status: "reserved", createdAt: minutesAgo(1) }, now)).toBe(true);
  });

  it("stops counting a reservation nothing can still be running under", () => {
    // A deck deleted mid-run cascades its run away, and nothing is left to settle the unit.
    expect(counts({ status: "reserved", createdAt: new Date(now.getTime() - RESERVATION_TTL_MS) }, now)).toBe(false);
  });
});

describe("ownerDailyAllowanceFrom", () => {
  it("falls back to the owner's ten when unset or blank", () => {
    expect(ownerDailyAllowanceFrom(undefined)).toBe(MODEL_OWNER_DAILY_ALLOWANCE);
    expect(ownerDailyAllowanceFrom("")).toBe(MODEL_OWNER_DAILY_ALLOWANCE);
    expect(ownerDailyAllowanceFrom("   ")).toBe(MODEL_OWNER_DAILY_ALLOWANCE);
  });

  it("takes a positive whole number, trimmed", () => {
    expect(ownerDailyAllowanceFrom("100")).toBe(100);
    expect(ownerDailyAllowanceFrom(" 25 ")).toBe(25);
    expect(ownerDailyAllowanceFrom("1")).toBe(1);
  });

  it("falls back on anything else", () => {
    for (const raw of ["0", "-5", "2.5", "1e3", "abc", "10abc", "0x10", "Infinity", "NaN", "99999999999999999999"]) {
      expect(ownerDailyAllowanceFrom(raw), raw).toBe(MODEL_OWNER_DAILY_ALLOWANCE);
    }
  });
});

describe("a welcome lot is a held credit", () => {
  it("counts in heldCredits beside plan and pack", () => {
    expect(heldCredits({ welcome: 15, plan: 2, pack: 3 })).toBe(20);
    expect(heldCredits({})).toBe(0);
  });

  it("funds a run once the free allowance is spent, under the paid limit", () => {
    const spent = { used: 5, limit: 5, welcome: 15, paidUsedToday: 0, paidLimit: 20 };
    expect(hasCredit(spent)).toBe(true);
    expect(hasCredit({ ...spent, welcome: 0 })).toBe(false);
    expect(hasCredit({ ...spent, paidUsedToday: 20 })).toBe(false);
    expect(paidAtLimit({ ...spent, paidUsedToday: 20 })).toBe(true);
  });

  it("counts a gift as held like any lot, so it funds a run and meets the paid limit", () => {
    expect(heldCredits({ gift: 4, pack: 1 })).toBe(5);
    const spent = { used: 5, limit: 5, gift: 4, paidUsedToday: 0, paidLimit: 20 };
    expect(hasCredit(spent)).toBe(true);
    expect(hasCredit({ ...spent, paidUsedToday: 20 })).toBe(false);
    expect(paidAtLimit({ ...spent, paidUsedToday: 20 })).toBe(true);
  });
});

// Suggested changes v2 pricing (Hugh, 2026-10-30): a run over 10 swaps costs 2 credits, and ONE source funds a whole run.
// `reserveModelCall` decides it with these; `allowance.test.ts` covers the decision end to end.
describe("a run's units", () => {
  const spent = (createdAt: Date, units?: number) => ({ status: "spent" as const, createdAt, ...(units ? { units } : {}) });

  it("counts credits, not rows: a 2-unit run uses two", () => {
    expect(allowanceFrom([spent(hoursAgo(1), 2), spent(hoursAgo(2))], now, 10).used).toBe(3);
  });

  it("frees both credits of a 2-unit run at its one expiry", () => {
    const a = allowanceFrom([spent(hoursAgo(23), 2)], now, 2);
    expect(a.used).toBe(2);
    expect(a.reopensAt).toEqual(new Date(hoursAgo(23).getTime() + ALLOWANCE_WINDOW_MS));
  });

  it("free room funds a 1-unit run at 1, a 2-unit run only at 2", () => {
    expect(freeRoom({ used: 0, limit: 1 }, 1)).toBe(true);
    expect(freeRoom({ used: 0, limit: 1 }, 2)).toBe(false);
    expect(freeRoom({ used: 8, limit: 10 }, 2)).toBe(true);
    expect(freeRoom({ used: 9, limit: 10 }, 2)).toBe(false);
  });

  it("the paid limit counts a 2-unit run whole: 19 of 20 used refuses it", () => {
    expect(paidRoom({ paidUsed: 19, paidLimit: PAID_DAILY_LIMIT }, 2)).toBe(false);
    expect(paidRoom({ paidUsed: 19, paidLimit: PAID_DAILY_LIMIT }, 1)).toBe(true);
    expect(paidRoom({ paidUsed: 18, paidLimit: PAID_DAILY_LIMIT }, 2)).toBe(true);
  });

  it("picks the first lot in spend order that holds the whole cost, never two lots", () => {
    const lot = (id: string, source: CreditGrant["source"], createdAt: Date): CreditGrant => ({ id, source, units: 40, revokedUnits: 0, expiresAt: source === "welcome" ? hoursAgo(-100) : null, createdAt });
    const balances = [
      { grant: lot("welcome", "welcome", hoursAgo(5)), remaining: 1 },
      { grant: lot("pack", "pack", hoursAgo(4)), remaining: 3 },
    ];
    expect(pickGrant(balances)?.id).toBe("welcome");
    expect(pickGrant(balances, 2)?.id).toBe("pack");
    expect(pickGrant([balances[0], { ...balances[1], remaining: 1 }], 2)).toBeNull();
  });
});

describe("runFunding (Small items 7, the 2-credit cue)", () => {
  it("costs 1 credit at 10 swaps and 2 at 11", () => {
    expect(runFunding({ used: 0, limit: 1 }, unitsFor(10))).toEqual({ source: "free", units: 1, freeLeft: 1, freeAfter: 0 });
    expect(runFunding({ used: 0, limit: 1 }, unitsFor(11))).toEqual({ source: "short", units: 2, freeHoldsOne: true });
  });

  it("the free allowance funds a 2-credit run only when it holds both, and says what it leaves", () => {
    expect(runFunding({ used: 0, limit: 5 }, 2)).toEqual({ source: "free", units: 2, freeLeft: 5, freeAfter: 3 });
    expect(runFunding({ used: 3, limit: 5 }, 2)).toEqual({ source: "free", units: 2, freeLeft: 2, freeAfter: 0 });
    // Holding 1 is not enough for 2: it is never split with a lot.
    expect(runFunding({ used: 4, limit: 5, welcome: 15 }, 2)).toEqual({ source: "welcome", units: 2 });
    expect(runFunding({ used: 4, limit: 5 }, 1)).toEqual({ source: "free", units: 1, freeLeft: 1, freeAfter: 0 });
  });

  it("welcome before paid, and a gift is shown as paid", () => {
    expect(runFunding({ used: 0, limit: 1, welcome: 15 }, 2)).toEqual({ source: "welcome", units: 2 });
    expect(runFunding({ used: 0, limit: 1, welcome: 15, pack: 8 }, 2)).toEqual({ source: "welcome", units: 2 });
    expect(runFunding({ used: 0, limit: 1, pack: 8 }, 2)).toEqual({ source: "paid", units: 2 });
    expect(runFunding({ used: 0, limit: 1, gift: 3 }, 2)).toEqual({ source: "paid", units: 2 });
    // A welcome lot down to 1 cannot hold 2, so the paid source behind it does.
    expect(runFunding({ used: 1, limit: 1, welcome: 1, plan: 8 }, 2)).toEqual({ source: "paid", units: 2 });
    expect(runFunding({ used: 1, limit: 1, welcome: 1, plan: 8 }, 1)).toEqual({ source: "welcome", units: 1 });
  });

  it("is short when the free run is gone and one lot credit is left", () => {
    expect(runFunding({ used: 1, limit: 1, pack: 1 }, 2)).toEqual({ source: "short", units: 2, freeHoldsOne: false });
    expect(runFunding({ used: 1, limit: 1, welcome: 1 }, 2)).toEqual({ source: "short", units: 2, freeHoldsOne: false });
  });

  it("is short when the paid limit has room for 1 but not 2", () => {
    const a = { used: 1, limit: 1, pack: 8, paidUsedToday: 19, paidLimit: 20 };
    expect(runFunding(a, 2)).toEqual({ source: "short", units: 2, freeHoldsOne: false });
    expect(runFunding(a, 1)).toEqual({ source: "paid", units: 1 });
  });

  it("is spent when nothing funds even 1, whatever the run costs", () => {
    expect(runFunding({ used: 1, limit: 1 }, 2)).toEqual({ source: "spent", units: 2 });
    expect(runFunding({ used: 1, limit: 1 }, 1)).toEqual({ source: "spent", units: 1 });
    expect(runFunding({ used: 1, limit: 1, pack: 8, paidUsedToday: 20, paidLimit: 20 }, 2)).toEqual({ source: "spent", units: 2 });
  });

  it("agrees with hasCredit on every 1-credit run", () => {
    for (const a of [
      { used: 0, limit: 1 },
      { used: 1, limit: 1 },
      { used: 1, limit: 1, pack: 1 },
      { used: 1, limit: 1, welcome: 2, paidUsedToday: 20, paidLimit: 20 },
    ]) {
      expect(runFunding(a, 1).source !== "spent").toBe(hasCredit(a));
    }
  });
});
