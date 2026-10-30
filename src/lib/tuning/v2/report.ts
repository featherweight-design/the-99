import { chooseRefusal, shortReason, type V2RunReport, type ValidationReport } from "../validate";
import type { V2List, V2Report } from "./engine";

/**
 * What a v2 run stores about itself (spec §8), pure. `v2StartReport` is written with the pending row, so the
 * same-request check (G4) and the wait's per-list progress have a home from the first moment; `v2Outcome` turns the
 * engine's report into the run's final row and how its unit settles (`charge.ts`, plan P4).
 */

export function v2StartReport(args: {
  requestHash: string; restrictions: V2RunReport["restrictions"]; hadRequest: boolean; focus?: string; hadDescription?: boolean;
}): ValidationReport {
  return {
    askedCount: 0, survivedCount: 0, keptCount: 0, hadNotes: args.hadRequest,
    ...(args.hadDescription !== undefined ? { hadDescription: args.hadDescription } : {}),
    ...(args.focus ? { focus: args.focus } : {}),
    v2: {
      requestHash: args.requestHash,
      restrictions: { ...args.restrictions, sets: [...args.restrictions.sets] },
      in: { add: false, cut: false },
      refilling: { add: false, cut: false },
    },
  };
}

/** The restriction that bound a short list; an exhausted owned shortlist is the owned limit, whatever the drops say. */
const short = (list: V2List) => (list.kept.length < list.target ? (list.poolExhausted ? "notOwned" : shortReason(list.drops)) : null);

export function v2Outcome(report: V2Report, start: ValidationReport, capCents: number | null): {
  outcome: { status: "ok" } | { status: "failed"; errorClass: "ungrounded" };
  validationReport: ValidationReport;
  settleAs: "spent" | "refunded";
} {
  const { additions, cuts, charge } = report;
  const drops = [...additions.drops, ...cuts.drops];
  const kept = additions.kept.length + cuts.kept.length;
  const empty = additions.kept.length === 0;
  const refunded = charge.outcome === "refunded";
  const cutCall = report.calls.find((c) => c.stage === "cuts");
  const v2: V2RunReport = {
    ...start.v2!,
    ...(cutCall ? { cutAsk: cutCall.ask } : {}),
    in: { add: true, cut: true },
    refilling: { add: false, cut: false },
    callCount: report.callCount,
    refilled: { add: additions.refilled, cut: cuts.refilled },
    underProduced: { add: additions.underProduced, cut: cuts.underProduced },
    target: { add: additions.target, cut: cuts.target },
    shortReason: { add: short(additions), cut: short(cuts) },
    ...(additions.poolExhausted ? { poolExhausted: true as const } : {}),
    cutsFailed: report.cutsFailed,
    budgetReached: report.budgetReached,
    charge,
  };
  return {
    outcome: empty ? { status: "failed", errorClass: "ungrounded" } : { status: "ok" },
    validationReport: {
      ...start,
      askedCount: report.calls.reduce((n, c) => n + c.ask, 0),
      survivedCount: kept,
      keptCount: kept,
      drops,
      ...(report.strippedCites > 0 ? { strippedCites: report.strippedCites } : {}),
      ...(refunded && !empty ? { refunded: true as const } : {}),
      ...(empty ? { refusal: chooseRefusal(drops, capCents) } : {}),
      v2,
    },
    settleAs: refunded ? "refunded" : "spent",
  };
}
