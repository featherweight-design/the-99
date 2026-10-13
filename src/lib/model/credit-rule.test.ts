import { describe, expect, it } from "vitest";
import { RESERVATION_TTL_MS } from "./allowance-rule";
import { countsAgainstGrant, creditTotals, isLive, pickGrant, remaining, type CreditGrant } from "./credit-rule";

const now = new Date("2026-10-13T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);
const DAY = 24 * 60 * 60 * 1000;

function lot(over: Partial<CreditGrant> & { id: string }): CreditGrant {
  return { source: "pack", units: 40, revokedUnits: 0, expiresAt: null, createdAt: ago(DAY), ...over };
}

describe("countsAgainstGrant", () => {
  it("counts a spent run however old, because paid credits never roll off the window", () => {
    expect(countsAgainstGrant({ status: "spent", createdAt: ago(400 * DAY) }, now)).toBe(true);
  });

  it("counts a reservation only while it is still in flight, so a stranded one gives its credit back", () => {
    expect(countsAgainstGrant({ status: "reserved", createdAt: ago(RESERVATION_TTL_MS - 1) }, now)).toBe(true);
    expect(countsAgainstGrant({ status: "reserved", createdAt: ago(RESERVATION_TTL_MS) }, now)).toBe(false);
  });

  it("never counts a refunded run, so a failed run returns its credit to the lot that funded it", () => {
    expect(countsAgainstGrant({ status: "refunded", createdAt: ago(1) }, now)).toBe(false);
  });
});

describe("remaining", () => {
  it("is units less revoked, spent and in-flight", () => {
    const g = lot({ id: "a", units: 40, revokedUnits: 5 });
    expect(remaining(g, { spent: 10, reserved: [ago(1000)] }, now)).toBe(24);
  });

  it("drops a reservation past its TTL from the count", () => {
    const g = lot({ id: "a", units: 3 });
    expect(remaining(g, { spent: 2, reserved: [ago(RESERVATION_TTL_MS + 1)] }, now)).toBe(1);
  });

  it("never goes below zero, whatever a refund revoked after the credits were spent", () => {
    const g = lot({ id: "a", units: 10, revokedUnits: 8 });
    expect(remaining(g, { spent: 5, reserved: [] }, now)).toBe(0);
  });

  it("is zero for a plan lot past its expiry, at the instant and after", () => {
    const g = lot({ id: "p", source: "plan", units: 60, expiresAt: now });
    expect(isLive(g, now)).toBe(false);
    expect(remaining(g, { spent: 0, reserved: [] }, now)).toBe(0);
    expect(remaining({ ...g, expiresAt: new Date(now.getTime() + 1) }, { spent: 0, reserved: [] }, now)).toBe(60);
  });
});

describe("pickGrant: plan before pack", () => {
  it("spends a plan lot before a pack lot, even an older pack", () => {
    const pack = lot({ id: "pack", createdAt: ago(30 * DAY) });
    const plan = lot({ id: "plan", source: "plan", createdAt: ago(DAY) });
    expect(pickGrant([{ grant: pack, remaining: 5 }, { grant: plan, remaining: 5 }])?.id).toBe("plan");
  });

  it("among plan lots, the soonest to expire first, then an unexpiring one", () => {
    const open = lot({ id: "open", source: "plan", createdAt: ago(9 * DAY) });
    const soon = lot({ id: "soon", source: "plan", createdAt: ago(DAY), expiresAt: new Date(now.getTime() + DAY) });
    const later = lot({ id: "later", source: "plan", createdAt: ago(DAY), expiresAt: new Date(now.getTime() + 2 * DAY) });
    expect(pickGrant([open, later, soon].map((grant) => ({ grant, remaining: 1 })))?.id).toBe("soon");
  });

  it("among lots alike, the oldest first", () => {
    const a = lot({ id: "a", createdAt: ago(2 * DAY) });
    const b = lot({ id: "b", createdAt: ago(5 * DAY) });
    expect(pickGrant([a, b].map((grant) => ({ grant, remaining: 1 })))?.id).toBe("b");
  });

  it("skips a lot with nothing left, and answers null when none has a credit", () => {
    const plan = lot({ id: "plan", source: "plan" });
    const pack = lot({ id: "pack" });
    expect(pickGrant([{ grant: plan, remaining: 0 }, { grant: pack, remaining: 1 }])?.id).toBe("pack");
    expect(pickGrant([{ grant: plan, remaining: 0 }, { grant: pack, remaining: 0 }])).toBeNull();
    expect(pickGrant([])).toBeNull();
  });
});

describe("creditTotals", () => {
  it("sums what each source has left", () => {
    const balances = [
      { grant: lot({ id: "p1", source: "plan" }), remaining: 12 },
      { grant: lot({ id: "p2", source: "plan" }), remaining: 3 },
      { grant: lot({ id: "k1" }), remaining: 40 },
    ];
    expect(creditTotals(balances)).toEqual({ plan: 15, pack: 40 });
  });
});
