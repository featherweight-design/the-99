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
    expect(creditStanding(a)).toBe(`4 of 5 free · reset at ${t(a.nextAt!)} · 114\u00a0paid`);
    expect(creditFirst(a)).toBe(`Uses a credit. 4 of 5 free · reset at ${t(a.nextAt!)} · 114\u00a0paid.`);
  });

  it("L3: free spent, paid held: the line says the next run uses a paid credit and the press stays live", () => {
    const a = base({ used: 5, reopensAt: at(15), pack: 114, paidUsedToday: 0, paidLimit: 20 });
    expect(creditLineKind(a)).toBe("paidNext");
    expect(creditStanding(a)).toBe(`0 of 5 free · reset at ${t(at(15))} · this run uses 1 of 114\u00a0paid`);
    expect(creditFirst(a)).toBe(`Uses a paid credit. 0 of 5 free · reset at ${t(at(15))} · 114\u00a0paid.`);
    expect(creditAgain(a)).toBe(`Replaces these suggestions and uses a paid credit. 0 of 5 free · reset at ${t(at(15))} · 114\u00a0paid.`);
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
    expect(creditStanding(base({ plan: 5, payments: false }))).toContain("· 5\u00a0paid");
  });

  it("the paid limit never closes a line the free allowance can fund (mutation: asking only the paid rule would call this a limit)", () => {
    expect(creditLineKind(base({ used: 0, pack: 3, paidUsedToday: 20, paidLimit: 20, paidBackAt: at(14) }))).toBe("limitFree");
    expect(creditLineKind(base({ used: 0, pack: 3, paidUsedToday: 20, paidLimit: 20 }))).toBe("withPaid");
  });
});

describe("L7: a cancelled plan within three days", () => {
  const exp = (days: number) => new Date(NOW.getTime() + days * 86_400_000);
  const a = (days: number | null) => base({ used: 5, reopensAt: at(15), plan: 74, planExpiring: 74, paidUsedToday: 0, paidLimit: 20, planExpiresAt: days === null ? null : exp(days) });

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

  it("warns with the credits that lapse on the date, not the whole plan balance", () => {
    expect(expiringPhrase({ ...a(2), plan: 120, planExpiring: 60 }, NOW)).toMatch(/^60 plan credits expire /);
  });

  it("never warns for packs", () => {
    expect(expiringPhrase({ ...a(1), plan: 0, planExpiring: 0, pack: 40 }, NOW)).toBeNull();
  });

  it("matches the pattern CreditsText colours", () => {
    expect(creditsCopy.expiringPattern.test(creditCount(a(1), NOW))).toBe(true);
    expect(creditsCopy.expiring(1, exp(1))).toMatch(/^1 plan credit expires /);
  });
});

describe("welcome credits on the line (D2, Line-and-Chip W1 to W6)", () => {
  const EXP = new Date("2026-11-20T12:00:00Z");
  const near = new Date(EXP.getTime() - 2 * 86_400_000);
  const day = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const w = (over: Partial<LineAllowance> = {}) =>
    base({ used: 0, limit: 1, nextAt: null, welcome: 15, welcomeExpiresAt: EXP, paidUsedToday: 0, paidLimit: 20, ...over });

  it("W1: a free credit left, welcome held: its own segment, never paid", () => {
    expect(creditStanding(w())).toBe("1 of 1 free · 15 welcome");
    expect(creditFirst(w())).toBe("Uses a credit. 1 of 1 free · 15 welcome.");
  });

  it("W2: free spent, the run takes a welcome credit: L3's form, and first says so", () => {
    const a = w({ used: 1, reopensAt: at(2, 1) });
    expect(creditLineKind(a)).toBe("paidNext");
    expect(creditStanding(a)).toBe(`0 of 1 free · reset at ${t(at(2, 1))} · this run uses 1 of 15 welcome`);
    expect(creditFirst(a)).toBe(`Uses a welcome credit. 0 of 1 free · reset at ${t(at(2, 1))} · 15 welcome.`);
    expect(creditAgain(a)).toBe(`Replaces these suggestions and uses a welcome credit. 0 of 1 free · reset at ${t(at(2, 1))} · 15 welcome.`);
  });

  it("W3: welcome and paid held, in spend order; paid is held less welcome, a gift still counted in it", () => {
    const a = w({ used: 1, reopensAt: at(2, 1), welcome: 9, pack: 38, gift: 2 });
    expect(creditStanding(a)).toBe(`0 of 1 free · reset at ${t(at(2, 1))} · this run uses 1 of 9 welcome · 40 paid`);
    expect(creditCount({ ...a, used: 0, reopensAt: null })).toBe("1 of 1 free · 9 welcome · 40 paid");
  });

  it("W4: within three days the welcome tail, in the reader's own day, after the lots (and before a plan's, G5)", () => {
    const a = w({ used: 1, reopensAt: at(2, 1), welcome: 9 });
    expect(creditStanding(a, near)).toBe(`0 of 1 free · reset at ${t(at(2, 1))} · this run uses 1 of 9 welcome · 9 welcome credits expire ${day(EXP)}`);
    expect(creditFirst(a, near)).toMatch(/ · 9 welcome credits expire [A-Z][a-z]{2} \d{1,2}\.$/);
    // Four days out, used up, or with no date: no tail.
    expect(creditStanding(a, new Date(EXP.getTime() - 4 * 86_400_000))).not.toContain("expire");
    expect(creditStanding({ ...a, welcomeExpiresAt: null }, near)).not.toContain("expire");
    const both = { ...a, plan: 74, planExpiring: 74, planExpiresAt: new Date(EXP.getTime() - 86_400_000) };
    expect(creditStanding(both, near)).toMatch(/ · 9 welcome credits expire [A-Z][a-z]{2} \d{1,2} · 74 plan credits expire Nov 19$/);
    expect(creditsCopy.welcomeExpiringPattern.exec(creditStanding(a, near))?.[1]).toBe(`9 welcome credits expire ${day(EXP)}`);
    expect(creditsCopy.welcomeExpiring(1, EXP)).toBe(`1 welcome credit expires ${day(EXP)}`);
  });

  it("W5: welcome used up and nothing else held: the shipped L4, no trace of the lot", () => {
    const a = w({ used: 1, reopensAt: at(2, 1), welcome: 0, payments: true });
    expect(creditLineKind(a)).toBe("spent");
    expect(creditSpent(a)).toBe(`${creditsCopy.spent(1, at(2, 1))}\n${creditsCopy.getMore}`);
  });

  it("W6: the paid limit names welcome among what is banked", () => {
    const a = w({ used: 1, reopensAt: at(2, 1), welcome: 9, pack: 21, paidUsedToday: 20, paidBackAt: at(2, 1) });
    expect(creditLineKind(a)).toBe("limit");
    expect(creditSpent(a)).toBe(`Today’s 20 credit runs are used. 9 welcome and 21 paid are banked · back at ${t(at(2, 1))}`);
    expect(creditSpent({ ...a, pack: 0 })).toBe(`Today’s 20 credit runs are used. 9 welcome credits are banked · back at ${t(at(2, 1))}`);
  });

  it("a paid run after the welcome lot is spent is a paid run again", () => {
    const a = w({ used: 1, reopensAt: at(2, 1), welcome: 0, pack: 40 });
    expect(creditStanding(a)).toBe(`0 of 1 free · reset at ${t(at(2, 1))} · this run uses 1 of 40 paid`);
    expect(creditFirst(a)).toMatch(/^Uses a paid credit\. /);
  });
});
