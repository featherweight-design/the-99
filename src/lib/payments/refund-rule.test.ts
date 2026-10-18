import { describe, expect, it } from "vitest";
import { applyRevocation, claimCents, disputeStatusOf, heldOnGrant, planDispute, refundTarget } from "./refund-rule";

describe("refundTarget", () => {
  it("is the whole lot for a full refund", () => expect(refundTarget(40, 500, 500)).toBe(40));
  it("is proportional, rounded up, for a partial refund", () => {
    expect(refundTarget(40, 500, 250)).toBe(20);
    expect(refundTarget(40, 500, 101)).toBe(9); // 8.08 -> 9
  });
  it("is cumulative: the same figure however often it is delivered, and a later higher one wins", () => {
    expect(refundTarget(40, 500, 250)).toBe(refundTarget(40, 500, 250));
    expect(refundTarget(40, 500, 400)).toBeGreaterThan(refundTarget(40, 500, 250));
  });
  it("is never above the lot, even for an over-reported refund", () => expect(refundTarget(40, 500, 900)).toBe(40));
  it("rounds a tiny pack up, never to zero for a real refund", () => {
    expect(refundTarget(1, 500, 1)).toBe(1);
    expect(refundTarget(3, 500, 1)).toBe(1);
  });
  it("is zero for nothing refunded or a bad amount", () => {
    expect(refundTarget(40, 500, 0)).toBe(0);
    expect(refundTarget(40, 0, 100)).toBe(0);
  });
});

describe("applyRevocation", () => {
  it("revokes the target when nothing is spent", () => expect(applyRevocation({ units: 40, revoked: 0, held: 0, target: 40 })).toEqual({ revoked: 40, unrecovered: 0 }));
  it("is capped by what is spent or in flight, and records the shortfall", () => {
    expect(applyRevocation({ units: 40, revoked: 0, held: 15, target: 40 })).toEqual({ revoked: 25, unrecovered: 15 });
  });
  it("never lowers an existing revocation", () => {
    expect(applyRevocation({ units: 40, revoked: 30, held: 0, target: 10 })).toEqual({ revoked: 30, unrecovered: 0 });
  });
  it("converges on a replay and on out-of-order partials", () => {
    const first = applyRevocation({ units: 40, revoked: 0, held: 5, target: 20 });
    expect(applyRevocation({ units: 40, revoked: first.revoked, held: 5, target: 20 })).toEqual(first);
    const big = applyRevocation({ units: 40, revoked: 0, held: 5, target: 30 });
    expect(applyRevocation({ units: 40, revoked: big.revoked, held: 5, target: 20 }).revoked).toBe(30);
  });
  it("never goes above the lot", () => expect(applyRevocation({ units: 40, revoked: 0, held: 0, target: 99 }).revoked).toBe(40));
  it("a fully spent lot revokes nothing and the whole target is the shortfall", () => {
    expect(applyRevocation({ units: 40, revoked: 0, held: 40, target: 40 })).toEqual({ revoked: 0, unrecovered: 40 });
  });
});

describe("heldOnGrant", () => {
  const now = new Date("2026-10-17T12:00:00Z");
  it("counts spent and young reserved rows, not old reserved or refunded", () => {
    const old = new Date(now.getTime() - 3_600_000);
    const young = new Date(now.getTime() - 60_000);
    expect(heldOnGrant([
      { status: "spent", createdAt: old }, { status: "reserved", createdAt: young },
      { status: "reserved", createdAt: old }, { status: "refunded", createdAt: young },
    ], now)).toBe(2);
  });
});

describe("planDispute", () => {
  it("opens a row in the current state when there is none", () => {
    expect(planDispute(null, "open")).toEqual({ kind: "open", status: "open" });
    expect(planDispute(null, "won")).toEqual({ kind: "open", status: "won" });
  });
  it("restores exactly what the dispute took when it is won", () => expect(planDispute({ status: "open", unitsRevoked: 7 }, "won")).toEqual({ kind: "restore", units: 7 }));
  it("leaves an open dispute alone", () => expect(planDispute({ status: "open", unitsRevoked: 7 }, "open")).toEqual({ kind: "none" }));
  it("loses on a lost close", () => expect(planDispute({ status: "open", unitsRevoked: 7 }, "lost")).toEqual({ kind: "lose" }));
  it("treats a final dispute as final", () => {
    expect(planDispute({ status: "won", unitsRevoked: 7 }, "open")).toEqual({ kind: "none" });
    expect(planDispute({ status: "lost", unitsRevoked: 7 }, "won")).toEqual({ kind: "none" });
  });
});

describe("disputeStatusOf", () => {
  it("maps Stripe's statuses", () => {
    expect(disputeStatusOf("won")).toBe("won");
    expect(disputeStatusOf("warning_closed")).toBe("won");
    expect(disputeStatusOf("lost")).toBe("lost");
    expect(disputeStatusOf("needs_response")).toBe("open");
  });
});

describe("claimCents", () => {
  it("never goes down: the larger of what is stored and what was fetched, never negative", () => {
    expect(claimCents(500, 250)).toBe(500);
    expect(claimCents(250, 500)).toBe(500);
    expect(claimCents(0, -5)).toBe(0);
  });
});
