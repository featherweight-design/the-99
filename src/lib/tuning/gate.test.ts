import { describe, expect, it } from "vitest";

import { MODEL_DAILY_ALLOWANCE, type Allowance } from "../model/allowance-rule";
import { gateReason } from "./gate";
import type { TuningRun, TuningState } from "./state";

const at = new Date("2026-09-07T10:00:00Z");
const run = (status: TuningRun["status"], errorClass: string | null = null): TuningRun => ({
  id: "run_1", status, errorClass, createdAt: at, droppedCount: 0,
});
const open: Allowance = { used: 0, limit: MODEL_DAILY_ALLOWANCE, reopensAt: null, nextAt: null };
const spent: Allowance = { used: MODEL_DAILY_ALLOWANCE, limit: MODEL_DAILY_ALLOWANCE, reopensAt: at, nextAt: at };

// A deck that has never generated, and has no games: neither is a reason to refuse.
const fresh: TuningState = {
  run: null, items: [], lastOkFingerprint: null, lastOkAt: null,
  stale: true, modelVersionMoved: false, retired: null, allowance: open, gameCount: 0, newestPriceAsOf: null,
};
const settled: TuningState = { ...fresh, run: run("ok"), lastOkFingerprint: "fp", lastOkAt: at, stale: false };

describe("gateReason", () => {
  it("opens a deck with no games and no runs", () => {
    expect(gateReason(fresh)).toBeNull();
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

  it("reports unchanged before the allowance, the more useful truth", () => {
    expect(gateReason({ ...settled, allowance: spent })?.kind).toBe("unchanged");
  });

  it("reports a pending run before everything", () => {
    expect(gateReason({ ...settled, run: run("pending"), allowance: spent })?.kind).toBe("in_flight");
  });
});
