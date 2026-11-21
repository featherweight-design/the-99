import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

const dialect = new PgDialect();
const render = (q: unknown) => dialect.sqlToQuery(q as SQL);

const h = vi.hoisted(() => ({
  seen: { owned: true, pending: false, current: false } as { owned: boolean; pending: boolean; current: boolean },
  executed: [] as unknown[],
  inserts: [] as Record<string, unknown>[],
  insertError: null as unknown,
  updates: [] as { set: Record<string, unknown>; where: unknown }[],
  updateRows: [] as unknown[],
  selectRows: [] as unknown[],
  selectWhere: [] as unknown[],
  reserve: vi.fn(),
  settle: vi.fn(),
  late: vi.fn(),
  apply: vi.fn(),
}));

vi.mock("../../db", () => {
  const tx = {
    execute: (q: unknown) => { h.executed.push(q); return Promise.resolve({ rows: [h.seen] }); },
    insert: () => ({
      values: (v: Record<string, unknown>) => {
        h.inserts.push(v);
        return { returning: () => (h.insertError ? Promise.reject(h.insertError) : Promise.resolve([{ id: "run-1" }])) };
      },
    }),
    update: () => {
      const u = { set: {} as Record<string, unknown>, where: null as unknown };
      const b: Record<string, unknown> = {};
      b.set = (s: Record<string, unknown>) => { u.set = s; return b; };
      b.where = (w: unknown) => { u.where = w; h.updates.push(u); return b; };
      b.returning = () => Promise.resolve(h.updateRows);
      b.then = (res: (v: unknown) => unknown) => Promise.resolve(undefined).then(res);
      return b;
    },
  };
  return {
    db: {
      transaction: (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
      select: () => {
        const b: Record<string, unknown> = {};
        for (const k of ["from", "innerJoin", "orderBy"]) b[k] = () => b;
        b.where = (w: unknown) => { h.selectWhere.push(w); return b; };
        b.limit = () => Promise.resolve(h.selectRows);
        return b;
      },
    },
  };
});
class SpentError extends Error { constructor(public refused: string) { super(refused); } }
vi.mock("../model/allowance", () => ({ AllowanceSpentError: SpentError, reserveModelCall: h.reserve, settleModelCall: h.settle }));
class Superseded extends Error {}
vi.mock("../tuning/run-store", () => ({ recordLate: h.late, RunSupersededError: Superseded }));

vi.mock("./apply", () => ({ applyGuidedPairsIn: (...a: unknown[]) => h.apply(...a) }));

const { startGuided, finishGuided, reapGuided, readGuidedState } = await import("./store");

const PARAMS = { strategy: { key: "tokens", label: "Tokens" }, bracketTarget: 3, poolMode: "owned" as const, poolCapCents: null, budgetCents: null, kept: ["o1"] };
const NOW = new Date("2026-11-21T12:00:00Z");

beforeEach(() => {
  h.seen = { owned: true, pending: false, current: false };
  h.executed.length = 0; h.inserts.length = 0; h.updates.length = 0; h.updateRows = []; h.selectRows = []; h.selectWhere.length = 0; h.insertError = null;
  h.reserve.mockReset().mockResolvedValue({ id: "call-1" });
  h.settle.mockReset().mockResolvedValue("refunded");
  h.late.mockReset();
  h.apply.mockReset().mockResolvedValue(0);
});

describe("startGuided (guided build A1)", () => {
  it("serializes starts for one reader's deck on an advisory lock, then reserves the two credits once and inserts the pending row", async () => {
    const r = await startGuided("u1", "deck-1", PARAMS, "m", NOW);
    expect(r).toEqual({ kind: "started", runId: "run-1", callId: "call-1" });
    const lock = render(h.executed[0]);
    expect(lock.sql).toContain("pg_advisory_xact_lock(hashtext($1))");
    expect(lock.params).toEqual(["guided_build:u1:deck-1"]);
    expect(h.reserve).toHaveBeenCalledTimes(1);
    expect(h.reserve.mock.calls[0].slice(1)).toEqual(["u1", "guided_build", "m", NOW, "player", 2]);
    expect(h.inserts[0]).toMatchObject({ userId: "u1", deckId: "deck-1", status: "pending", modelCallId: "call-1", poolMode: "owned", kept: ["o1"], bracketTarget: 3 });
  });

  it("re-checks inside the lock with the qualified deck, owner and status predicates", async () => {
    await startGuided("u1", "deck-1", PARAMS, "m", NOW);
    const q = render(h.executed[1]);
    expect(q.sql).toContain("d.id = $1 and d.user_id = $2");
    expect(q.sql).toContain("g.deck_id = $3 and g.status = 'pending'");
    expect(q.sql).toContain("g.status = 'done' and not g.refunded");
    expect(q.params).toEqual(["deck-1", "u1", "deck-1", "deck-1"]);
  });

  it("answers in_flight to a press that loses to a pending run, reserving nothing (double press, Try again, two tabs)", async () => {
    h.seen.pending = true;
    expect(await startGuided("u1", "deck-1", PARAMS, "m", NOW)).toEqual({ kind: "in_flight" });
    expect(h.reserve).not.toHaveBeenCalled();
    expect(h.inserts).toEqual([]);
  });

  it("answers current to a press that lost to a run since done and kept, reserving nothing", async () => {
    h.seen.current = true;
    expect(await startGuided("u1", "deck-1", PARAMS, "m", NOW)).toEqual({ kind: "current" });
    expect(h.reserve).not.toHaveBeenCalled();
  });

  it("reads another reader's deck as notFound, reserving nothing", async () => {
    h.seen.owned = false;
    expect(await startGuided("u1", "deck-9", PARAMS, "m", NOW)).toEqual({ kind: "notFound" });
    expect(h.reserve).not.toHaveBeenCalled();
  });

  it("maps a refused allowance to its own kind and the partial unique index (the floor under the lock) to in_flight", async () => {
    h.reserve.mockResolvedValue({ refused: "allowance" });
    expect(await startGuided("u1", "deck-1", PARAMS, "m", NOW)).toEqual({ kind: "allowance" });
    h.reserve.mockResolvedValue({ id: "call-2" });
    h.insertError = Object.assign(new Error("duplicate"), { code: "23505" });
    expect(await startGuided("u1", "deck-1", PARAMS, "m", NOW)).toEqual({ kind: "in_flight" });
  });

  it("rethrows anything else", async () => {
    h.insertError = new Error("boom");
    await expect(startGuided("u1", "deck-1", PARAMS, "m", NOW)).rejects.toThrow("boom");
  });
});

describe("finishGuided and reapGuided", () => {
  const handle = { runId: "run-1", callId: "call-1" };
  const done = { status: "done" as const, pairs: [], drops: [], buyTotalCents: 0, bracketBefore: 2, bracketAfter: 3, calls: 1 as const, refunded: false };

  it("writes the outcome only while the run is pending, and spends the credits for a kept run", async () => {
    h.updateRows = [{ id: "run-1" }];
    h.settle.mockResolvedValue("spent");
    expect(await finishGuided(handle, done, undefined, NOW)).toBe(true);
    const w = render(h.updates[0].where);
    expect(w.sql).toContain('"guided_builds"."id" = $1');
    expect(w.sql).toContain('"guided_builds"."status" = $2');
    expect(w.params).toEqual(["run-1", "pending"]);
    expect(h.settle.mock.calls[0].slice(1, 2)).toEqual(["call-1"]);
    expect(h.settle.mock.calls[0][2]).toBe("spent");
  });

  it("applies a done run's pairs to the deck in the same transaction, and a failed run changes nothing", async () => {
    const pair = { cutId: "a", addId: "b" };
    h.updateRows = [{ id: "run-1", userId: "u", deckId: "d" }];
    await finishGuided(handle, { ...done, pairs: [pair] as never }, undefined, NOW);
    expect(h.apply).toHaveBeenCalledOnce();
    expect(h.apply.mock.calls[0].slice(1)).toEqual(["u", "d", [pair]]);
    await finishGuided(handle, { status: "failed", errorClass: "model" }, undefined, NOW);
    expect(h.apply).toHaveBeenCalledOnce();
  });

  it("applies nothing for a run that was reaped first", async () => {
    h.updateRows = [];
    await finishGuided(handle, done, undefined, NOW);
    expect(h.apply).not.toHaveBeenCalled();
  });

  it("refunds a failed run and a short one through the ledger", async () => {
    h.updateRows = [{ id: "run-1" }];
    await finishGuided(handle, { status: "failed", errorClass: "model" }, undefined, NOW);
    expect(h.settle.mock.calls[0][2]).toBe("refunded");
    expect(h.settle.mock.calls[0][5]).toBe("failed");
    await finishGuided(handle, { ...done, refunded: true }, undefined, NOW);
    expect(h.settle.mock.calls[1][2]).toBe("refunded");
    expect(h.settle.mock.calls[1][5]).toBe("nothing_valid");
  });

  it("records only the usage, and returns false, when the run was reaped first", async () => {
    h.updateRows = [];
    expect(await finishGuided(handle, done, undefined, NOW)).toBe(false);
    expect(h.late).toHaveBeenCalledTimes(1);
    expect(h.settle).not.toHaveBeenCalled();
  });

  it("marks a spend the ledger turned into a refund as refunded on the row", async () => {
    h.updateRows = [{ id: "run-1" }];
    h.settle.mockResolvedValue("refunded");
    await finishGuided(handle, done, undefined, NOW);
    expect(h.updates).toHaveLength(2);
    expect(h.updates[1].set).toEqual({ refunded: true });
  });

  it("reaps this reader's pending runs for the deck past the cutoff, refunding each", async () => {
    h.updateRows = [{ callId: "call-1" }, { callId: "call-2" }];
    expect(await reapGuided("u1", "deck-1", NOW)).toBe(2);
    const w = render(h.updates[0].where);
    expect(w.sql).toContain('"guided_builds"."user_id" = $1');
    expect(w.sql).toContain('"guided_builds"."deck_id" = $2');
    expect(w.sql).toContain('"guided_builds"."status" = $3');
    expect(w.sql).toContain('"guided_builds"."created_at" < $4');
    expect(h.updates[0].set).toMatchObject({ status: "failed", errorClass: "interrupted", refunded: true });
    expect(h.settle).toHaveBeenCalledTimes(2);
    expect(h.settle.mock.calls[0][2]).toBe("refunded");
  });
});

describe("readGuidedState", () => {
  const row = (over: Record<string, unknown>) => ({
    id: "run-1", status: "done", refunded: false, strategyKey: "tokens", strategyLabel: "Tokens", createdAt: NOW, pairs: [], buyTotalCents: 100,
    bracketBefore: 2, bracketAfter: 3, bracketTarget: 3, poolMode: "owned", kept: ["o1"], errorClass: null, ...over,
  });

  it("is null for a deck with no run, and reads only the reader's own run on the reader's own deck", async () => {
    expect(await readGuidedState("u1", "deck-1")).toBeNull();
    const w = render(h.selectWhere[0]);
    expect(w.sql).toContain('"guided_builds"."deck_id" = $1');
    expect(w.sql).toContain('"guided_builds"."user_id" = $2');
    expect(w.sql).toContain('"decks"."user_id" = $3');
    expect(w.params).toEqual(["deck-1", "u1", "u1"]);
  });

  it("derives running, done, short and failed from the newest row", async () => {
    const states: [Record<string, unknown>, string][] = [
      [{ status: "pending" }, "running"], [{}, "done"], [{ refunded: true }, "short"], [{ status: "failed", refunded: true }, "failed"],
    ];
    for (const [over, want] of states) {
      h.selectRows = [row(over)];
      expect((await readGuidedState("u1", "deck-1"))?.state).toBe(want);
    }
  });
});
