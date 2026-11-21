import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: { op: string; arg?: unknown }[] = [];
let live: string[] = [];
let locked: string[] = [];
let deckRow: { id: string }[] = [{ id: "d" }];

vi.mock("../decks/locks", () => ({ liveLockedIds: async () => new Set(locked), pruneOrphanLocks: async () => { calls.push({ op: "pruneLocks" }); } }));
vi.mock("../decks/prune-proxies", () => ({ pruneOrphanProxies: async () => { calls.push({ op: "pruneProxies" }); } }));

import { applyGuidedPairsIn } from "./apply";

// A transaction stub: the first select is the deck row lock, the second the deck's list.
function tx() {
  let selects = 0;
  const chain = (rows: unknown[]) => {
    const c: Record<string, unknown> = { from: () => c, where: () => c, for: () => Promise.resolve(rows), then: (f: (r: unknown[]) => unknown) => Promise.resolve(rows).then(f) };
    return c;
  };
  return {
    select: () => (selects++ === 0 ? chain(deckRow) : chain(live.map((oracleId) => ({ oracleId })))),
    delete: () => ({ where: () => { calls.push({ op: "delete" }); return Promise.resolve(); } }),
    insert: () => ({ values: (v: unknown) => { calls.push({ op: "insert", arg: v }); return Promise.resolve(); } }),
  } as never;
}

const pair = (cutId: string, addId: string) => ({ cutId, addId });

describe("applyGuidedPairsIn", () => {
  beforeEach(() => { calls.length = 0; live = ["a", "b", "c"]; locked = []; deckRow = [{ id: "d" }]; });

  it("cuts and adds each pair, then prunes the cut cards' statements", async () => {
    expect(await applyGuidedPairsIn(tx(), "u", "d", [pair("a", "x"), pair("b", "y")])).toBe(2);
    expect(calls.map((c) => c.op)).toEqual(["delete", "insert", "pruneProxies", "pruneLocks"]);
    expect(calls[1].arg).toEqual([
      { deckId: "d", oracleId: "x", quantity: 1, auto: false },
      { deckId: "d", oracleId: "y", quantity: 1, auto: false },
    ]);
  });

  it("skips a pair whose cut is gone, locked, or whose add is already in the deck", async () => {
    locked = ["b"];
    expect(await applyGuidedPairsIn(tx(), "u", "d", [pair("gone", "x"), pair("b", "y"), pair("a", "c"), pair("c", "z")])).toBe(1);
    expect(calls[1].arg).toEqual([{ deckId: "d", oracleId: "z", quantity: 1, auto: false }]);
  });

  it("writes nothing when the deck is not the reader's, or nothing applies", async () => {
    deckRow = [];
    expect(await applyGuidedPairsIn(tx(), "u", "d", [pair("a", "x")])).toBe(0);
    deckRow = [{ id: "d" }];
    expect(await applyGuidedPairsIn(tx(), "u", "d", [pair("zz", "x")])).toBe(0);
    expect(calls).toEqual([]);
  });
});
