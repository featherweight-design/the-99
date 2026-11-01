import { describe, expect, it } from "vitest";

import { creditsCopy } from "../copy/credits";
import { bareStanding, closedBy, formLine, lineOf, standingLine, toStanding, type Standing } from "./standing";

const base = { used: 1, limit: 5, nextAt: "2026-10-12T02:01:00.000Z", reopensAt: null, ownerShare: false, now: "2026-10-11T12:00:00.000Z" };

describe("the form's credit line", () => {
  it("closes on the owner's share first, then spent", () => {
    expect(closedBy({ ...base, used: 5, ownerShare: true })).toBe("ownerShare");
    expect(closedBy({ ...base, used: 5 })).toBe("spent");
    expect(closedBy(base)).toBeNull();
    // A paid lot keeps the press open once the free allowance is spent, behind the owner's share.
    expect(closedBy({ ...base, used: 5, plan: 2 })).toBeNull();
    expect(closedBy({ ...base, used: 5, plan: 2, ownerShare: true })).toBe("ownerShare");
    // Paused (the model-call switch) closes ahead of the owner's share and every credit, with its own line.
    expect(closedBy({ ...base, ownerShare: true, paused: true })).toBe("paused");
    expect(closedBy({ ...base, plan: 2, paused: true })).toBe("paused");
    expect(standingLine({ ...base, paused: true })).toBe(creditsCopy.paused);
    expect(formLine({ ...base, paused: true })).toBe(creditsCopy.paused);
    // Open on a paid lot with more units out than the limit: the free count never reads below zero.
    expect(standingLine({ ...base, used: 7, pack: 3 })).not.toMatch(/-\d/);
  });

  it("names when a credit comes back as the results do: the oldest unit's leaving, past the limit", () => {
    const over = { ...base, used: 6, nextAt: "2026-10-12T01:00:00.000Z", reopensAt: "2026-10-12T03:00:00.000Z" };
    expect(formLine(over)).toMatch(/^Won’t be read: 0 of 5 left · reset at /);
    expect(formLine(over)).toBe(formLine({ ...over, nextAt: over.reopensAt }));
    expect(formLine(over)).not.toBe(formLine({ ...over, reopensAt: null }));
  });

  it("never counts below zero, and names the oldest unit's leaving, on every bare line (7l)", () => {
    const over = { ...base, used: 6, nextAt: "2026-10-12T01:00:00.000Z", reopensAt: "2026-10-12T03:00:00.000Z" };
    expect(bareStanding(over)).toMatch(/^0 of 5 left · reset at /);
    expect(bareStanding(over)).toBe(bareStanding({ ...over, used: 5, nextAt: over.reopensAt }));
  });
});

describe("the paid limit reaches the form", () => {
  it("toStanding carries the counter, so a player at the paid limit reads spent", () => {
    const allowance = { used: 5, limit: 5, reopensAt: new Date("2026-10-12T03:00:00Z"), nextAt: null, pack: 9, paidUsedToday: 20, paidLimit: 20 };
    expect(closedBy(toStanding(allowance, new Date()))).toBe("spent");
    expect(closedBy(toStanding({ ...allowance, paidUsedToday: 19 }, new Date()))).toBeNull();
  });
});

describe("the paid forms (U2b)", () => {
  const s = (over: Partial<Standing> = {}): Standing => ({ used: 5, limit: 5, nextAt: null, reopensAt: "2026-10-17T20:01:00.000Z", ownerShare: false, now: "2026-10-17T12:00:00.000Z", ...over });

  it("L3: free spent with paid held opens the press and says it uses a paid credit", () => {
    expect(closedBy(s({ pack: 114, paidUsedToday: 0, paidLimit: 20 }))).toBeNull();
    expect(standingLine(s({ pack: 114, paidUsedToday: 0, paidLimit: 20 }))).toMatch(/^Uses a paid credit\. 0 of 5 free · reset at .+ · 114 paid\.$/);
  });

  it("L5: at the paid limit the form closes and says the limit, not Get more credits", () => {
    const at = s({ pack: 94, paidUsedToday: 20, paidLimit: 20, paidBackAt: "2026-10-18T08:01:00.000Z", payments: true });
    expect(closedBy(at)).toBe("spent");
    expect(formLine(at)).toMatch(/^Today’s 20 paid credits are used\. 94 more are banked/);
    expect(formLine(at)).not.toContain("Get more credits");
  });

  it("L5: the results lines (bareStanding) say the limit too, with the paid reset earlier than the free one", () => {
    const at = s({ pack: 94, paidUsedToday: 20, paidLimit: 20, paidBackAt: "2026-10-17T14:00:00.000Z", nextAt: "2026-10-17T20:01:00.000Z", reopensAt: "2026-10-17T20:01:00.000Z" });
    expect(bareStanding(at)).toMatch(/^Today’s 20 paid credits are used\. 94 more are banked · back at /);
    expect(bareStanding(at)).not.toMatch(/of 5/);
  });

  it("L4: spent with payments on puts Get more credits under the form's line; off, it is as shipped", () => {
    expect(formLine(s({ payments: true }))).toMatch(/\nGet more credits$/);
    expect(formLine(s({ payments: false }))).not.toContain("Get more credits");
    expect(formLine(s())).not.toContain("Get more credits");
  });
});

describe("a welcome lot rides the Standing (D1)", () => {
  it("round-trips through toStanding and lineOf, so the client line sees it as held", () => {
    const now = new Date("2026-10-18T12:00:00Z");
    const welcomeExpiresAt = new Date("2026-11-17T12:00:00Z");
    const s = toStanding({ used: 5, limit: 5, nextAt: null, reopensAt: now, welcome: 15, welcomeExpiresAt }, now);
    expect(s.welcome).toBe(15);
    expect(lineOf(s).welcome).toBe(15);
    // The lot's date rides too, so the client line can draw its expiring tail (welcome credits G3).
    expect(s.welcomeExpiresAt).toBe(welcomeExpiresAt.toISOString());
    expect(lineOf(s).welcomeExpiresAt).toEqual(welcomeExpiresAt);
  });
});
