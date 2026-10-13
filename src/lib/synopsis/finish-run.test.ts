// `finishRun` writes what a failed call ended as onto the run row (H33): the class and the HTTP
// status, so the row says on its own whether the upstream was busy or refused the request. What
// the database then does with the write (the outcome CHECK admitting `upstream_rejected`) is the
// migration's, and `probe:synopsis` proves it against a real Postgres.
import { beforeEach, describe, expect, it, vi } from "vitest";

/** Every `.set()` the run row's update was given, in order. */
const sets: Record<string, unknown>[] = [];
const tx = {
  update: () => {
    const q: Record<string, unknown> = {};
    q.set = (v: Record<string, unknown>) => { sets.push(v); return q; };
    q.where = () => q;
    q.returning = async () => [{ callId: "call" }];
    return q;
  },
};
vi.mock("../../db", () => ({ db: { transaction: async (fn: (t: unknown) => unknown) => fn(tx) } }));
const settleModelCall = vi.fn();
vi.mock("../model/allowance", () => ({
  reserveModelCall: vi.fn(),
  AllowanceSpentError: class extends Error {},
  recordModelUsage: vi.fn(),
  settleModelCall: (...a: unknown[]) => settleModelCall(...a),
}));
vi.mock("./reaper", () => ({ reapSynopses: async () => {} }));

const { failedRunSet, finishRun } = await import("./generate");

describe("finishRun: a failed call's class and status on the row", () => {
  beforeEach(() => {
    sets.length = 0;
    settleModelCall.mockReset();
  });

  it("stores a rejection with its status, and refunds the unit", async () => {
    const written = await finishRun({ runId: "run", callId: "call" }, failedRunSet({ ok: false, errorClass: "upstream_rejected", status: 404 }, undefined));
    expect(written).toBe(true);
    expect(sets).toEqual([expect.objectContaining({ status: "done", outcome: "upstream_rejected", errorStatus: 404, content: null })]);
    expect(settleModelCall).toHaveBeenCalledWith(tx, "call", "refunded", undefined, expect.any(Date), null);
  });

  it("stores a null status for a failure that carried none", async () => {
    await finishRun({ runId: "run", callId: "call" }, failedRunSet({ ok: false, errorClass: "timeout" }, undefined));
    expect(sets[0]).toMatchObject({ outcome: "timeout", errorStatus: null });
  });
});
