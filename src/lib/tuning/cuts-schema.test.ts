import { describe, expect, it } from "vitest";

import { cutsResponseSchema } from "./cuts-schema";

const cut = { name: "Bear", reason: "Off the list.", cites: [{ kind: "offList" }] };

describe("cutsResponseSchema", () => {
  it("accepts 1 to over cuts and refuses 0 or more than over", () => {
    const s = cutsResponseSchema(2);
    expect(s.safeParse({ cuts: [cut] }).success).toBe(true);
    expect(s.safeParse({ cuts: [cut, cut] }).success).toBe(true);
    expect(s.safeParse({ cuts: [] }).success).toBe(false);
    expect(s.safeParse({ cuts: [cut, cut, cut] }).success).toBe(false);
  });

  it("holds a reason to 200 characters and needs a cite", () => {
    const s = cutsResponseSchema(1);
    expect(s.safeParse({ cuts: [{ ...cut, reason: "x".repeat(201) }] }).success).toBe(false);
    expect(s.safeParse({ cuts: [{ ...cut, cites: [] }] }).success).toBe(false);
  });

  it("types each cite kind's fields", () => {
    const s = cutsResponseSchema(1);
    const ok = (c: object) => s.safeParse({ cuts: [{ ...cut, cites: [c] }] }).success;
    expect(ok({ kind: "inclusion", pct: 12 })).toBe(true);
    expect(ok({ kind: "inclusion" })).toBe(false);
    expect(ok({ kind: "role", role: "ramp", have: 12, target: 10 })).toBe(true);
    expect(ok({ kind: "role", role: "bogus", have: 1, target: 1 })).toBe(false);
    expect(ok({ kind: "curve", cmc: 3, have: 30 })).toBe(true);
    expect(ok({ kind: "flag", flag: "combo" })).toBe(true);
    expect(ok({ kind: "intent" })).toBe(true);
    expect(ok({ kind: "games" })).toBe(false);
  });
});
