import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({
  hasRunningRead: vi.fn(async () => false),
  // The admission lock, as a test sets it: held by another press ("busy"), or free (runs the press).
  withReadAdmission: vi.fn(async (_userId: string, run: () => Promise<unknown>) => run()),
  reapAbandonedReads: vi.fn(async () => 0),
  startRead: vi.fn(),
  setReadPhase: vi.fn(),
  settleTheRead: vi.fn(),
}));
vi.mock("./run-store", () => store);
const allowance = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("../model/allowance", () => ({ readAllowance: allowance.read }));
const OPEN = { used: 1, limit: 5, nextAt: null, reopensAt: null };
vi.mock("./search", () => ({ loadIntakeCatalog: vi.fn(), loadSearchFacts: vi.fn() }));
const load = vi.hoisted(() => ({ collectionDigest: vi.fn(), loadReadCards: vi.fn(), loadReadDecks: vi.fn() }));
vi.mock("./the-read-load", () => load);
const dbRows = vi.hoisted(() => ({ rows: [] as unknown[] }));
vi.mock("../../db", () => ({ db: { execute: vi.fn(async () => ({ rows: dbRows.rows })) } }));

import type { ModelOutcome } from "../model/client";
import { formatPoolList } from "./pool-list";
import type { JudgeReply, ShortlistReply } from "./the-read";
import { beginTheRead, runTheRead, shortlistPrefix, type TheReadDeps, type TheReadInputs } from "./the-read-run";

const usage = { inputTokens: 100, outputTokens: 10, cacheReadTokens: 0, cacheWriteTokens: 0 };
const commander = (id: string, name: string) => ({ oracleId: id, name, colorIdentity: ["B"], typeLine: "Legendary Creature — Horror", tags: [] });
const list = formatPoolList([commander("a", "Alpha"), commander("b", "Beta"), commander("c", "Gamma")], "g");
const inputs = (over: Partial<TheReadInputs> = {}): TheReadInputs => ({
  list, pool: new Set([1, 2]), narrowed: false, decks: [], cards: [], collection: "c", fingerprint: "fp", ...over,
});
const ok = <T>(value: T): ModelOutcome<T> => ({ ok: true, value, usage });
const deps = (shortlist: ModelOutcome<ShortlistReply>, judge: ModelOutcome<JudgeReply>): TheReadDeps => ({
  modelName: "s+j", shortlistModel: "s", judgeModel: "j",
  shortlist: vi.fn(async () => shortlist),
  judge: vi.fn(async () => judge),
  now: () => 0,
});
const input = { readId: "r", words: "scary horrors", filters: { colors: [], match: "contains" as const, themes: [], budgetDollars: null, bracket: null } };

beforeEach(() => {
  allowance.read.mockReset().mockResolvedValue(OPEN);
  store.withReadAdmission.mockReset().mockImplementation(async (_userId: string, run: () => Promise<unknown>) => run());
  store.reapAbandonedReads.mockReset().mockResolvedValue(0);
  store.hasRunningRead.mockReset().mockResolvedValue(false);
  store.startRead.mockReset().mockResolvedValue({ kind: "started", readId: "r", callId: "c" });
  store.setReadPhase.mockReset().mockResolvedValue(true);
  store.settleTheRead.mockReset().mockResolvedValue(true);
  load.collectionDigest.mockReset().mockResolvedValue("c");
  dbRows.rows = [
    { id: "a", name: "Alpha", color_identity: ["B"], type_line: "Creature", oracle_text: "Draw.", tags: [], owned: true, owned_support: 3, support_total: 9 },
    { id: "b", name: "Beta", color_identity: ["B"], type_line: "Creature", oracle_text: "Drain.", tags: [], owned: false, owned_support: 0, support_total: 9 },
    // Gamma is outside the pool. Its row is here so only the pool check can keep it from the judgement.
    { id: "c", name: "Gamma", color_identity: ["B"], type_line: "Creature", oracle_text: "Mill.", tags: [], owned: false, owned_support: 0, support_total: 9 },
  ];
});

describe("runTheRead", () => {
  it("runs the shortlist then the judgement, moving the phase before each, and spends on a pick with both bills", async () => {
    const d = deps(ok({ keys: [2, 1, 3] }), ok({ picks: [{ key: 2, reason: "Its horrors drain each opponent." }] }));
    const out = await runTheRead("u", input, d, inputs());
    expect(out).toEqual({ kind: "read", readId: "r", repeat: false, result: { picks: [{ oracleId: "b", reason: [{ text: "Its horrors drain each opponent." }] }], pool: 2, weighed: 2 } });
    expect(store.setReadPhase.mock.calls.map((c) => c[1])).toEqual(["shortlist", "judge"]);
    expect(store.settleTheRead.mock.calls[0][2]).toEqual([{ model: "s", usage, step: "shortlist", effort: "medium" }, { model: "j", usage, step: "judgement", effort: "medium" }]);
    // Key 3 is outside the pool, so the judgement is never shown it.
    expect(vi.mocked(d.judge).mock.calls[0][0].user).not.toContain("3|Gamma");
  });

  it("keeps a required card in code: a pick whose decks do not run it is never shown, whatever the model returns", async () => {
    const d = deps(ok({ keys: [2, 1] }), ok({ picks: [{ key: 1, reason: "Draws cards." }] }));
    const required = [{ name: "Rhystic Study", oracleText: "Draw.", runBy: [1], required: true }];
    await runTheRead("u", input, d, inputs({ cards: required }));
    const judged = vi.mocked(d.judge).mock.calls[0][0].user;
    expect(judged).toContain("1|Alpha");
    expect(judged).not.toContain("2|Beta");
  });

  it("finds nothing, refunded, when the shortlist holds no key in the pool, and never calls the judgement", async () => {
    const d = deps(ok({ keys: [3] }), ok({ picks: [] }));
    const empty = { picks: [], pool: 2, weighed: 0 };
    expect(await runTheRead("u", input, d, inputs())).toEqual({ kind: "nothing", readId: "r", result: empty, repeat: false });
    expect(d.judge).not.toHaveBeenCalled();
    expect(store.settleTheRead.mock.calls[0][1]).toEqual({ kind: "read", result: empty });
  });

  it("records a zero bill for an empty pool, where no call was made, so the ledger never counts its worst case", async () => {
    const d = deps(ok({ keys: [] }), ok({ picks: [] }));
    expect(await runTheRead("u", input, d, inputs({ pool: new Set() }))).toMatchObject({ kind: "nothing" });
    expect(d.shortlist).not.toHaveBeenCalled();
    expect(store.settleTheRead.mock.calls[0][2]).toEqual([{ model: "s", usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }, step: "shortlist", effort: null, noCall: true }]);
  });

  it("gives the shortlist no more than what is left of the whole deadline", async () => {
    // The first reading starts the clock; by the shortlist, 100s of the 110s are gone.
    const times = [0];
    const d = { ...deps(ok({ keys: [] }), ok({ picks: [] })), now: () => times.shift() ?? 100_000 };
    await runTheRead("u", input, d, inputs());
    expect(vi.mocked(d.shortlist).mock.calls[0][0].deadlineMs).toBe(10_000);
  });

  it("finds nothing when every judged reason is refused, and says how many it weighed", async () => {
    const d = deps(ok({ keys: [1, 2] }), ok({ picks: [{ key: 1, reason: "Makes 3 tokens." }] }));
    expect(await runTheRead("u", input, d, inputs())).toMatchObject({ kind: "nothing", result: { picks: [], pool: 2, weighed: 2 } });
  });

  it("settles a failed judgement as failed, still billing the shortlist", async () => {
    const d = deps(ok({ keys: [1] }), { ok: false, errorClass: "timeout" });
    expect(await runTheRead("u", input, d, inputs())).toEqual({ kind: "failed", errorClass: "timeout" });
    expect(store.settleTheRead.mock.calls[0][2]).toEqual([{ model: "s", usage, step: "shortlist", effort: "medium" }]);
  });

  it("stops between the calls when a Stop has settled the read, landing only the shortlist's bill", async () => {
    store.setReadPhase.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const d = deps(ok({ keys: [1] }), ok({ picks: [] }));
    expect(await runTheRead("u", input, d, inputs())).toEqual({ kind: "stopped" });
    expect(d.judge).not.toHaveBeenCalled();
    expect(store.settleTheRead.mock.calls[0][2]).toEqual([{ model: "s", usage, step: "shortlist", effort: "medium" }]);
  });

  it("answers a repeat from the store and calls nothing", async () => {
    const result = { picks: [{ oracleId: "a", reason: [{ text: "Fits." }] }], pool: 2, weighed: 1 };
    store.startRead.mockResolvedValue({ kind: "stored", readId: "old", useful: true, result });
    const d = deps(ok({ keys: [] }), ok({ picks: [] }));
    expect(await runTheRead("u", input, d, inputs())).toEqual({ kind: "read", readId: "old", result, repeat: true });
    expect(d.shortlist).not.toHaveBeenCalled();
  });

  it("caches the shortlist's prefix only when it is the whole list every press shares", async () => {
    const whole = deps(ok({ keys: [] }), ok({ picks: [] }));
    await runTheRead("u", input, whole, inputs());
    expect(vi.mocked(whole.shortlist).mock.calls[0][0].cache).toBe(true);
    const filtered = deps(ok({ keys: [] }), ok({ picks: [] }));
    await runTheRead("u", input, filtered, inputs({ narrowed: true }));
    expect(vi.mocked(filtered.shortlist).mock.calls[0][0].cache).toBe(false);
  });

  it("stores the answer under its fingerprint, or under one no ask can match when the collection moved meanwhile", async () => {
    const d = () => deps(ok({ keys: [1] }), ok({ picks: [{ key: 1, reason: "Draws cards." }] }));
    await runTheRead("u", input, d(), inputs());
    expect(store.settleTheRead.mock.calls[0][3]).toEqual({});
    load.collectionDigest.mockResolvedValue("c2");
    await runTheRead("u", input, d(), inputs());
    expect(store.settleTheRead.mock.calls[1][3]).toEqual({ rehash: "fp:moved:r" });
  });

  it("settles the read as interrupted when anything after the reservation throws, so no credit is held", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const d = deps(ok({ keys: [1] }), ok({ picks: [] }));
    vi.mocked(d.judge).mockRejectedValue(new Error("boom"));
    expect(await runTheRead("u", input, d, inputs())).toEqual({ kind: "failed", errorClass: "interrupted" });
    expect(store.settleTheRead.mock.calls[0][1]).toEqual({ kind: "failed", errorClass: "interrupted" });
    expect(store.settleTheRead.mock.calls[0][2]).toEqual([{ model: "s", usage, step: "shortlist", effort: "medium" }]);
  });

  it("begins by reserving alone: no model is called until the submit's after() runs finish (F8)", async () => {
    const d = deps(ok({ keys: [1] }), ok({ picks: [{ key: 1, reason: "Draws cards." }] }));
    const begun = await beginTheRead("u", input, d, inputs());
    expect(begun.kind).toBe("started");
    expect(store.startRead).toHaveBeenCalledTimes(1);
    expect(d.shortlist).not.toHaveBeenCalled();
    expect(store.setReadPhase).not.toHaveBeenCalled();
    if (begun.kind !== "started") return;
    expect(await begun.finish()).toMatchObject({ kind: "read", readId: "r" });
    expect(d.shortlist).toHaveBeenCalledTimes(1);
  });

  it("refuses as in flight before loading anything when a read is already running", async () => {
    store.hasRunningRead.mockResolvedValueOnce(true);
    store.startRead.mockClear();
    const d = deps(ok({ keys: [1] }), ok({ picks: [] }));
    expect(await beginTheRead("u", input, d)).toEqual({ kind: "in_flight" });
    expect(load.loadReadDecks).not.toHaveBeenCalled();
    expect(store.startRead).not.toHaveBeenCalled();
  });

  describe("before the pool is read (hardening)", () => {
    // A loader the test can count: the pool read is whatever it stands for.
    const counted = () => {
      const loader = vi.fn(async () => inputs());
      return loader;
    };

    it("reads no pool for a player whose allowance is closed, whichever way it is closed", async () => {
      for (const [closed, kind] of [
        [{ ...OPEN, used: 5 }, "allowance"],
        [{ ...OPEN, paused: { until: new Date() } }, "paused"],
        [{ ...OPEN, ownerShare: true }, "ownerShare"],
        // The reservation's own order: paused, then the owner's share, then spent.
        [{ ...OPEN, used: 9, paused: { until: new Date() }, ownerShare: true }, "paused"],
      ] as const) {
        allowance.read.mockResolvedValueOnce(closed);
        const loader = counted();
        store.startRead.mockClear();
        expect(await beginTheRead("u", input, deps(ok({ keys: [] }), ok({ picks: [] })), loader), kind).toEqual({ kind });
        expect(loader).not.toHaveBeenCalled();
        expect(store.startRead).not.toHaveBeenCalled();
      }
    });

    it("reaps an abandoned read before refusing a spent allowance, and goes on if that freed the credit", async () => {
      allowance.read.mockResolvedValueOnce({ ...OPEN, used: 5 }).mockResolvedValueOnce(OPEN);
      store.reapAbandonedReads.mockResolvedValueOnce(1);
      const loader = counted();
      expect((await beginTheRead("u", input, deps(ok({ keys: [] }), ok({ picks: [] })), loader)).kind).toBe("started");
      expect(store.reapAbandonedReads).toHaveBeenCalledWith("u", expect.any(Date));
      expect(loader).toHaveBeenCalledTimes(1);
    });

    it("still refuses when the reaped read did not free the credit, and reaps nothing for an open allowance", async () => {
      allowance.read.mockResolvedValueOnce({ ...OPEN, used: 5 }).mockResolvedValueOnce({ ...OPEN, used: 5 });
      store.reapAbandonedReads.mockResolvedValueOnce(1);
      const loader = counted();
      expect(await beginTheRead("u", input, deps(ok({ keys: [] }), ok({ picks: [] })), loader)).toEqual({ kind: "allowance" });
      expect(loader).not.toHaveBeenCalled();
      store.reapAbandonedReads.mockClear();
      await beginTheRead("u", input, deps(ok({ keys: [] }), ok({ picks: [] })), counted());
      expect(store.reapAbandonedReads).not.toHaveBeenCalled();
    });

    it("looks for a running read again inside the admission, before loading anything", async () => {
      // Clear at the door, running by the time the admission is held: another press reserved and let go between.
      store.hasRunningRead.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      const loader = counted();
      store.startRead.mockClear();
      expect(await beginTheRead("u", input, deps(ok({ keys: [] }), ok({ picks: [] })), loader)).toEqual({ kind: "in_flight" });
      expect(loader).not.toHaveBeenCalled();
      expect(store.startRead).not.toHaveBeenCalled();
    });

    it("lets a player with a credit through, and reads the pool once", async () => {
      const loader = counted();
      const out = await beginTheRead("u", input, deps(ok({ keys: [] }), ok({ picks: [] })), loader);
      expect(out.kind).toBe("started");
      expect(loader).toHaveBeenCalledTimes(1);
      expect(allowance.read).toHaveBeenCalledWith("u", expect.any(Date), "intake");
    });

    it("leaves the decision to the reservation when the allowance cannot be read", async () => {
      allowance.read.mockRejectedValueOnce(new Error("ledger down"));
      const loader = counted();
      expect((await beginTheRead("u", input, deps(ok({ keys: [] }), ok({ picks: [] })), loader)).kind).toBe("started");
      expect(loader).toHaveBeenCalledTimes(1);
    });

    it("refuses as in flight, reading no pool, when another press of the player's holds the admission", async () => {
      store.withReadAdmission.mockResolvedValueOnce("busy");
      const loader = counted();
      store.startRead.mockClear();
      expect(await beginTheRead("u", input, deps(ok({ keys: [] }), ok({ picks: [] })), loader)).toEqual({ kind: "in_flight" });
      expect(loader).not.toHaveBeenCalled();
      expect(store.startRead).not.toHaveBeenCalled();
    });

    it("takes the admission for the player, and runs the pool read and the reservation inside it", async () => {
      const order: string[] = [];
      store.withReadAdmission.mockImplementationOnce(async (userId: string, run: () => Promise<unknown>) => {
        order.push(`admit:${userId}`);
        const out = await run();
        order.push("release");
        return out;
      });
      const loader = vi.fn(async () => { order.push("load"); return inputs(); });
      store.startRead.mockImplementationOnce(async () => { order.push("reserve"); return { kind: "started", readId: "r", callId: "c" }; });
      await beginTheRead("u", input, deps(ok({ keys: [] }), ok({ picks: [] })), loader);
      expect(order).toEqual(["admit:u", "load", "reserve", "release"]);
    });
  });

  it("reserves under the fingerprint and the joined model", async () => {
    await runTheRead("u", input, deps(ok({ keys: [] }), ok({ picks: [] })), inputs());
    expect(store.startRead).toHaveBeenCalledWith("u", "fp", "s+j", { readId: "r" });
  });
});

describe("the shortlist's prefix", () => {
  it("is the whole list with no filter set, and only the pool's lines with one (plan (d))", () => {
    expect(shortlistPrefix(inputs())).toContain("3|Gamma");
    const narrowed = shortlistPrefix(inputs({ narrowed: true }));
    expect(narrowed).toContain("1|Alpha");
    expect(narrowed).not.toContain("3|Gamma");
  });
});
