import { describe, expect, it } from "vitest";
import type { Allowance } from "../model/allowance-rule";
import { creditsCopy } from "../copy/credits";
import { chipFor } from "./chip-rule";

const NOW = new Date("2026-11-14T12:00:00Z");
const a = (over: Partial<Allowance> = {}): Allowance => ({ used: 2, limit: 5, nextAt: null, reopensAt: null, ...over });
const chip = (allowance: Allowance, switchOn = true, everBought = false) => chipFor({ allowance, switchOn, everBought }, NOW);

describe("the menu chip (M1b)", () => {
  it("holding credits: free plus plan plus packs", () => {
    expect(chip(a({ used: 1, plan: 74, pack: 39 }), true, true)).toEqual({ kind: "credits", label: "117 credits", line: null, hollow: false });
  });

  it("never bought, payments on: the free credits alone", () => {
    expect(chip(a())).toEqual({ kind: "free", label: "3 free credits", line: null, hollow: false });
  });

  it("absent with payments off and nothing held or bought (O1)", () => {
    expect(chip(a(), false, false)).toBeNull();
  });

  it("kept, as a count, once credits are held or were bought and payments are off (O2 to O4)", () => {
    expect(chip(a({ plan: 10 }), false, true)).toMatchObject({ kind: "credits", label: "13 credits" });
    expect(chip(a({ used: 5 }), false, true)).toMatchObject({ kind: "credits", label: "0 credits", hollow: true });
  });

  it("out of credits: hollow diamond and Get more credits, only while payments are on", () => {
    expect(chip(a({ used: 5 }))).toEqual({ kind: "out", label: "Get more credits", line: null, hollow: true });
  });

  it("at the paid limit with credits banked is NOT out: the banked count stands", () => {
    expect(chip(a({ used: 5, pack: 94, paidUsedToday: 20, paidLimit: 20 }), true, true)).toMatchObject({ kind: "credits", label: "94 credits" });
  });

  it("plan credits expiring within 3 days: the count, and the words on a line under it", () => {
    const planExpiresAt = new Date(NOW.getTime() + 2 * 86_400_000);
    expect(chip(a({ used: 5, plan: 74, planExpiresAt }), true, true)).toEqual({ kind: "expiring", label: "74 credits", line: "74 plan credits expire Nov 16", hollow: false });
  });

  it("does not warn four days out", () => {
    const planExpiresAt = new Date(NOW.getTime() + 4 * 86_400_000);
    expect(chip(a({ plan: 74, planExpiresAt }), true, true)?.kind).toBe("credits");
  });

  it("says 1 credit in the singular", () => {
    expect(creditsCopy.chip.credits(1)).toBe("1 credit");
    expect(creditsCopy.chip.free(1)).toBe("1 free credit");
    expect(creditsCopy.chip.credits(117)).toBe("117 credits");
  });
});
