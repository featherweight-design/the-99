import { describe, expect, it } from "vitest";
import { creditsCopy } from "../copy/credits";
import { creditAgain, creditCount, creditFirst, creditLineKind, creditSpent, creditStanding, expiringPhrase, type LineAllowance } from "./credit-line";

const at = (h: number, m = 0) => new Date(2026, 9, 17, h, m);
const NOW = new Date("2026-11-14T12:00:00Z");
const base = (over: Partial<LineAllowance> = {}): LineAllowance => ({ used: 1, limit: 5, nextAt: at(14, 1), reopensAt: null, ...over });
const t = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

describe("which line", () => {
  it("L1: nothing bought is the shipped line, byte for byte", () => {
    const a = base();
    expect(creditLineKind(a)).toBe("free");
    expect(creditStanding(a)).toBe(creditsCopy.standing(4, 5, a.nextAt));
    expect(creditFirst(a)).toBe(creditsCopy.first(4, 5, a.nextAt));
    expect(creditAgain(a)).toBe(creditsCopy.again(4, 5, a.nextAt));
  });

  it("L2: a free credit left and paid held counts the paid total once", () => {
    const a = base({ plan: 74, pack: 40, paidUsedToday: 3, paidLimit: 20 });
    expect(creditLineKind(a)).toBe("withPaid");
    expect(creditStanding(a)).toBe(`4 of 5 free · reset at ${t(a.nextAt!)} · 114 paid`);
    expect(creditFirst(a)).toBe(`Uses a credit. 4 of 5 free · reset at ${t(a.nextAt!)} · 114 paid.`);
  });

  it("L3: free spent, paid held: the line says the next run uses a paid credit and the press stays live", () => {
    const a = base({ used: 5, reopensAt: at(15), pack: 114, paidUsedToday: 0, paidLimit: 20 });
    expect(creditLineKind(a)).toBe("paidNext");
    expect(creditStanding(a)).toBe(`0 of 5 free · reset at ${t(at(15))} · this run uses 1 of 114 paid`);
    expect(creditFirst(a)).toBe(`Uses a paid credit. 0 of 5 free · reset at ${t(at(15))} · 114 paid.`);
    expect(creditAgain(a)).toBe(`Replaces these suggestions and uses a paid credit. 0 of 5 free · reset at ${t(at(15))} · 114 paid.`);
  });

  it("L4: nothing to spend: the shipped spent line, Get more credits on its own line only while payments are on", () => {
    const a = base({ used: 5, reopensAt: at(14, 1) });
    expect(creditLineKind(a)).toBe("spent");
    expect(creditSpent(a)).toBe(creditsCopy.spent(5, a.reopensAt));
    expect(creditSpent({ ...a, payments: false })).not.toContain(creditsCopy.getMore);
    expect(creditSpent({ ...a, payments: true })).toBe(`${creditsCopy.spent(5, a.reopensAt)}\n${creditsCopy.getMore}`);
  });

  it("L5: paid limit reached, free spent: says the limit, never Get more credits, back at the earlier of free and the limit", () => {
    const a = base({ used: 5, reopensAt: at(18), pack: 94, paidUsedToday: 20, paidLimit: 20, paidBackAt: at(14, 1), payments: true });
    expect(creditLineKind(a)).toBe("limit");
    expect(creditSpent(a)).toBe(`Today’s 20 paid credits are used. 94 more are banked · back at ${t(at(14, 1))}`);
    expect(creditSpent(a)).not.toContain(creditsCopy.getMore);
    // The free credit comes back first.
    expect(creditSpent({ ...a, reopensAt: at(9) })).toContain(`back at ${t(at(9))}`);
    // Every press form is the limit line, not "uses a credit".
    expect(creditFirst(a)).toBe(creditSpent(a));
    expect(creditAgain(a)).toBe(creditSpent(a));
    expect(creditStanding(a)).toBe(creditSpent(a));
  });

  it("L6: paid limit reached, a free credit ready: the free run is not blocked and the line names when paid is back", () => {
    const a = base({ used: 4, nextAt: at(6, 40), pack: 94, paidUsedToday: 20, paidLimit: 20, paidBackAt: at(14, 1) });
    expect(creditLineKind(a)).toBe("limitFree");
    expect(creditStanding(a)).toBe(`1 of 5 free · reset at ${t(at(6, 40))} · paid back at ${t(at(14, 1))} (daily limit)`);
    expect(creditFirst(a)).toBe(`Uses a credit. ${creditStanding(a)}.`);
  });

  it("L8: payments off for the reader: the free-only form, and paid forms if paid is held, never Get more credits", () => {
    const spent = base({ used: 5, payments: false });
    expect(creditSpent(spent)).toBe(creditsCopy.spent(5, spent.nextAt));
    expect(creditStanding(base({ plan: 5, payments: false }))).toContain("· 5 paid");
  });

  it("the paid limit never closes a line the free allowance can fund (mutation: asking only the paid rule would call this a limit)", () => {
    expect(creditLineKind(base({ used: 0, pack: 3, paidUsedToday: 20, paidLimit: 20, paidBackAt: at(14) }))).toBe("limitFree");
    expect(creditLineKind(base({ used: 0, pack: 3, paidUsedToday: 20, paidLimit: 20 }))).toBe("withPaid");
  });
});

describe("L7: a cancelled plan within three days", () => {
  const exp = (days: number) => new Date(NOW.getTime() + days * 86_400_000);
  const a = (days: number | null) => base({ used: 5, reopensAt: at(15), plan: 74, paidUsedToday: 0, paidLimit: 20, planExpiresAt: days === null ? null : exp(days) });

  it("appends the phrase to the L2 and L3 forms", () => {
    expect(creditStanding(a(2), NOW)).toMatch(/ · 74 plan credits expire Nov 16$/);
    expect(creditFirst({ ...a(2), used: 1 }, NOW)).toMatch(/ · 74 plan credits expire Nov 16\.$/);
  });

  it("warns at three days and not before, never for a plan that is not cancelled, never once it has lapsed", () => {
    expect(expiringPhrase(a(3), NOW)).not.toBeNull();
    expect(expiringPhrase(a(3.01), NOW)).toBeNull();
    expect(expiringPhrase(a(null), NOW)).toBeNull();
    expect(expiringPhrase(a(-1), NOW)).toBeNull();
  });

  it("never warns for packs", () => {
    expect(expiringPhrase({ ...a(1), plan: 0, pack: 40 }, NOW)).toBeNull();
  });

  it("matches the pattern CreditsText colours", () => {
    expect(creditsCopy.expiringPattern.test(creditCount(a(1), NOW))).toBe(true);
    expect(creditsCopy.expiring(1, exp(1))).toMatch(/^1 plan credit expires /);
  });
});
