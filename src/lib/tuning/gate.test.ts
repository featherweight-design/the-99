import { describe, expect, it } from "vitest";

import { MODEL_FRIEND_DAILY_ALLOWANCE, type Allowance } from "../model/allowance-rule";
import { lockedCardsCopy } from "../copy/locked-cards";
import { gateReason } from "./gate";
import type { TuningRun, TuningState } from "./state";

const at = new Date("2026-09-07T10:00:00Z");
const run = (status: TuningRun["status"], errorClass: string | null = null): TuningRun => ({
  id: "run_1", status, errorClass, createdAt: at, droppedCount: 0,
});
const open: Allowance = { used: 0, limit: MODEL_FRIEND_DAILY_ALLOWANCE, reopensAt: null, nextAt: null };
const spent: Allowance = { used: MODEL_FRIEND_DAILY_ALLOWANCE, limit: MODEL_FRIEND_DAILY_ALLOWANCE, reopensAt: at, nextAt: at };

// A deck that has never generated, and has no games: neither is a reason to refuse.
const fresh: TuningState = {
  run: null, items: [], itemsValidationReport: null, lastOkFingerprint: null, lastOkAt: null,
  stale: true, modelVersionMoved: false, retired: null, allowance: open, gameCount: 0, newestPriceAsOf: null,
};
const settled: TuningState = { ...fresh, run: run("ok"), lastOkFingerprint: "fp", lastOkAt: at, stale: false };

describe("gateReason", () => {
  it("opens a deck with no games and no runs", () => {
    expect(gateReason(fresh)).toBeNull();
  });

  // Locked: every card but the commander locked. Ahead of `unchanged`, since pressing "anyway"
  // would find nothing to cut; behind a run already in flight.
  it("refuses with every card locked, ahead of unchanged and behind a run in flight", () => {
    expect(gateReason({ ...settled, allLocked: "Kykar" })?.kind).toBe("allLocked");
    expect(gateReason({ ...fresh, allLocked: "Kykar" })?.message).toBe(lockedCardsCopy.tuning.allLocked("Kykar"));
    expect(gateReason({ ...fresh, allLocked: "Kykar", run: run("pending") })?.kind).toBe("in_flight");
    expect(gateReason({ ...fresh, allLocked: null })).toBeNull();
  });

  it("refuses while a run is in flight", () => {
    expect(gateReason({ ...fresh, run: run("pending") })?.kind).toBe("in_flight");
  });

  it("reports unchanged when nothing has moved since the last successful run", () => {
    expect(gateReason(settled)?.kind).toBe("unchanged");
  });

  it("reopens after the player changes something", () => {
    expect(gateReason({ ...settled, stale: true })).toBeNull();
  });

  it("reopens after a prompt or profile version bump, without calling the deck changed", () => {
    const bumped = { ...settled, modelVersionMoved: true };
    expect(gateReason(bumped)).toBeNull();
    expect(bumped.stale).toBe(false);
  });

  // Design's "retired by a commit": a commit with an unchanged list is a new baseline, and its
  // `Suggest changes` must not be refused as "nothing changed".
  it("reopens after a deck version is committed, even over an unchanged list", () => {
    expect(gateReason({ ...settled, retired: { from: 2, to: 3 } })).toBeNull();
  });

  it("does not refuse when the last run failed or was cancelled", () => {
    expect(gateReason({ ...fresh, run: run("failed", "upstream_busy") })).toBeNull();
    expect(gateReason({ ...fresh, run: run("cancelled") })).toBeNull();
  });

  it("refuses when the shared allowance is spent", () => {
    expect(gateReason({ ...fresh, allowance: spent })?.kind).toBe("allowance");
  });

  it("opens over a spent allowance while a paid lot holds a credit (payments L2)", () => {
    expect(gateReason({ ...fresh, allowance: { ...spent, pack: 1 } })).toBeNull();
    expect(gateReason({ ...fresh, allowance: { ...spent, plan: 0, pack: 0 } })?.kind).toBe("allowance");
  });

  it("reports unchanged before the allowance, the more useful truth", () => {
    expect(gateReason({ ...settled, allowance: spent })?.kind).toBe("unchanged");
  });

  it("reports a pending run before everything", () => {
    expect(gateReason({ ...settled, run: run("pending"), allowance: spent })?.kind).toBe("in_flight");
  });
});
