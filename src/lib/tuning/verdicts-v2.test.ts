import { describe, expect, it, vi } from "vitest";

// One item's two reads (`lockedItem`): the run it belongs to, then the item, locked. Writes are recorded, never made.
const fx = vi.hoisted(() => ({
  run: { status: "ok", requestedCount: null as number | null },
  item: { verdict: "pending", undoSnapshot: null as object | null },
  updates: 0,
}));
vi.mock("../../db", () => {
  const chain = (rows: unknown[]) => {
    const c: Record<string, unknown> = {};
    for (const k of ["from", "innerJoin", "where"]) c[k] = () => c;
    c.for = async () => rows;
    c.then = (ok: (v: unknown[]) => unknown) => Promise.resolve(rows).then(ok);
    return c;
  };
  let reads = 0;
  const tx = {
    select: () => (reads++ % 2 === 0
      ? chain([{ deckId: "deck", ...fx.run }])
      : chain([{ addOracleId: "a", cutOracleId: null, ...fx.item }])),
    execute: async () => ({ rows: [] }),
    update: () => ({ set: () => ({ where: async () => { fx.updates += 1; } }) }),
  };
  return { db: { transaction: (fn: (t: typeof tx) => unknown) => fn(tx) } };
});

const swaps = vi.hoisted(() => ({ planned: 0, applied: 0 }));
vi.mock("../swaps/draft-swap", () => ({
  planSwap: async () => { swaps.planned += 1; return { ok: true, snapshot: {} }; },
  applySwap: async () => { swaps.applied += 1; },
  restoreSwap: async () => true,
}));
vi.mock("../decks/touch", () => ({ touchDeck: async () => undefined }));

import { appliesOneByOne, applyItem, setDismissed, undoItem } from "./verdicts";

// Plan P3: per-card apply is v10's alone. A line of a run still being made is not the player's yet, and a v2 line is
// applied with its picked set (PR 4): one line alone would move the deck off 99.
describe("appliesOneByOne", () => {
  it("allows only a finished v10 run's item", () => {
    expect(appliesOneByOne({ status: "ok", requestedCount: null })).toBe(true);
    expect(appliesOneByOne({ status: "pending", requestedCount: null })).toBe(false);
    expect(appliesOneByOne({ status: "ok", requestedCount: 5 })).toBe(false);
    expect(appliesOneByOne({ status: "pending", requestedCount: 5 })).toBe(false);
    expect(appliesOneByOne({ status: "failed", requestedCount: null })).toBe(false);
  });
});

describe("setDismissed", () => {
  it("dismisses a finished v10 run's line, and refuses a pending run's line and any v2 line", async () => {
    for (const [run, wrote] of [
      [{ status: "ok", requestedCount: null }, true],
      [{ status: "pending", requestedCount: 5 }, false],
      [{ status: "ok", requestedCount: 5 }, false],
    ] as const) {
      fx.run = run;
      fx.updates = 0;
      expect(await setDismissed("item", "me", true)).toBe(wrote ? "deck" : null);
      expect(fx.updates).toBe(wrote ? 1 : 0);
    }
  });
});

describe("applyItem", () => {
  it("applies a finished v10 run's line, and refuses a pending run's line and any v2 line before planning a swap", async () => {
    for (const [run, wrote] of [
      [{ status: "ok", requestedCount: null }, true],
      [{ status: "pending", requestedCount: 5 }, false],
      [{ status: "pending", requestedCount: null }, false],
      [{ status: "ok", requestedCount: 5 }, false],
    ] as const) {
      fx.run = run;
      fx.updates = 0;
      swaps.planned = 0;
      swaps.applied = 0;
      expect(await applyItem("item", "me")).toBe(wrote ? "deck" : null);
      expect([swaps.planned, swaps.applied, fx.updates]).toEqual(wrote ? [1, 1, 1] : [0, 0, 0]);
    }
  });
});

describe("undoItem", () => {
  it("undoes a finished v10 run's applied line, and refuses a v2 line (undone with its set)", async () => {
    fx.item = { verdict: "accepted", undoSnapshot: {} };
    for (const [run, wrote] of [
      [{ status: "ok", requestedCount: null }, true],
      [{ status: "ok", requestedCount: 5 }, false],
    ] as const) {
      fx.run = run;
      fx.updates = 0;
      expect(await undoItem("item", "me")).toBe(wrote ? "deck" : null);
      expect(fx.updates).toBe(wrote ? 1 : 0);
    }
    fx.item = { verdict: "pending", undoSnapshot: null };
  });
});
