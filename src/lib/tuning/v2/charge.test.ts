import { describe, expect, it } from "vitest";

import { chargeFor, type ListOutcome } from "./charge";

const full = (target: number): ListOutcome => ({ kept: target, target, drops: [] });
const drops = (...rules: string[]) => rules.map((rule) => ({ rule })) as ListOutcome["drops"];

// Every row of spec 2026-10-27 §9's refund list, plus plan P4 (a failed cut call).
describe("chargeFor", () => {
  it("charges a run whose two lists both reach their target", () => {
    expect(chargeFor({ additions: full(10), cuts: full(10) })).toEqual({ outcome: "spent" });
    expect(chargeFor({ additions: { kept: 15, target: 10, drops: drops("citation") }, cuts: full(10) })).toEqual({ outcome: "spent" });
  });

  it("charges a short list whose shortfall the player's own restrictions cover", () => {
    const capped = { kept: 7, target: 10, drops: drops("overCap", "overCap", "offSet", "notOwned") };
    expect(chargeFor({ additions: capped, cuts: full(7) })).toEqual({ outcome: "spent" });
    // The bracket choice is the player's own restriction too (d9, 2026-10-28).
    expect(chargeFor({ additions: full(5), cuts: { kept: 4, target: 5, drops: drops("bracketAim") } })).toEqual({ outcome: "spent" });
  });

  it("refunds under-production the drops do not explain", () => {
    expect(chargeFor({ additions: { kept: 6, target: 10, drops: drops("overCap") }, cuts: full(6) }).outcome).toBe("refunded");
    expect(chargeFor({ additions: { kept: 8, target: 10, drops: [] }, cuts: full(8) }).outcome).toBe("refunded");
  });

  it("refunds a short list whose refill under-produced, even when restriction drops outnumber the shortfall", () => {
    // N=10: 7 kept with 8 over the cap, then the refill returned 2 of the 3 asked (Copilot round 3).
    const mixed = { kept: 9, target: 10, drops: drops(...Array(8).fill("overCap")), underProduced: true };
    expect(chargeFor({ additions: mixed, cuts: full(9) })).toEqual({ outcome: "refunded", why: "shortByModel" });
    // A list that still reached its target is charged whatever its calls returned.
    expect(chargeFor({ additions: { ...full(10), underProduced: true }, cuts: full(10) })).toEqual({ outcome: "spent" });
  });

  it("charges a short additions list whose owned shortlist was exhausted, however few lines the model wrote", () => {
    // Owned only, 4 owned cards fit: the model named 3 and one was dropped as not owned; nothing was left to ask for.
    const spent = { kept: 3, target: 10, drops: drops("notOwned"), underProduced: true, poolExhausted: true };
    expect(chargeFor({ additions: spent, cuts: full(3) })).toEqual({ outcome: "spent" });
    // A model-caused drop on it is still the model's shortfall.
    expect(chargeFor({ additions: { ...spent, drops: drops("notOwned", "citation") }, cuts: full(3) })).toEqual({ outcome: "refunded", why: "shortByModel" });
    // Not exhausted, the same list is refunded.
    expect(chargeFor({ additions: { ...spent, poolExhausted: false }, cuts: full(3) })).toEqual({ outcome: "refunded", why: "shortByModel" });
  });

  it("refunds a short list with any model-caused drop, even beside restriction drops", () => {
    const mixed = { kept: 8, target: 10, drops: drops("overCap", "overCap", "citation") };
    expect(chargeFor({ additions: mixed, cuts: full(8) })).toEqual({ outcome: "refunded", why: "shortByModel" });
  });

  it("ignores model drops on a list that still reached its target", () => {
    expect(chargeFor({ additions: full(3), cuts: { kept: 3, target: 3, drops: drops("keyCard", "denominator") } })).toEqual({ outcome: "spent" });
  });

  it("refunds a run the budget cut short, even when restriction drops cover the shortfall", () => {
    const capped = { kept: 1, target: 2, drops: drops("bracketAim", "bracketAim") };
    expect(chargeFor({ additions: full(2), cuts: capped, budgetReached: true })).toEqual({ outcome: "refunded", why: "budget" });
  });

  it("refunds a failed cut call and a run with no additions", () => {
    expect(chargeFor({ additions: full(5), cuts: { kept: 0, target: 5, drops: [] }, cutsFailed: true })).toEqual({ outcome: "refunded", why: "cutsFailed" });
    expect(chargeFor({ additions: { kept: 0, target: 5, drops: drops("overCap") }, cuts: { kept: 0, target: 0, drops: [] } })).toEqual({ outcome: "refunded", why: "ungrounded" });
  });
});
