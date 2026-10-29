import { describe, expect, it } from "vitest";

import type { Drop } from "../validate";
import type { V2Line, V2List, V2Report } from "./engine";
import { v2Outcome, v2StartReport } from "./report";

const line = (id: string, position: number): V2Line => ({
  addOracleId: id, cutOracleId: null, rationale: "r", rationaleShort: "s", evidence: [], position, bracketAfter: null, card: id,
});
const list = (kept: number, target: number, drops: Drop["rule"][] = [], extra: Partial<V2List> = {}): V2List => ({
  kept: Array.from({ length: kept }, (_, i) => line(`c${i}`, i)),
  drops: drops.map((rule, position) => ({ rule, position, side: "add" as const })),
  target, refilled: false, overAsk: 0, underProduced: false, ...extra,
});
const start = v2StartReport({ requestHash: "h", restrictions: { capCents: 200, sets: ["mh3"], ownedOnly: false }, hadRequest: true, focus: "tokens" });
const report = (over: Partial<V2Report>): V2Report => ({
  additions: list(5, 5), cuts: { ...list(5, 5), skipped: false },
  calls: [{ stage: "additions", ask: 8, ok: true, ms: 1, lines: 8, kept: 5, malformed: 0 }, { stage: "cuts", ask: 8, ok: true, ms: 1, lines: 8, kept: 5, malformed: 0 }],
  callCount: 2, cutsFailed: null, budgetReached: false, strippedCites: 0, charge: { outcome: "spent" }, ...over,
});

describe("v2StartReport", () => {
  it("starts with the request hash, the restrictions snapshot and both lists out", () => {
    expect(start).toEqual({
      askedCount: 0, survivedCount: 0, keptCount: 0, hadNotes: true, focus: "tokens",
      v2: { requestHash: "h", restrictions: { capCents: 200, sets: ["mh3"], ownedOnly: false }, in: { add: false, cut: false }, refilling: { add: false, cut: false } },
    });
  });
});

describe("v2Outcome", () => {
  it("settles a full run ok and spent, with both lists in", () => {
    const r = v2Outcome(report({}), start, 200);
    expect(r.outcome).toEqual({ status: "ok" });
    expect(r.settleAs).toBe("spent");
    expect(r.validationReport).toMatchObject({ askedCount: 16, keptCount: 10, survivedCount: 10, drops: [] });
    expect(r.validationReport.refunded).toBeUndefined();
    expect(r.validationReport.v2).toMatchObject({
      requestHash: "h", in: { add: true, cut: true }, callCount: 2, target: { add: 5, cut: 5 }, shortReason: { add: null, cut: null },
    });
  });

  it("keeps the cut call's ask, and stores none for a run whose cut call never ran", () => {
    const calls = [{ stage: "additions" as const, ask: 15, ok: true, ms: 1, lines: 15, kept: 6, malformed: 0 },
      { stage: "cuts" as const, ask: 15, ok: true, ms: 1, lines: 15, kept: 9, malformed: 0 },
      { stage: "cutsRefill" as const, ask: 2, ok: true, ms: 1, lines: 2, kept: 2, malformed: 0 }];
    expect(v2Outcome(report({ calls }), start, 200).validationReport.v2!.cutAsk).toBe(15);
    expect(v2Outcome(report({ calls: calls.slice(0, 1) }), start, 200).validationReport.v2!.cutAsk).toBeUndefined();
  });

  it("names the restriction that bound a short list, and keeps the charge", () => {
    const r = v2Outcome(report({ additions: list(3, 5, ["overCap", "overCap", "offSet"]), charge: { outcome: "spent" } }), start, 200);
    expect(r.validationReport.v2!.shortReason).toEqual({ add: "overCap", cut: null });
    expect(r.validationReport.drops).toHaveLength(3);
    expect(r.settleAs).toBe("spent");
  });

  it("plan P4: a failed cut call is ok, shown, and refunded", () => {
    const r = v2Outcome(report({ cuts: { ...list(0, 5), skipped: false }, cutsFailed: { errorClass: "timeout" }, charge: { outcome: "refunded", why: "cutsFailed" } }), start, null);
    expect(r.outcome).toEqual({ status: "ok" });
    expect(r.settleAs).toBe("refunded");
    expect(r.validationReport).toMatchObject({ refunded: true, v2: { cutsFailed: { errorClass: "timeout" } } });
  });

  it("an empty run fails ungrounded, refunded, with the refusal sentence's detail", () => {
    const r = v2Outcome(report({ additions: list(0, 5, ["cardExists"]), cuts: { ...list(0, 0), skipped: true }, charge: { outcome: "refunded", why: "ungrounded" } }), start, null);
    expect(r.outcome).toEqual({ status: "failed", errorClass: "ungrounded" });
    expect(r.settleAs).toBe("refunded");
    expect(r.validationReport.refusal).toEqual({ reason: "nothingLeft" });
    expect(r.validationReport.refunded).toBeUndefined();
  });
});
