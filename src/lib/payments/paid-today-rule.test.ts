import { describe, expect, it } from "vitest";
import { PAID_TODAY_SHOWN_FROM, paidToday } from "./paid-today-rule";

describe("the daily paid line (P5, P5b)", () => {
  it("is hidden below 15, and for a reader with no paid lot", () => {
    expect(paidToday({ paidUsedToday: PAID_TODAY_SHOWN_FROM - 1, paidLimit: 20 })).toBeNull();
    expect(paidToday({})).toBeNull();
    expect(paidToday({ paidUsedToday: 0, paidLimit: 20 })).toBeNull();
  });

  it("P5: shown from 15 with a neutral meter", () => {
    expect(paidToday({ paidUsedToday: 15, paidLimit: 20 })).toMatchObject({ used: 15, limit: 20, atLimit: false, percent: 75 });
    expect(paidToday({ paidUsedToday: 17, paidLimit: 20 })).toMatchObject({ atLimit: false, percent: 85 });
  });

  it("P5b: at the limit the meter is full and the state says so; the reset time rides along", () => {
    const back = new Date("2026-10-17T08:01:00Z");
    expect(paidToday({ paidUsedToday: 20, paidLimit: 20, paidBackAt: back })).toEqual({ used: 20, limit: 20, atLimit: true, percent: 100, backAtMs: back.getTime() });
  });

  it("a group's own limit below 15 still shows at the limit", () => {
    expect(paidToday({ paidUsedToday: 10, paidLimit: 10 })).toMatchObject({ atLimit: true });
  });
});
