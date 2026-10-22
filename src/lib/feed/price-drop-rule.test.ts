import { describe, expect, it } from "vitest";
import { isoWeek, priceDropKey, priceDropped } from "./price-drop-rule";

const now = new Date("2026-10-22T12:00:00Z");
const DAY = 86_400_000;
const facts = (atAddCents: number | null, nowCents: number | null, noticedAt: Date | null = null) => ({ atAddCents, nowCents, noticedAt, now });

describe("priceDropped (G2: 20% or $2 below the price at add, once a week)", () => {
  it("fires at exactly 80% and not a cent above it", () => {
    expect(priceDropped(facts(1000, 800))).toBe(true);
    expect(priceDropped(facts(1000, 801))).toBe(false);
  });

  it("fires at exactly $2 under and not a cent less, where 20% is more than $2", () => {
    expect(priceDropped(facts(5000, 4800))).toBe(true);
    expect(priceDropped(facts(5000, 4801))).toBe(false);
  });

  it("takes whichever of the two is the smaller fall", () => {
    // 20% of $5 is $1, so a $1 fall counts though it is under $2.
    expect(priceDropped(facts(500, 400))).toBe(true);
    // $2 off $40 is 5%, so it counts though it is under 20%.
    expect(priceDropped(facts(4000, 3800))).toBe(true);
  });

  it("never fires on a rise, an unchanged price, a missing figure or a zero baseline", () => {
    expect(priceDropped(facts(1000, 1200))).toBe(false);
    expect(priceDropped(facts(1000, 1000))).toBe(false);
    expect(priceDropped(facts(null, 100))).toBe(false);
    expect(priceDropped(facts(1000, null))).toBe(false);
    expect(priceDropped(facts(0, 0))).toBe(false);
  });

  it("is told at most once a week per card", () => {
    expect(priceDropped(facts(1000, 500, new Date(now.getTime() - 6 * DAY)))).toBe(false);
    expect(priceDropped(facts(1000, 500, new Date(now.getTime() - 7 * DAY + 1)))).toBe(false);
    expect(priceDropped(facts(1000, 500, new Date(now.getTime() - 7 * DAY)))).toBe(true);
    expect(priceDropped(facts(1000, 500, new Date(now.getTime() - 30 * DAY)))).toBe(true);
  });
});

describe("isoWeek", () => {
  it("numbers weeks from the week holding the year's first Thursday", () => {
    expect(isoWeek(new Date("2026-10-22T12:00:00Z"))).toBe("2026-W43");
    expect(isoWeek(new Date("2026-01-01T00:00:00Z"))).toBe("2026-W01"); // a Thursday
    expect(isoWeek(new Date("2027-01-01T00:00:00Z"))).toBe("2026-W53"); // a Friday: still 2026's week
    expect(isoWeek(new Date("2024-12-30T00:00:00Z"))).toBe("2025-W01"); // a Monday: already 2025's week
  });

  it("runs Monday to Sunday in UTC", () => {
    expect(isoWeek(new Date("2026-10-19T00:00:00Z"))).toBe("2026-W43"); // Monday
    expect(isoWeek(new Date("2026-10-25T23:59:59Z"))).toBe("2026-W43"); // Sunday
    expect(isoWeek(new Date("2026-10-26T00:00:00Z"))).toBe("2026-W44");
  });

  it("keys a drop by card and week", () => {
    expect(priceDropKey("a1b2", now)).toBe("a1b2:2026-W43");
  });
});
