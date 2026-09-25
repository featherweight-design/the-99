import { beforeEach, describe, expect, it, vi } from "vitest";

// The actions are public endpoints: what the tests pin is what they do with a wire value that
// is not what the TypeScript type claims.
const calls = vi.hoisted(() => ({ inputs: 0, started: 0, applied: 0, saved: 0, startOpts: undefined as unknown, startKind: "in_flight",
  reachModel: false, finished: [] as unknown[][], modelRequest: undefined as unknown, modelOutcome: undefined as unknown,
  contextRead: 0, packInput: undefined as unknown }));

vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("../../db", () => ({ db: {} }));
vi.mock("../../lib/decks/tuning-read", () => ({
  EVIDENCE_STEPS: ["games", "notes", "decklist", "intent", "collection"],
  tuningInputs: async () => {
    calls.inputs += 1;
    return { head: {}, games: [], intent: null, declared: null, fingerprint: "fp" };
  },
  // A deck whose last run saw exactly this fingerprint: the gate reads `unchanged`.
  readTuningState: async () => ({
    run: { id: "r", status: "ok" }, items: [], lastOkFingerprint: "fp", lastOkAt: new Date(),
    stale: false, modelVersionMoved: false, retired: null, allowance: { used: 0, limit: 5, reopensAt: null, nextAt: null }, gameCount: 0, newestPriceAsOf: null,
  }),
  readEvidenceStep: async () => 1,
  readOwnedOracleIds: async () => new Set(),
  readTuningContext: async () => { calls.contextRead += 1; return { overview: { strategy: ["Attack."], keyCards: ["Oxen"] }, universal: [{ oracleId: "ring", name: "Sol Ring" }] }; },
  profileOfHead: async () => {
    if (!calls.reachModel) throw new Error("stop after the gate");
    return { cards: [], skeleton: { staples: [] } };
  },
  withBracketAfter: async () => [],
}));
vi.mock("../../lib/tuning/run-store", () => ({
  saveIntent: async () => { calls.saved += 1; return "saved"; },
  startRun: async (...args: unknown[]) => {
    calls.started += 1;
    calls.startOpts = args[4];
    return calls.startKind === "started" ? { kind: "started", runId: "run_1", callId: "call_1" } : { kind: calls.startKind };
  },
  finishRun: async (...args: unknown[]) => { calls.finished.push(args); return true; },
  persistRun: async () => true,
  cancelRun: async () => true,
}));
vi.mock("../../lib/profile/play", () => ({ buildPlayGroup: () => ({}) }));
vi.mock("../../lib/tuning/evidence", () => ({ buildEvidencePack: (input: unknown) => { calls.packInput = input; return { cards: [] }; } }));
vi.mock("../../lib/tuning/prompt", () => ({ buildPrompt: () => ({ system: "s", user: "u" }) }));
// A reply that came back, billed, and names cards: the catalog read after it is what throws here,
// since `db` is a stub.
vi.mock("../../lib/model/client", () => ({
  callModel: async (req: unknown) => {
    calls.modelRequest = req;
    return calls.modelOutcome ?? {
      ok: true,
      value: { suggestions: [{ add: "Sol Ring", cut: "Island" }] },
      usage: { inputTokens: 4_000, outputTokens: 900, cacheReadTokens: 0, cacheWriteTokens: 0 },
    };
  },
}));
vi.mock("../../lib/tuning/verdicts", () => ({
  applyItem: async () => { calls.applied += 1; return "deck"; },
  undoItem: async () => "deck",
  setDismissed: async () => "deck",
}));

import { creditsCopy } from "../../lib/copy/credits";
import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import { applySuggestion, readTuningEvidence, runTuning, saveDeckIntent } from "./tuning-actions";

const DECK = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  calls.inputs = 0;
  calls.started = 0;
  calls.applied = 0;
  calls.saved = 0;
  calls.startKind = "in_flight";
  calls.reachModel = false;
  calls.finished = [];
  calls.modelRequest = undefined;
  calls.modelOutcome = undefined;
  calls.contextRead = 0;
  calls.packInput = undefined;
});

describe("runTuning after the call returned", () => {
  it("settles a throw past the reply with the usage the reply billed", async () => {
    calls.startKind = "started";
    calls.reachModel = true;
    await expect(runTuning(DECK, { anyway: true })).rejects.toThrow();
    expect(calls.finished).toEqual([[
      { runId: "run_1", callId: "call_1" },
      { status: "failed", errorClass: "upstream_busy", droppedCount: undefined },
      { model: "claude-sonnet-5", usage: { inputTokens: 4_000, outputTokens: 900, cacheReadTokens: 0, cacheWriteTokens: 0 } },
    ]]);
  });
});

describe("runTuning's model call (v2)", () => {
  it("asks for medium effort, with the retry floor inside the one deadline", async () => {
    calls.startKind = "started";
    calls.reachModel = true;
    await runTuning(DECK, { anyway: true }).catch(() => undefined);
    expect(calls.modelRequest).toMatchObject({ model: "claude-sonnet-5", effort: "medium", deadlineMs: 110_000, retryFloorMs: 70_000 });
  });

  it("hands the deck's overview and the universal staples to the pack", async () => {
    calls.startKind = "started";
    calls.reachModel = true;
    await runTuning(DECK, { anyway: true }).catch(() => undefined);
    expect(calls.contextRead).toBe(1);
    expect(calls.packInput).toMatchObject({ overview: { strategy: ["Attack."], keyCards: ["Oxen"] }, universal: [{ oracleId: "ring", name: "Sol Ring" }] });
  });

  // The floor itself is `client.test.ts`'s; what the action owes is that a failed outcome, whatever
  // refused it, settles as failed with its usage, which `finishRun` refunds.
  it("settles a failed call as failed with the usage it burned, never as spent", async () => {
    calls.startKind = "started";
    calls.reachModel = true;
    const usage = { inputTokens: 4_000, outputTokens: 3_600, cacheReadTokens: 0, cacheWriteTokens: 0 };
    calls.modelOutcome = { ok: false, errorClass: "malformed", usage };
    await runTuning(DECK, { anyway: true });
    expect(calls.finished).toEqual([[
      { runId: "run_1", callId: "call_1" },
      { status: "failed", errorClass: "malformed", droppedCount: undefined },
      { model: "claude-sonnet-5", usage },
    ]]);
  });
});

describe("runTuning's refused reservation", () => {
  it("names the spend cap's pause, the owner's share and the spent allowance apart", async () => {
    const said = async (kind: string) => {
      calls.startKind = kind;
      const result = await runTuning(DECK, { anyway: true });
      return result.ok ? null : result.message;
    };
    expect(await said("paused")).toBe(creditsCopy.pausedServer);
    expect(await said("ownerShare")).toBe(creditsCopy.ownerShare(new Date()));
    expect(await said("allowance")).toBe(deckTuningCopy.allowance.spent);
  });
});

describe("runTuning's `anyway`", () => {
  it("passes the unchanged gate only for the literal true", async () => {
    await runTuning(DECK, { anyway: true });
    expect(calls.started).toBe(1);
  });

  it("treats a truthy non-boolean as absent, so the gate holds", async () => {
    for (const anyway of ["false", "true", 1, {}]) {
      const result = await runTuning(DECK, { anyway } as unknown as { anyway: boolean });
      expect(result.ok).toBe(false);
    }
    expect(calls.started).toBe(0);
  });
});

describe("ids off the wire", () => {
  it("hands the panel's run id to startRun, and refuses one that is not a uuid", async () => {
    const RUN = "22222222-2222-4222-8222-222222222222";
    await runTuning(DECK, { anyway: true, runId: RUN });
    expect(calls.startOpts).toEqual({ runId: RUN });
    for (const runId of ["not-a-uuid", 7, {}]) {
      const result = await runTuning(DECK, { anyway: true, runId } as unknown as { runId: string });
      expect(result.ok).toBe(false);
    }
    expect(calls.started).toBe(1);
  });

  it("refuses a deck id that is not a uuid before reading anything", async () => {
    expect((await runTuning("not-a-uuid")).ok).toBe(false);
    expect(calls.inputs).toBe(0);
  });

  it("refuses an item id that is not a uuid before writing anything", async () => {
    expect((await applySuggestion("1; drop table")).ok).toBe(false);
    expect(calls.applied).toBe(0);
  });

  it("reads no evidence step it does not know", async () => {
    expect(await readTuningEvidence(DECK, "prices" as never)).toBeNull();
    expect(await readTuningEvidence(DECK, "games")).toBe(1);
  });
});

describe("saveDeckIntent's field", () => {
  it("refuses a missing or non-text intent rather than clearing the line", async () => {
    const file = new FormData();
    file.set("intent", new Blob(["x"]), "intent.txt");
    for (const form of [new FormData(), file, null as unknown as FormData]) {
      expect((await saveDeckIntent(DECK, form)).ok).toBe(false);
    }
    expect(calls.saved).toBe(0);
  });

  it("saves a text intent, empty included, since clearing is a real edit", async () => {
    const form = new FormData();
    form.set("intent", "");
    expect((await saveDeckIntent(DECK, form)).ok).toBe(true);
    expect(calls.saved).toBe(1);
  });
});
