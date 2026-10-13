import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENV_VIEW } from "@/test/env-view";
import { envViewWith } from "@/test/env-view";

import type { FitsReadReply } from "./fits-read";
import { inputs } from "./fits-read.fixture";
import { FITS_READ_EFFORT } from "./fits-read-limits";
import { STUB_MODEL } from "./fits-read-stub";
import type { FitsReadLoad } from "./fits-read-load";
import type { FitsReadRow } from "./fits-read-state";

vi.mock("../../db", () => ({ db: {} }));
const store = vi.hoisted(() => ({
  rows: [] as FitsReadRow[],
  started: { kind: "started", readId: "read-1", callId: "call-1" } as { kind: string; readId?: string; callId?: string },
  finished: [] as unknown[],
  bills: [] as unknown[],
  reaped: 0,
}));
vi.mock("./fits-read-store", async (orig) => ({
  ...(await orig<typeof import("./fits-read-store")>()),
  reapFitsReads: vi.fn(async () => { store.reaped += 1; return 0; }),
  readFitsReadRows: vi.fn(async () => store.rows),
  startFitsRead: vi.fn(async () => store.started),
  finishFitsRead: vi.fn(async (_h: unknown, write: unknown, billed: unknown) => { store.finished.push(write); store.bills.push(billed); return true; }),
}));
const live = vi.hoisted(() => ({ inputs: vi.fn(async () => null) }));
vi.mock("./fits-read-load", async (orig) => ({
  ...(await orig<typeof import("./fits-read-load")>()),
  loadFitsReadInputs: live.inputs,
}));
vi.mock("../model/allowance", () => ({
  readAllowance: vi.fn(async () => ({ used: 0, limit: 3, reopensAt: null, nextAt: null })),
}));

const { LIVE_DEPS, pressFitsRead, readFitsRead } = await import("./fits-read-run");
const { candidateHashes } = await import("./fits-read-store");
const { staleness } = await import("./fits-read-state");
const { startFitsRead } = await import("./fits-read-store");

const NOW = new Date(Date.UTC(2026, 9, 12, 7));
const MODEL = "claude-haiku-5-5";

function deps(reply: FitsReadReply | { fail: "upstream_busy" | "timeout" | "upstream_rejected" } | "throw", inp = inputs()) {
  const call = vi.fn(async () => {
    if (reply === "throw") throw new Error("boom");
    if ("fail" in reply) return { ok: false as const, errorClass: reply.fail };
    return { ok: true as const, value: reply, usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 } };
  });
  return {
    call,
    d: {
      load: async () => ({ fits: { holds: [] } as unknown as FitsReadLoad["fits"], inputs: inp, planOf: new Map() }) as FitsReadLoad,
      model: () => MODEL,
      call,
      now: () => NOW,
    },
  };
}

const good = (deck: string, cut = "C2") => ({ deck, sentence: "Every loyalty turn adds a body for {C1} to double.", cut, cites: [] });

beforeEach(() => {
  store.rows = [];
  store.started = { kind: "started", readId: "read-1", callId: "call-1" };
  store.finished = [];
  store.bills = [];
  vi.mocked(startFitsRead).mockClear();
});

describe("pressFitsRead: refusals that cost nothing", () => {
  it("no candidate draws no press (lock 8)", async () => {
    const { d, call } = deps({ picks: [] }, inputs([]));
    expect(await pressFitsRead("u", "card", d, ENV_VIEW)).toEqual({ ok: false, reason: "noCandidates" });
    expect(startFitsRead).not.toHaveBeenCalled();
    expect(call).not.toHaveBeenCalled();
  });

  it("a stored read that is still current is not asked again, a no fit included (handoff §6, R2 3)", async () => {
    const hashes = candidateHashes(inputs(), MODEL);
    store.rows = [{ id: "r", status: "done", outcome: "noFit", errorClass: null, refunded: true, createdAt: NOW, finishedAt: NOW, candidateHashes: hashes, picks: [], promptVersion: 3 }];
    const { d, call } = deps({ picks: [] });
    expect(await pressFitsRead("u", "card", d, ENV_VIEW)).toEqual({ ok: false, reason: "current" });
    expect(call).not.toHaveBeenCalled();
  });

  it("a read still current but for a deck the reader added the card to is not asked again (F2)", async () => {
    const inp = inputs();
    const stored = candidateHashes(inp, MODEL);
    store.rows = [{ id: "r", status: "done", outcome: "picks", errorClass: null, refunded: false, createdAt: NOW, finishedAt: NOW, candidateHashes: stored, picks: [], promptVersion: 3 }];
    // Kratos took the card: it holds it now and has left the candidates.
    const after = inputs(["deck-goblins"]);
    const { d, call } = deps({ picks: [] }, after);
    d.load = async () => ({ fits: { holds: [{ id: "deck-kratos", name: "Kratos", quantity: 1 }] } as unknown as FitsReadLoad["fits"], inputs: after, planOf: new Map() }) as FitsReadLoad;
    expect(await pressFitsRead("u", "card", d, ENV_VIEW)).toEqual({ ok: false, reason: "current" });
    expect(call).not.toHaveBeenCalled();
  });

  it("a read stored with the prompt version inside its hash is still current, on the press and on the panel", async () => {
    const hashes = candidateHashes(inputs(), MODEL, 2);
    store.rows = [{ id: "r", status: "done", outcome: "picks", errorClass: null, refunded: false, createdAt: NOW, finishedAt: NOW, candidateHashes: hashes, picks: [], promptVersion: 2 }];
    const { d, call } = deps({ picks: [] });
    expect(await pressFitsRead("u", "card", d, ENV_VIEW)).toEqual({ ok: false, reason: "current" });
    expect(call).not.toHaveBeenCalled();
    const panel = await readFitsRead("u", "card", d, ENV_VIEW);
    expect(panel?.view.stored?.current).toBe(true);
  });

  it("a run in flight is returned as it stands, never charged twice (lock 5)", async () => {
    store.rows = [{ id: "p", status: "pending", outcome: null, errorClass: null, refunded: false, createdAt: NOW, finishedAt: null, candidateHashes: {}, picks: [], promptVersion: 3 }];
    const { d, call } = deps({ picks: [] });
    const r = await pressFitsRead("u", "card", d, ENV_VIEW);
    expect(r.ok && r.panel.view.pending?.readId).toBe("p");
    expect(startFitsRead).not.toHaveBeenCalled();
    expect(call).not.toHaveBeenCalled();
  });

  it("a double press that loses the race to the pending row is shown the run, never asks", async () => {
    store.started = { kind: "in_flight" };
    // The winner's pending row, which the loser's panel reads.
    vi.mocked(startFitsRead).mockImplementationOnce(async () => {
      store.rows = [{ id: "winner", status: "pending", outcome: null, errorClass: null, refunded: false, createdAt: NOW, finishedAt: null, candidateHashes: {}, picks: [], promptVersion: 3 }];
      return { kind: "in_flight" };
    });
    const { d, call } = deps({ picks: [] });
    const r = await pressFitsRead("u", "card", d, ENV_VIEW);
    expect(r.ok && r.panel.view.pending?.readId).toBe("winner");
    expect(call).not.toHaveBeenCalled();
  });

  it("a prompt over the input ceiling is refused before any reservation or call", async () => {
    const inp = inputs();
    const huge = { ...inp, card: { ...inp.card, oracleText: "x".repeat(400_000) } };
    const { d, call } = deps({ picks: [] }, huge);
    expect(await pressFitsRead("u", "card", d, ENV_VIEW)).toEqual({ ok: false, reason: "tooBig" });
    expect(startFitsRead).not.toHaveBeenCalled();
    expect(call).not.toHaveBeenCalled();
  });

  it("a press that lost the race to a read now done over the same inputs is current, and never asks", async () => {
    store.started = { kind: "current" };
    const { d, call } = deps({ picks: [] });
    expect(await pressFitsRead("u", "card", d, ENV_VIEW)).toEqual({ ok: false, reason: "current" });
    expect(call).not.toHaveBeenCalled();
  });

  it("passes the allowance refusal through", async () => {
    store.started = { kind: "allowance" };
    const { d } = deps({ picks: [] });
    expect(await pressFitsRead("u", "card", d, ENV_VIEW)).toEqual({ ok: false, reason: "allowance" });
  });
});

describe("pressFitsRead: outcomes and the unit (lock 4)", () => {
  it("spends a read that held up, stored with its picks and the plan source each was read from", async () => {
    const { d } = deps({ picks: [good("D1"), good("D2", "C7")] });
    d.load = async () => ({ fits: { holds: [] } as unknown as FitsReadLoad["fits"], inputs: inputs(), planOf: new Map([["deck-goblins", { source: "older" as const, staleNames: [] }]]) }) as FitsReadLoad;
    expect((await pressFitsRead("u", "card", d, ENV_VIEW)).ok).toBe(true);
    expect(store.finished).toEqual([expect.objectContaining({ status: "done", outcome: "picks", refunded: false, returned: 2 })]);
    const picks = (store.finished[0] as { picks: { deckId: string; planSource: string }[] }).picks;
    expect(picks.map((p) => [p.deckId, p.planSource])).toEqual([["deck-goblins", "older"]]);
  });

  it("bills the live call as one `read` part at the read's effort, and a stub's at none", async () => {
    const usage = { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 };
    const live = deps({ picks: [good("D1")] });
    await pressFitsRead("u", "card", live.d, ENV_VIEW);
    expect(store.bills).toEqual([{ model: MODEL, usage, step: "read", effort: FITS_READ_EFFORT }]);
    store.bills = [];
    const stub = deps({ picks: [good("D1")] });
    await pressFitsRead("u", "card", { ...stub.d, model: () => STUB_MODEL }, ENV_VIEW);
    expect(store.bills).toEqual([{ model: STUB_MODEL, usage, step: "read", effort: null }]);
  });

  it("refunds a thin read: under a third of the decks named held up", async () => {
    const bad = { deck: "D9", sentence: "Nothing.", cut: null, cites: [] };
    const { d } = deps({ picks: [good("D1"), bad, bad, bad] });
    await pressFitsRead("u", "card", d, ENV_VIEW);
    expect(store.finished).toEqual([expect.objectContaining({ status: "done", outcome: "picks", refunded: true, returned: 4 })]);
  });

  it("re-reads after the call, so a deck edited meanwhile shows the stored read out of date", async () => {
    const { d } = deps({ picks: [good("D1")] });
    const later = inputs();
    let loads = 0;
    const edited = { ...later, decks: later.decks.map((x) => (x.deckId === "deck-goblins" ? { ...x, lockedIds: ["z"] } : x)) };
    d.load = async () => ({ fits: { holds: [] } as unknown as FitsReadLoad["fits"], inputs: (loads += 1) === 1 ? inputs() : edited, planOf: new Map() }) as FitsReadLoad;
    // The store hands back the row the press wrote, with the hashes it was written under.
    vi.mocked(startFitsRead).mockImplementationOnce(async (_u, _o, hashes) => {
      store.rows = [{ id: "read-1", status: "done", outcome: "picks", errorClass: null, refunded: false, createdAt: NOW, finishedAt: NOW, candidateHashes: hashes, picks: [], promptVersion: 3 }];
      return { kind: "started", readId: "read-1", callId: "call-1" };
    });
    const r = await pressFitsRead("u", "card", d, ENV_VIEW);
    expect(loads).toBe(2);
    expect(r.ok && r.panel.view.stored?.current).toBe(false);
    expect(r.ok && r.panel.view.stored?.changed.map((c) => c.deckId)).toEqual(["deck-goblins"]);
  });

  it("refunds and stores a no fit", async () => {
    const { d } = deps({ picks: [] });
    await pressFitsRead("u", "card", d, ENV_VIEW);
    expect(store.finished).toEqual([expect.objectContaining({ status: "done", outcome: "noFit", refunded: true })]);
  });

  it("fails, never stores as a no fit, a read whose every deck failed validation (F5)", async () => {
    const { d } = deps({ picks: [{ deck: "D9", sentence: "Nothing.", cut: null, cites: [] }] });
    await pressFitsRead("u", "card", d, ENV_VIEW);
    expect(store.finished).toEqual([expect.objectContaining({ status: "failed", errorClass: "ungrounded", returned: 1 })]);
  });

  it("fails a model error, a rejection stored as busy", async () => {
    const { d } = deps({ fail: "upstream_rejected" });
    await pressFitsRead("u", "card", d, ENV_VIEW);
    expect(store.finished).toEqual([{ status: "failed", errorClass: "upstream_busy" }]);
  });

  it("fails and refunds a throw, then rethrows it", async () => {
    const { d } = deps("throw");
    await expect(pressFitsRead("u", "card", d, ENV_VIEW)).rejects.toThrow("boom");
    expect(store.finished).toEqual([{ status: "failed", errorClass: "upstream_busy" }]);
  });

  it("reaps an abandoned run before reading or pressing", async () => {
    const before = store.reaped;
    const { d } = deps({ picks: [] });
    await readFitsRead("u", "card", d, ENV_VIEW);
    await pressFitsRead("u", "card", d, ENV_VIEW);
    expect(store.reaped - before).toBe(2);
  });
});

// Admin PR 6f-2: the free list's claim read takes the reader's env. Opposite to the environment on both
// claim-model switches, so a dropped argument would read the other way; checked by identity, never compared.
describe("the reader's env", () => {
  const ENV = envViewWith({ NEVER_CUT_ENABLED: "true", CHANGE_COMMANDER_ENABLED: "true" });
  beforeEach(() => {
    vi.stubEnv("NEVER_CUT_ENABLED", "false");
    vi.stubEnv("CHANGE_COMMANDER_ENABLED", "false");
    return () => vi.unstubAllEnvs();
  });

  it("reaches every load a read and a press make", async () => {
    const { d } = deps({ picks: [{ ...good("D1"), deck: "D1" }] });
    const load = vi.fn(d.load);
    await readFitsRead("u", "card", { ...d, load }, ENV);
    await pressFitsRead("u", "card", { ...d, load }, ENV);
    // The read's one load, then the press's load before the call and its re-read after it.
    expect(load.mock.calls.length).toBeGreaterThanOrEqual(3);
    for (const call of load.mock.calls) expect((call as unknown[])[2] === ENV).toBe(true);
  });

  it("is handed on by the live loader to loadFitsReadInputs", async () => {
    await LIVE_DEPS.load("u", "card", ENV);
    const call = live.inputs.mock.calls[0] as unknown[];
    expect(call.slice(0, 2)).toEqual(["u", "card"]);
    expect(call[3] === ENV).toBe(true);
  });
});

describe("candidateHashes", () => {
  it("does not hold the prompt version, and rebuilds the older form that did from a given one", () => {
    const now = candidateHashes(inputs(), MODEL);
    const v3 = candidateHashes(inputs(), MODEL, 3);
    const v4 = candidateHashes(inputs(), MODEL, 4);
    const deck = Object.keys(now)[0];
    expect(v3[deck]).not.toBe(now[deck]);
    expect(v3[deck]).not.toBe(v4[deck]);
    // The plan half is the same in every form: a version never moves it.
    expect(v3[deck].split(".")[0]).toBe(now[deck].split(".")[0]);
    expect(candidateHashes(inputs(), MODEL)).toEqual(now);
  });

  it("moves only for the deck whose inputs moved", () => {
    const a = candidateHashes(inputs(), MODEL);
    const inp = inputs();
    const moved = { ...inp, decks: inp.decks.map((x) => (x.deckId === "deck-kratos" ? { ...x, lockedIds: [...x.lockedIds, "z"] } : x)) };
    const b = candidateHashes(moved, MODEL);
    expect(b["deck-goblins"]).toBe(a["deck-goblins"]);
    expect(b["deck-kratos"]).not.toBe(a["deck-kratos"]);
  });
  it("moves for a catalog update to a listed card's text or keywords", () => {
    const a = candidateHashes(inputs(), MODEL);
    const inp = inputs();
    const b = candidateHashes({ ...inp, decks: inp.decks.map((x) => (x.deckId === "deck-goblins" ? { ...x, list: x.list.map((c, i) => (i === 0 ? { ...c, oracleText: "Errata." } : c)) } : x)) }, MODEL);
    expect(b["deck-goblins"]).not.toBe(a["deck-goblins"]);
    expect(b["deck-kratos"]).toBe(a["deck-kratos"]);
  });

  it("moves only the plan's half for a new Overview", () => {
    const a = candidateHashes(inputs(), MODEL);
    const inp = inputs();
    const b = candidateHashes({ ...inp, decks: inp.decks.map((x) => (x.deckId === "deck-kratos" ? { ...x, plan: { source: "v2" as const, text: "A new plan." } } : x)) }, MODEL);
    expect(b["deck-kratos"].split(".")[0]).not.toBe(a["deck-kratos"].split(".")[0]);
    expect(b["deck-kratos"].split(".")[1]).toBe(a["deck-kratos"].split(".")[1]);
  });

  it("reads a deck's FIRST Overview as a new Overview, not a deck change (P3g)", () => {
    const inp = inputs(["deck-goblins", "deck-kratos"]);
    // Kratos with no Overview: the read goes on its leading themes instead.
    const before = { ...inp, decks: inp.decks.map((x) => (x.deckId === "deck-kratos" ? { ...x, plan: null, themes: [{ kind: "burn", n: 7 }] } : x)) };
    const after = { ...inp, decks: inp.decks.map((x) => (x.deckId === "deck-kratos" ? { ...x, plan: { source: "v2" as const, text: "Burn them out." }, themes: [] } : x)) };
    const was = candidateHashes(before, MODEL);
    expect(staleness(was, candidateHashes(after, MODEL)).changed).toEqual([{ deckId: "deck-kratos", reason: "overview" }]);
  });

  it("moves for every deck when the model does", () => {
    const a = candidateHashes(inputs(), MODEL);
    const b = candidateHashes(inputs(), "claude-sonnet-5-5");
    expect(Object.keys(a).every((k) => a[k] !== b[k])).toBe(true);
  });
});
