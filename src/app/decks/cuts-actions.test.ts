import { beforeEach, describe, expect, it, vi } from "vitest";

import { cutFacts, type CutFacts } from "../../lib/tuning/cuts";
import { deck, profile, support } from "../../lib/tuning/cuts-fixture";

// What the tests pin: the order of refusals against the reservation, the refund on every failure
// path, and what a kept cut is persisted as. The reads and the run store are mocked; the pack, the
// prompt, the schema and the validator are the real ones.
const calls = vi.hoisted(() => ({
  enabled: true,
  planThrows: false,
  inputs: undefined as unknown,
  inputsReads: 0,
  reaped: 0,
  startKind: "started",
  started: 0,
  finished: [] as unknown[][],
  persisted: [] as unknown[][],
  persistResult: true,
  modelCalls: [] as { system: string; user: string; effort?: string; deadlineMs?: number; retryFloorMs?: number; schema: unknown }[],
  modelOutcome: undefined as unknown,
  modelThrows: false,
  textRows: [] as { id: string; text: string | null; layout: string }[],
  keyCards: [] as string[],
  verdict: { ok: true, deckId: "11111111-1111-4111-8111-111111111111", runId: "run_1" } as unknown,
  rechained: [] as unknown[][],
  verdictCalls: [] as string[],
  state: undefined as unknown,
  stateRunId: undefined as string | null | undefined,
  verdictModes: [] as unknown[],
  fingerprints: ["fp0", "fp1"] as string[],
  recorded: [] as { listFingerprint: string; tool: string }[],
}));

vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
// History's free row is keyed on the LIST alone, never on the tool's input fingerprint ("fp").
vi.mock("../../lib/profile/fingerprint", () => ({ listFingerprint: () => "list-fp" }));
vi.mock("../../lib/tuning/tool-counts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/tuning/tool-counts")>()),
  recordToolCount: async (row: { listFingerprint: string; tool: string }) => { calls.recorded.push(row); },
}));
vi.mock("../../lib/tuning/flag", () => ({ proposedCutsEnabled: () => calls.enabled }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined, updateTag: () => undefined }));
// `after()` runs the run's model call and settle once the response is sent: tests collect them and
// wait for them where the real server would have finished them.
const later = vi.hoisted(() => ({ queue: [] as (() => Promise<unknown>)[] }));
vi.mock("next/server", () => ({ after: (fn: () => Promise<unknown>) => { later.queue.push(fn); } }));
vi.mock("../../db", () => ({
  db: { select: () => ({ from: () => ({ where: async () => calls.textRows }) }) },
}));
vi.mock("../../lib/decks/cuts-read", () => ({
  readProposedCuts: async () => {
    calls.inputsReads += 1;
    const inputs = calls.inputs as { fingerprint: string } | null;
    const withKeys = inputs ? { ...inputs, keyCards: calls.keyCards } : inputs;
    return withKeys && calls.fingerprints.length > 0 ? { ...withKeys, fingerprint: calls.fingerprints[Math.min(calls.inputsReads - 1, calls.fingerprints.length - 1)] } : withKeys;
  },
  readCutsState: async (_d: string, _u: string, _n?: Date, runId?: string | null) => { calls.stateRunId = runId; return calls.state; },
  reapCutsRuns: async () => { calls.reaped += 1; },
}));
vi.mock("../../lib/decks/tuning-read", () => ({ commanderName: async () => "Gishath", profileOfHead: async () => ({}) }));
// The plan read is its own module with its own test; here it answers a fixed plan (or throws, to prove the run carries on without one).
vi.mock("../../lib/decks/cuts-plan-read", () => ({
  readCutsPlan: async () => {
    if (calls.planThrows) throw new Error("plan read down");
    return { combos: [], nearCombos: [], commanderText: ["Gishath: Vigilance"], colourNeeds: [], basics: [], needs: new Map() };
  },
}));
vi.mock("../../lib/tuning/cuts-run-store", () => ({
  startCutsRun: async () => {
    calls.started += 1;
    return calls.startKind === "started" ? { kind: "started", runId: "run_1", callId: "call_1" } : { kind: calls.startKind };
  },
  finishCutsRun: async (...args: unknown[]) => { calls.finished.push(args); return true; },
  persistCutsRun: async (...args: unknown[]) => { calls.persisted.push(args); return calls.persistResult; },
}));
vi.mock("../../lib/tuning/cuts-verdicts", () => ({
  cutItem: async (_i: string, _u: string, mode?: unknown) => { calls.verdictCalls.push("cut"); calls.verdictModes.push(mode); return calls.verdict; },
  undoCutItem: async (_i: string, _u: string, mode?: unknown) => { calls.verdictCalls.push("undo"); calls.verdictModes.push(mode); return calls.verdict; },
  setCutKept: async (_i: string, _u: string, kept: boolean) => { calls.verdictCalls.push(kept ? "keep" : "restore"); return calls.verdict; },
}));
const USAGE = { inputTokens: 5_000, outputTokens: 1_200, cacheReadTokens: 0, cacheWriteTokens: 0 };
vi.mock("../../lib/model/client", () => ({
  callModel: async (req: (typeof calls.modelCalls)[number]) => {
    calls.modelCalls.push(req);
    if (calls.modelThrows) throw new Error("boom");
    return calls.modelOutcome ?? {
      ok: true,
      value: { cuts: [{ name: "bear1", reason: "Off the commander's list.", cites: [{ kind: "offList" }] }] },
      usage: USAGE,
    };
  },
}));

import { creditsCopy } from "../../lib/copy/credits";
import { deckCutsCopy } from "../../lib/copy/deck-cuts";
import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";
import { cutProposed, keepProposedCut, readCutsPanel, restoreProposedCut, runProposedCuts as runProposedCutsRequest, undoProposedCut } from "./cuts-actions";

const DECK = "11111111-1111-4111-8111-111111111111";

/** The request, then the work it handed to `after()`, as the server finishes them. */
async function runProposedCuts(...args: Parameters<typeof runProposedCutsRequest>) {
  const result = await runProposedCutsRequest(...args);
  await Promise.all(later.queue.splice(0).map((f) => f()));
  return result;
}
const RUN = "22222222-2222-4222-8222-222222222222";

// 102 cards: two over. bear1 is off the commander's list, ramp0 is on it at 41 percent.
const factsFor = (bears = 50): CutFacts => cutFacts({
  profile: profile({}, deck(bears)),
  locked: new Set(),
  support: support([["ramp0", 41]]),
  declaredBracket: null,
});
const inputsFor = (facts: CutFacts, over: object = {}) => ({
  head: {}, facts, locked: [], allLocked: false, readVersion: 3, fingerprint: "fp", intent: null, ...over,
});

beforeEach(() => {
  calls.stateRunId = undefined;
  calls.verdictModes = [];
  calls.enabled = true;
  calls.planThrows = false;
  calls.inputs = inputsFor(factsFor());
  calls.inputsReads = 0;
  calls.reaped = 0;
  calls.startKind = "started";
  calls.started = 0;
  calls.finished = [];
  calls.persisted = [];
  calls.persistResult = true;
  calls.verdict = { ok: true, deckId: DECK, runId: "run_1" };
  calls.rechained = [];
  calls.verdictCalls = [];
  calls.fingerprints = ["fp0", "fp1"];
  calls.modelCalls = [];
  later.queue.length = 0;
  calls.modelOutcome = undefined;
  calls.modelThrows = false;
  calls.textRows = [];
  calls.keyCards = [];
});

describe("runProposedCuts refuses before any credit is reserved", () => {
  it("with the switch off, without reading the deck", async () => {
    calls.enabled = false;
    expect(await runProposedCuts(DECK)).toEqual({ ok: false, message: deckCutsCopy.run.refused });
    expect(calls.inputsReads).toBe(0);
    expect(calls.started).toBe(0);
  });

  it("for ids that are not uuids", async () => {
    expect(await runProposedCuts("nope")).toMatchObject({ ok: false });
    expect(await runProposedCuts(DECK, { runId: "nope" })).toMatchObject({ ok: false });
    expect(await runProposedCuts(DECK, { runId: 7 as unknown as string })).toMatchObject({ ok: false });
    expect(calls.started).toBe(0);
  });

  it("for a deck that is not the reader's", async () => {
    calls.inputs = null;
    expect(await runProposedCuts(DECK)).toEqual({ ok: false, message: deckCutsCopy.run.refused });
    expect(calls.started).toBe(0);
  });

  it("for a deck that is not over 100", async () => {
    // 99 cards of the fixture's 102: one commander, 37 Forests, 14 spells and 47 bears.
    const facts = factsFor(47);
    expect(facts.over).toBe(0);
    calls.inputs = inputsFor(facts);
    expect(await runProposedCuts(DECK)).toEqual({ ok: false, message: deckCutsCopy.run.notOver });
    expect(calls.started).toBe(0);
    expect(calls.modelCalls).toHaveLength(0);
  });

  it("for a prompt past the reservation's input ceiling, before any credit is held", async () => {
    calls.textRows = [{ id: "draw0", text: "x".repeat(70_000), layout: "normal" }];
    expect(await runProposedCuts(DECK)).toEqual({ ok: false, message: deckCutsCopy.run.tooBig });
    expect(calls.started).toBe(0);
    expect(calls.modelCalls).toHaveLength(0);
  });

  it("for a deck whose every card is locked", async () => {
    calls.inputs = inputsFor(factsFor(), { allLocked: true });
    expect(await runProposedCuts(DECK)).toEqual({ ok: false, message: lockedCardsCopy.tuning.allLocked("Gishath") });
    expect(calls.started).toBe(0);
    expect(calls.modelCalls).toHaveLength(0);
  });
});

describe("runProposedCuts when the start refuses", () => {
  it.each([
    ["allowance", deckTuningCopy.allowance.spent],
    ["in_flight", deckTuningCopy.announce.started],
    ["paused", creditsCopy.pausedServer],
    ["allLocked", lockedCardsCopy.tuning.allLocked("Gishath")],
  ])("%s makes no model call and settles nothing", async (kind, message) => {
    calls.startKind = kind;
    expect(await runProposedCuts(DECK)).toEqual({ ok: false, message });
    expect(calls.reaped).toBe(1);
    expect(calls.modelCalls).toHaveLength(0);
    expect(calls.finished).toHaveLength(0);
    expect(calls.persisted).toHaveLength(0);
  });
});

describe("runProposedCuts, a run that answers", () => {
  it("persists the kept cut with the usage the reply billed, and refunds nothing", async () => {
    expect(await runProposedCuts(DECK, { runId: RUN })).toEqual({ ok: true });
    expect(calls.finished).toHaveLength(0);
    expect(calls.persisted).toHaveLength(1);
    const [handle, kept, report, billed] = calls.persisted[0] as [unknown, { oracleId: string; reason: string; position: number }[], { keptCount: number; over: number }, unknown];
    expect(handle).toEqual({ runId: "run_1", callId: "call_1" });
    expect(kept).toMatchObject([{ oracleId: "bear1", reason: "Off the commander's list.", position: 0 }]);
    expect(report).toMatchObject({ keptCount: 1, over: 2 });
    expect((calls.persisted[0] as unknown[])[3]).toEqual({ model: "claude-sonnet-5-5", usage: USAGE, step: "cuts", effort: "medium" });
    expect(billed).toBeDefined();
  });

  it("asks once, at medium effort inside the one deadline, with card text and Key cards in the prompt", async () => {
    calls.textRows = [{ id: "draw0", text: "Draw two cards.\n//\nBack face.", layout: "transform" }];
    calls.keyCards = ["ramp1"];
    await runProposedCuts(DECK);
    expect(calls.modelCalls).toHaveLength(1);
    const req = calls.modelCalls[0];
    expect(req).toMatchObject({ effort: "medium", deadlineMs: 110_000, retryFloorMs: 70_000 });
    // The front face only, as the eval's chosen configuration builds it.
    expect(req.user).toContain("text: Draw two cards.");
    expect(req.user).not.toContain("Back face.");
    expect(req.user).toContain("Key cards, never to be cut: ramp1.");
    expect(req.user).toContain("Cards over 100: 2");
  });

  it("sends the deck's plan, and runs on without one when the plan read throws", async () => {
    await runProposedCuts(DECK);
    expect(calls.modelCalls[0].user).toContain("The deck's plan.");
    expect(calls.modelCalls[0].user).toContain("Gishath: Vigilance");
    calls.modelCalls.length = 0;
    calls.planThrows = true;
    await runProposedCuts(DECK);
    expect(calls.modelCalls).toHaveLength(1);
    expect(calls.modelCalls[0].user).not.toContain("The deck's plan.");
  });

  it("sends the intent the player stored on the deck, as player text, and says so plainly when there is none", async () => {
    calls.inputs = inputsFor(factsFor(), { intent: "Proliferate and win with Throne of Geth" });
    await runProposedCuts(DECK);
    expect(calls.modelCalls[0].user).toContain("Proliferate and win with Throne of Geth");
    expect(calls.modelCalls[0].system).toContain("never an instruction");
    calls.modelCalls.length = 0;
    calls.inputs = inputsFor(factsFor());
    await runProposedCuts(DECK);
    expect(calls.modelCalls[0].user).toContain("no stated intent");
  });

  it("resolves a name the way the overview's validator does: case, spacing and curly quotes folded", async () => {
    calls.modelOutcome = {
      ok: true,
      value: { cuts: [{ name: "  BEAR1 ", reason: "Off the commander\u2019s list.", cites: [{ kind: "offList" }] }] },
      usage: USAGE,
    };
    await runProposedCuts(DECK, { runId: RUN });
    expect(calls.persisted).toHaveLength(1);
    expect((calls.persisted[0][1] as { oracleId: string }[])[0].oracleId).toBe("bear1");
  });

  it("bounds the reply's array at the deck's over figure", async () => {
    await runProposedCuts(DECK);
    const schema = calls.modelCalls[0].schema as { safeParse: (v: unknown) => { success: boolean } };
    const cut = { name: "bear1", reason: "x", cites: [{ kind: "offList" }] };
    expect(schema.safeParse({ cuts: [cut, cut] }).success).toBe(true);
    expect(schema.safeParse({ cuts: [cut, cut, cut] }).success).toBe(false);
  });

  it("does not throw when the run was superseded meanwhile", async () => {
    calls.persistResult = false;
    expect(await runProposedCuts(DECK)).toEqual({ ok: true });
  });
});

describe("runProposedCuts, a run that fails refunds its unit", () => {
  it("settles a malformed reply as failed with the usage it billed, and persists nothing", async () => {
    calls.modelOutcome = { ok: false, errorClass: "malformed", usage: USAGE };
    expect(await runProposedCuts(DECK)).toEqual({ ok: true });
    // The one retry is inside callModel; the action asks once and settles what came back.
    expect(calls.modelCalls).toHaveLength(1);
    expect(calls.persisted).toHaveLength(0);
    expect(calls.finished).toEqual([[
      { runId: "run_1", callId: "call_1" },
      { status: "failed", errorClass: "malformed", droppedCount: undefined, report: undefined },
      { model: "claude-sonnet-5-5", usage: USAGE, step: "cuts", effort: "medium" },
    ]]);
  });

  it("stores an upstream rejection as busy, with no usage when none came back", async () => {
    calls.modelOutcome = { ok: false, errorClass: "upstream_rejected" };
    await runProposedCuts(DECK);
    expect(calls.finished).toMatchObject([[{ runId: "run_1" }, { status: "failed", errorClass: "upstream_busy" }, undefined]]);
  });

  it("settles a timeout as a timeout", async () => {
    calls.modelOutcome = { ok: false, errorClass: "timeout" };
    await runProposedCuts(DECK);
    expect(calls.finished).toMatchObject([[{ runId: "run_1" }, { errorClass: "timeout" }, undefined]]);
  });

  it("fails as ungrounded, with the report, when no cut survives the checks", async () => {
    calls.modelOutcome = {
      ok: true,
      // A card the deck does not hold, and a figure that is not true of the card.
      value: { cuts: [
        { name: "Not In The Deck", reason: "Off the list.", cites: [{ kind: "offList" }] },
        { name: "ramp0", reason: "Off the list.", cites: [{ kind: "offList" }] },
      ] },
      usage: USAGE,
    };
    expect(await runProposedCuts(DECK)).toEqual({ ok: true });
    expect(calls.persisted).toHaveLength(0);
    expect(calls.finished).toHaveLength(1);
    const [handle, set, billed] = calls.finished[0] as [unknown, { errorClass: string; droppedCount: number; report: { askedCount: number; keptCount: number; drops: { rule: string }[] } }, unknown];
    expect(handle).toEqual({ runId: "run_1", callId: "call_1" });
    expect(set).toMatchObject({ status: "failed", errorClass: "ungrounded", droppedCount: 2 });
    expect(set.report).toMatchObject({ askedCount: 2, keptCount: 0 });
    expect(set.report.drops.map((d) => d.rule)).toEqual(["cardExists", "citeMismatch"]);
    expect(billed).toEqual({ model: "claude-sonnet-5-5", usage: USAGE, step: "cuts", effort: "medium" });
  });

  it("refunds and logs, never throws, when something throws after the reservation", async () => {
    calls.modelThrows = true;
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(runProposedCuts(DECK)).resolves.toEqual({ ok: true });
    expect(log).toHaveBeenCalled();
    log.mockRestore();
    expect(calls.persisted).toHaveLength(0);
    expect(calls.finished).toEqual([[
      { runId: "run_1", callId: "call_1" },
      { status: "failed", errorClass: "upstream_busy", droppedCount: undefined, report: undefined },
      undefined,
    ]]);
  });

  it("refunds with the reply's usage when the write after the reply throws", async () => {
    calls.persistResult = true;
    const store = await import("../../lib/tuning/cuts-run-store");
    const spy = vi.spyOn(store, "persistCutsRun").mockRejectedValueOnce(new Error("db down"));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(runProposedCuts(DECK)).resolves.toEqual({ ok: true });
    log.mockRestore();
    spy.mockRestore();
    expect(calls.finished).toMatchObject([[{ runId: "run_1" }, { errorClass: "upstream_busy" }, { usage: USAGE }]]);
  });
});

describe("runProposedCuts returns before the model is called", () => {
  it("reserves the run and answers ok, leaving the call and its settle to after()", async () => {
    await expect(runProposedCutsRequest(DECK)).resolves.toEqual({ ok: true });
    expect(calls.modelCalls).toHaveLength(0);
    expect(calls.finished).toEqual([]);
    expect(later.queue).toHaveLength(1);
    await Promise.all(later.queue.splice(0).map((f) => f()));
    expect(calls.modelCalls).toHaveLength(1);
  });
});

const ITEM = "33333333-3333-4333-8333-333333333333";

describe("the cut verdicts", () => {
  it("a cut, an undo, a keep and a restore each reach their own transaction and answer ok", async () => {
    expect(await cutProposed(ITEM)).toEqual({ ok: true });
    expect(await undoProposedCut(ITEM)).toEqual({ ok: true });
    expect(await keepProposedCut(ITEM)).toEqual({ ok: true });
    expect(await restoreProposedCut(ITEM)).toEqual({ ok: true });
    expect(calls.verdictCalls).toEqual(["cut", "undo", "keep", "restore"]);
  });

  it("a cut or an undo from History's re-review asks for review mode; an ordinary press, or a stray argument, never does", async () => {
    await cutProposed(ITEM, true);
    await undoProposedCut(ITEM, true);
    await cutProposed(ITEM);
    await cutProposed(ITEM, "yes" as unknown as boolean);
    expect(calls.verdictModes).toEqual([{ review: true }, { review: true }, { review: false }, { review: false }]);
  });

  it("a refusal says why in the copy", async () => {
    calls.verdict = { ok: false, reason: "cutLocked" };
    expect(await cutProposed(ITEM)).toEqual({ ok: false, message: deckCutsCopy.panel.refusals.cutLocked });
    calls.verdict = { ok: false, reason: "cutGone" };
    expect(await cutProposed(ITEM)).toEqual({ ok: false, message: deckCutsCopy.panel.refusals.cutGone });
    calls.verdict = { ok: false, reason: "stale" };
    expect(await cutProposed(ITEM)).toEqual({ ok: false, message: deckCutsCopy.panel.refusals.stale });
    calls.verdict = { ok: false, reason: "moved" };
    expect(await undoProposedCut(ITEM)).toEqual({ ok: false, message: deckCutsCopy.panel.refusals.moved });
  });

  it("refuses with the switch off or an id that is not a uuid, before any write", async () => {
    calls.enabled = false;
    expect((await cutProposed(ITEM)).ok).toBe(false);
    calls.enabled = true;
    expect((await cutProposed("nope")).ok).toBe(false);
    expect(calls.verdictCalls).toEqual([]);
  });
});

describe("readCutsPanel", () => {
  const state = (lastOkFingerprint: string | null, moved = false) => ({
    run: null, items: [], itemsReport: { over: 6 }, lastOkFingerprint, lastOkAt: null, modelVersionMoved: moved,
    allowance: { used: 0, limit: 3, reopensAt: null, nextAt: null },
  });

  it("reads the run History names by id, and the ordinary panel for anything that is not a uuid", async () => {
    calls.inputs = inputsFor(factsFor(), { head: { declaredBracket: null, partnerOracleId: null } });
    calls.state = state(null);
    await readCutsPanel(DECK, RUN);
    expect(calls.stateRunId).toBe(RUN);
    await readCutsPanel(DECK, "run:nope");
    expect(calls.stateRunId).toBeNull();
    await readCutsPanel(DECK);
    expect(calls.stateRunId).toBeNull();
  });

  it("records History's free row under the list's own fingerprint, not the tool's inputs", async () => {
    calls.recorded = [];
    calls.inputs = inputsFor(factsFor(), { head: { declaredBracket: null, partnerOracleId: null } });
    calls.state = state(null);
    await readCutsPanel(DECK);
    expect(calls.recorded.map((r) => [r.tool, r.listFingerprint])).toEqual([["proposed_cuts", "list-fp"]]);
  });

  it("a result is current only while the deck matches the fingerprint it was made against", async () => {
    calls.inputs = inputsFor(factsFor(), { head: { declaredBracket: null, partnerOracleId: null } });
    calls.fingerprints = ["fp"];
    calls.state = state("fp");
    expect((await readCutsPanel(DECK))?.resultCurrent).toBe(true);
    calls.state = state("older");
    expect((await readCutsPanel(DECK))?.resultCurrent).toBe(false);
    calls.state = state("fp", true);
    expect((await readCutsPanel(DECK))?.resultCurrent).toBe(false);
  });

  it("every card left to cut being a Key card is the nothing-to-name state, and the run refuses before a credit", async () => {
    const facts = factsFor();
    calls.inputs = inputsFor(facts, { head: { declaredBracket: null, partnerOracleId: null } });
    calls.fingerprints = ["fp"];
    calls.state = state("fp");
    calls.keyCards = facts.cards.map((c) => c.name);
    const panel = await readCutsPanel(DECK);
    expect(panel?.allLocked).toBe(true);
    expect(panel?.keyCount).toBe(facts.cards.length);
    expect(await runProposedCuts(DECK)).toEqual({ ok: false, message: deckCutsCopy.panel.allLocked("Gishath") });
    expect(calls.started).toBe(0);
  });

  it("counts only Key cards still in the candidates: a stale name counts for nothing", async () => {
    calls.inputs = inputsFor(factsFor(), { head: { declaredBracket: null, partnerOracleId: null } });
    calls.fingerprints = ["fp"];
    calls.state = state("fp");
    calls.keyCards = ["bear1", "no longer in the deck"];
    const panel = await readCutsPanel(DECK);
    expect(panel?.keyCount).toBe(1);
    expect(panel?.allLocked).toBe(false);
  });

  it("a stored result keeps the chip figures it was checked against, while the rows stay live", async () => {
    calls.inputs = inputsFor(factsFor(), { head: { declaredBracket: null, partnerOracleId: null } });
    calls.fingerprints = ["fp"];
    const stored = { medianPct: 41, flagCounts: { gameChanger: 4 }, declared: 3 };
    calls.state = { ...state("fp"), itemsReport: { over: 6, chips: stored } };
    expect((await readCutsPanel(DECK))?.chips).toEqual(stored);
    calls.state = state("fp");
    expect((await readCutsPanel(DECK))?.chips).toMatchObject({ declared: null });
  });

  it("persists the chip figures with the run's report", async () => {
    expect(await runProposedCuts(DECK, { runId: RUN })).toEqual({ ok: true });
    const report = (calls.persisted[0] as unknown[])[2] as { chips?: { medianPct: number | null } };
    expect(report.chips).toBeDefined();
  });

  it("is null with the switch off", async () => {
    calls.enabled = false;
    expect(await readCutsPanel(DECK)).toBeNull();
  });
});
