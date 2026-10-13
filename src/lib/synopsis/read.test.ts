import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));

import { lastWriteFailure, pressWrites, synopsisStatus } from "./read";

// \`nextAt\` follows the allowance rule: set whenever a credit is in use, whether or not any are left.
const left = { used: 1, limit: 5, reopensAt: null, nextAt: new Date() };
const spent = { used: 5, limit: 5, reopensAt: new Date(), nextAt: new Date() };

describe("synopsisStatus", () => {
  // Deck notices plan D10: a withheld overview spends nothing, whatever else would write.
  it("spends nothing on a deck holding a card that is not legal", () => {
    expect(synopsisStatus({ reading: { fresh: true, list: "B" }, synopsis: { fingerprint: "A" }, allowance: left, pending: false, illegal: true }))
      .toEqual({ stale: true, wouldSpend: false });
    expect(synopsisStatus({ reading: { fresh: true, list: "B" }, synopsis: null, allowance: left, pending: false, illegal: true }))
      .toEqual({ stale: false, wouldSpend: false });
  });

  it("reads a synopsis for the analyzed list as current, and spends nothing to press", () => {
    expect(synopsisStatus({ reading: { fresh: true, list: "A" }, synopsis: { fingerprint: "A" }, allowance: left, pending: false }))
      .toEqual({ stale: false, wouldSpend: false });
  });

  it("stales a synopsis written for another list, and a press over a fresh reading would write", () => {
    expect(synopsisStatus({ reading: { fresh: true, list: "B" }, synopsis: { fingerprint: "A" }, allowance: left, pending: false }))
      .toEqual({ stale: true, wouldSpend: true });
  });

  it("stales on an edit (a reading that is no longer fresh), and nothing writes over it", () => {
    // A revert to the written list still reads dirty: the banner shows, and the synopsis waits for
    // the Re-analyze that clears it, which then spends nothing (the list is unchanged).
    expect(synopsisStatus({ reading: { fresh: false, list: "A" }, synopsis: { fingerprint: "A" }, allowance: left, pending: false }))
      .toEqual({ stale: true, wouldSpend: false });
  });

  it("would write for a fresh reading with no synopsis, unless the allowance is spent", () => {
    expect(synopsisStatus({ reading: { fresh: true, list: "A" }, synopsis: null, allowance: left, pending: false }))
      .toEqual({ stale: false, wouldSpend: true });
    expect(synopsisStatus({ reading: { fresh: true, list: "A" }, synopsis: null, allowance: spent, pending: false }).wouldSpend).toBe(false);
  });

  it("would write over a spent allowance while a paid lot holds a credit (payments L2)", () => {
    expect(synopsisStatus({ reading: { fresh: true, list: "A" }, synopsis: null, allowance: { ...spent, pack: 2 }, pending: false }).wouldSpend).toBe(true);
  });

  it("would not write while a run is in flight, which a press would be refused behind", () => {
    expect(synopsisStatus({ reading: { fresh: true, list: "A" }, synopsis: null, allowance: left, pending: true }).wouldSpend).toBe(false);
  });

  it("never writes without a reading", () => {
    expect(synopsisStatus({ reading: null, synopsis: null, allowance: left, pending: false })).toEqual({ stale: false, wouldSpend: false });
  });
});

describe("synopsisStatus under the spend cap", () => {
  const reading = { fresh: true, list: "list-b" };
  it("would not spend while the app-wide cap has paused every call", () => {
    const allowance = { ...left, paused: { until: new Date() } };
    expect(synopsisStatus({ reading, synopsis: null, allowance, pending: false }).wouldSpend).toBe(false);
  });
  it("would not spend once the owner's share is used", () => {
    const allowance = { ...left, ownerShare: true };
    expect(synopsisStatus({ reading, synopsis: null, allowance, pending: false }).wouldSpend).toBe(false);
  });
});

describe("pressWrites", () => {
  it("writes when the live list has no overview", () => {
    expect(pressWrites("list-b", null)).toBe(true);
    expect(pressWrites("list-b", { fingerprint: "list-a" })).toBe(true);
  });
  // 7d, reached by a revert: the list is back to the one its overview describes, so the press
  // returns that overview and spends nothing, whatever the banner says about the reading.
  it("does not write when the live list already has its overview", () => {
    expect(pressWrites("list-a", { fingerprint: "list-a" })).toBe(false);
  });
  it("does not write for a deck it cannot read", () => {
    expect(pressWrites(null, null)).toBe(false);
  });
});

describe("lastWriteFailure (H33)", () => {
  const at = (ms: number) => new Date(Date.UTC(2026, 9, 2, 12, 0, 0, ms));
  const run = (outcome: string | null, status = "done") => ({ status, outcome, createdAt: at(10), fingerprint: "A" });

  it("reads a rejected write as a failure, and as a rejection", () => {
    expect(lastWriteFailure(run("upstream_rejected"), "A", null)).toEqual({ lastFailed: true, lastRejected: true });
  });

  it("reads a busy write as a failure the player may try again", () => {
    expect(lastWriteFailure(run("upstream_busy"), "A", null)).toEqual({ lastFailed: true, lastRejected: false });
  });

  it("reads a rejection over an older overview as this list's failure", () => {
    expect(lastWriteFailure(run("upstream_rejected"), "A", { createdAt: at(0) })).toEqual({ lastFailed: true, lastRejected: true });
  });

  it("does not report a rejection written for another list, or older than the overview shown", () => {
    expect(lastWriteFailure(run("upstream_rejected"), "B", null)).toEqual({ lastFailed: false, lastRejected: false });
    expect(lastWriteFailure(run("upstream_rejected"), "A", { createdAt: at(20) })).toEqual({ lastFailed: false, lastRejected: false });
  });

  it("reports nothing for a run still pending or one that survived", () => {
    expect(lastWriteFailure(run(null, "pending"), "A", null)).toEqual({ lastFailed: false, lastRejected: false });
    expect(lastWriteFailure(run("survived"), "A", null)).toEqual({ lastFailed: false, lastRejected: false });
  });
});
