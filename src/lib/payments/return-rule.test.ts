import { describe, expect, it } from "vitest";
import { decideReturn, isInvoiceId, isSessionId } from "./return-rule";

const mine = { metadata: { app: "the-99", pack: "pack40", user_id: "user_a" }, paymentStatus: "paid" };

describe("decideReturn", () => {
  it("is processing for the viewer's own paid Session with no grant yet, sized by the pack", () => {
    expect(decideReturn(mine, "user_a", null)).toEqual({ kind: "processing", units: 40 });
  });

  it("is added, at the GRANT's units, once the viewer's grant exists", () => {
    expect(decideReturn(mine, "user_a", 40)).toEqual({ kind: "added", units: 40 });
    expect(decideReturn(mine, "user_a", 25)).toEqual({ kind: "added", units: 25 });
  });

  it("is none for another reader's Session: a forged session_id draws no band", () => {
    expect(decideReturn(mine, "user_b", null)).toEqual({ kind: "none" });
    expect(decideReturn(mine, "user_b", 40)).toEqual({ kind: "none" });
  });

  it("is none for a Session that is not this app's, or missing its facts", () => {
    expect(decideReturn({ ...mine, metadata: { ...mine.metadata, app: "concert-crawl" } }, "user_a", 40)).toEqual({ kind: "none" });
    expect(decideReturn({ ...mine, metadata: {} }, "user_a", null)).toEqual({ kind: "none" });
    expect(decideReturn({ ...mine, metadata: null }, "user_a", null)).toEqual({ kind: "none" });
    expect(decideReturn({ ...mine, metadata: { app: "the-99", pack: "pack40" } }, "user_a", null)).toEqual({ kind: "none" });
    expect(decideReturn(mine, "", null)).toEqual({ kind: "none" });
  });

  it("is none for a pack the registry does not sell", () => {
    for (const pack of ["pack999", "toString", "", undefined]) {
      expect(decideReturn({ ...mine, metadata: { app: "the-99", user_id: "user_a", ...(pack === undefined ? {} : { pack }) } }, "user_a", 40)).toEqual({ kind: "none" });
    }
  });

  it("does not claim processing for a Session that is not paid", () => {
    expect(decideReturn({ ...mine, paymentStatus: "unpaid" }, "user_a", null)).toEqual({ kind: "none" });
  });
});

describe("decideReturn: a plan's Session", () => {
  const plan = { metadata: { app: "the-99", plan: "plan50", user_id: "user_a" }, paymentStatus: "paid" };
  it("is processing, sized by the plan, until the first invoice's lot exists, then added at the lot's units", () => {
    expect(decideReturn(plan, "user_a", null)).toEqual({ kind: "processing", units: 50, plan: true });
    expect(decideReturn(plan, "user_a", 50)).toEqual({ kind: "added", units: 50, plan: true });
  });
  it("keeps the same refusals: another reader, another app, an unknown plan, an unpaid Session", () => {
    expect(decideReturn(plan, "user_b", 50)).toEqual({ kind: "none" });
    expect(decideReturn({ ...plan, metadata: { ...plan.metadata, app: "concert-crawl" } }, "user_a", 50)).toEqual({ kind: "none" });
    expect(decideReturn({ ...plan, metadata: { app: "the-99", plan: "plan999", user_id: "user_a" } }, "user_a", 50)).toEqual({ kind: "none" });
    expect(decideReturn({ ...plan, paymentStatus: "unpaid" }, "user_a", null)).toEqual({ kind: "none" });
  });
});

describe("isSessionId", () => {
  it("accepts Stripe's shape and nothing else", () => {
    expect(isSessionId("cs_test_a1B2c3")).toBe(true);
    for (const v of ["", "cs_", "pi_123", "cs_test/../x", ["cs_test_1"], null, 5, `cs_${"a".repeat(300)}`]) expect(isSessionId(v)).toBe(false);
  });
});


describe("isInvoiceId", () => {
  it("accepts an invoice id as Stripe writes it and nothing else", () => {
    expect(isInvoiceId("in_1QabcXYZ")).toBe(true);
    for (const v of ["cs_1", "in_", "in_a b", "in_/x", "", undefined, 5]) expect(isInvoiceId(v)).toBe(false);
  });
});
