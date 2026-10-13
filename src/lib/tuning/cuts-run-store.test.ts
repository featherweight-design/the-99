import { beforeEach, describe, expect, it, vi } from "vitest";

// The run store's own wiring, against a recording transaction: which feature it reserves, which
// tool and versions it records, where the items land, and that a superseded run writes no item.
const rec = vi.hoisted(() => ({
  reserved: [] as unknown[][],
  settled: [] as unknown[][],
  late: [] as unknown[][],
  inserts: [] as { table: unknown; values: unknown }[],
  updates: [] as unknown[],
  updateRows: [{ callId: "call_1" }] as { callId: string }[],
  reserveResult: { id: "call_1" } as { id: string } | { refused: string },
  insertRunError: undefined as unknown,
}));

vi.mock("../../db", () => {
  const tx = {
    execute: async () => ({ rows: [] }),
    insert: (table: unknown) => ({
      values: (values: unknown) => {
        rec.inserts.push({ table, values });
        if (rec.insertRunError) return { returning: async () => { throw rec.insertRunError; } };
        return { returning: async () => [{ id: "run_1" }], then: (r: (v: unknown) => void) => r(undefined) };
      },
    }),
    update: () => ({
      set: (v: unknown) => ({ where: () => ({ returning: async () => { rec.updates.push(v); return rec.updateRows; } }) }),
    }),
  };
  return { db: { transaction: async (fn: (t: typeof tx) => unknown) => fn(tx) } };
});
vi.mock("../model/allowance", async () => {
  class AllowanceSpentError extends Error {
    constructor(public refused: string) { super(refused); }
  }
  return {
    AllowanceSpentError,
    reserveModelCall: async (...a: unknown[]) => { rec.reserved.push(a.slice(1)); return rec.reserveResult; },
    settleModelCall: async (...a: unknown[]) => { rec.settled.push(a.slice(1)); },
    recordModelUsage: async (...a: unknown[]) => { rec.late.push(a.slice(1)); },
  };
});
vi.mock("../decks/never-cut-flag", () => ({ neverCutEnabled: () => false }));

import { deckCutItems, deckSuggestionRuns } from "../../db/schema";
import { CUTS_PROMPT_VERSION } from "./cuts-prompt";
import { persistCutsRun, startCutsRun } from "./cuts-run-store";
import { ENV_VIEW } from "@/test/env-view";
import type { CutsReport, ValidatedCut } from "./cuts-validate";

const NOW = new Date("2026-10-10T12:00:00Z");
const handle = { runId: "run_1", callId: "call_1" };
const cut: ValidatedCut = { oracleId: "o1", name: "Bear", reason: "Off the list.", cites: [{ kind: "offList" }], position: 0 };
const report: CutsReport = { askedCount: 2, survivedCount: 1, keptCount: 1, over: 2, drops: [{ position: 1, rule: "cardExists" }] };
const BILLED = { model: "claude-sonnet-5-5", usage: { inputTokens: 1, outputTokens: 2, cacheReadTokens: 0, cacheWriteTokens: 0 } };

beforeEach(() => {
  rec.reserved = []; rec.settled = []; rec.late = []; rec.inserts = []; rec.updates = [];
  rec.updateRows = [{ callId: "call_1" }]; rec.reserveResult = { id: "call_1" }; rec.insertRunError = undefined;
});

describe("startCutsRun", () => {
  it("reserves a proposed_cuts unit and records the cuts tool and prompt version", async () => {
    const out = await startCutsRun("u", "d", "fp", 4, { runId: "r", now: NOW, env: ENV_VIEW });
    expect(out).toEqual({ kind: "started", runId: "run_1", callId: "call_1" });
    expect(rec.reserved).toEqual([["u", "proposed_cuts", "claude-sonnet-5-5", NOW]]);
    expect(rec.inserts).toHaveLength(1);
    expect(rec.inserts[0].table).toBe(deckSuggestionRuns);
    expect(rec.inserts[0].values).toMatchObject({
      id: "r", deckId: "d", userId: "u", tool: "proposed_cuts", inputFingerprint: "fp", modelCallId: "call_1",
      promptVersion: CUTS_PROMPT_VERSION, readVersion: 4, status: "pending",
    });
  });

  it("inserts no run row when the reservation is refused", async () => {
    rec.reserveResult = { refused: "allowance" };
    expect(await startCutsRun("u", "d", "fp", null, { env: ENV_VIEW })).toEqual({ kind: "allowance" });
    expect(rec.inserts).toHaveLength(0);
  });
});

describe("persistCutsRun", () => {
  it("marks the run ok, writes the items to the cuts table, and spends the unit, in one transaction", async () => {
    expect(await persistCutsRun(handle, [cut], report, BILLED)).toBe(true);
    expect(rec.updates).toMatchObject([{ status: "ok", droppedCount: 1, validationReport: report }]);
    expect(rec.inserts).toHaveLength(1);
    expect(rec.inserts[0].table).toBe(deckCutItems);
    expect(rec.inserts[0].values).toEqual([
      { runId: "run_1", cutOracleId: "o1", reason: "Off the list.", evidence: [{ kind: "offList" }], position: 0 },
    ]);
    expect(rec.settled).toEqual([["call_1", "spent", BILLED]]);
  });

  it("writes no item and spends nothing when the run was superseded, but still records the bill", async () => {
    rec.updateRows = [];
    expect(await persistCutsRun(handle, [cut], report, BILLED)).toBe(false);
    expect(rec.inserts).toHaveLength(0);
    expect(rec.settled).toHaveLength(0);
    expect(rec.late).toEqual([["call_1", BILLED]]);
  });
});
