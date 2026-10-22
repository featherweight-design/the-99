import { describe, expect, it, vi } from "vitest";
import { getTableName, type Table } from "drizzle-orm";

const stub = vi.hoisted(() => {
  const deleted: string[] = [];
  const executed: string[] = [];
  const inserted: Record<string, unknown>[] = [];
  const standing: { rows: Record<string, unknown>[] } = { rows: [] };
  // One trace of what the write does, in order: the lock, the row writes, the commit, and (below) the combo writer.
  const trace: string[] = [];
  const fail = { commit: false };
  const tx = {
    delete: (table: Table) => {
      deleted.push(getTableName(table));
      trace.push("write");
      return { where: async () => {} };
    },
    insert: () => ({ values: async (v: Record<string, unknown>[]) => { inserted.push(...v); trace.push("write"); } }),
    // The holdings the replace finds before it deletes: none, so the write is a first fill.
    select: () => ({ from: () => ({ where: async () => standing.rows }) }),
    update: () => ({ set: () => ({ where: async () => {}, returning: async () => [{ id: "u" }] }) }),
    // The per-user advisory lock. Recorded rather than ignored: it is the statement that
    // stops two replaces interleaving, and a stub that silently swallowed it would let the
    // lock be deleted with this suite still green.
    execute: async (q: { queryChunks?: unknown[] }) => {
      executed.push(JSON.stringify(q?.queryChunks ?? q));
      if (executed[executed.length - 1].includes("pg_advisory_xact_lock")) trace.push("lock");
      return { rows: [] };
    },
  };
  return {
    deleted,
    executed,
    inserted,
    standing,
    trace,
    fail,
    db: {
      transaction: async (fn: (t: typeof tx) => Promise<void>) => {
        await fn(tx);
        // The commit: reached only when the callback returned, and a stand-in for a commit that itself fails.
        if (fail.commit) throw new Error("commit failed");
        trace.push("commit");
      },
    },
  };
});

vi.mock("../../db", () => ({ db: stub.db }));

// The combo writer (menu and Home G1), stubbed: its own SQL is pinned in `combo-writer.test.ts` and its effect in
// `probe:feed-writers`. What this suite pins is the WIRING: watched under the lock before the rows move, the delta
// read in the same transaction, and the notice only after the commit.
const combo = vi.hoisted(() => ({
  order: stub.trace,
  delta: null as null | { added: string[]; held: Set<string> },
}));
vi.mock("../feed/combo-writer", () => ({
  comboWatchIn: async () => { combo.order.push("watch"); return new Set(["held-before"]); },
  comboDeltaIn: async () => { combo.order.push("delta"); return combo.delta; },
  noticeCombos: async () => { combo.order.push("notice"); return 1; },
}));
vi.mock("../feed/after-commit", () => ({
  afterCommit: async (_label: string, task: () => Promise<unknown>) => { combo.order.push("after-commit"); await task(); },
}));

import { replaceCollection } from "./import";

describe("replaceCollection", () => {
  // A re-import must not silently reset every art pick the user has made. The preferences
  // table is keyed on (user, oracle) and has no FK to collection_items precisely so it can
  // outlive the rows that were current when the pick was made.
  it("clears only the collection and its derived scores, never art preferences", async () => {
    await replaceCollection("user_1", []);
    expect(stub.deleted).toEqual(["collection_items", "commander_scores"]);
    expect(stub.deleted).not.toContain("card_art_preferences");
  });

  // Date added: a holding already held keeps its date through the replace, a new one arrives now, and the file
  // that fills an empty collection is inexact. The probe (`probe:added-at`) proves the same against a database.
  describe("dates", () => {
    const A = "0000aaaa-0000-4000-8000-00000000000a";
    const B = "0000aaaa-0000-4000-8000-00000000000b";
    const item = (oracleId: string) => ({ oracleId, setCode: "c21", collectorNumber: "1", finish: "nonfoil" as const, condition: null, quantity: 1, scryfallId: null });
    const before = new Date("2026-09-02T12:00:00Z");

    it("dates a first fill inexact", async () => {
      stub.inserted.length = 0;
      stub.standing.rows = [];
      await replaceCollection("user_1", [item(A)]);
      expect(stub.inserted).toHaveLength(1);
      expect(stub.inserted[0]).toMatchObject({ addedExact: false });
      expect(stub.inserted[0].addedAt).toBeInstanceOf(Date);
    });

    it("keeps a standing holding's date and stamps a new one exact", async () => {
      stub.inserted.length = 0;
      stub.standing.rows = [{ oracleId: A, setCode: "c21", collectorNumber: "1", finish: "nonfoil", addedAt: before, addedExact: false }];
      await replaceCollection("user_1", [item(A), item(B)]);
      const byId = Object.fromEntries(stub.inserted.map((r) => [r.oracleId as string, r]));
      expect(byId[A]).toMatchObject({ addedAt: before, addedExact: false });
      expect(byId[B]).toMatchObject({ addedExact: true });
      expect((byId[B].addedAt as Date).getTime()).toBeGreaterThan(before.getTime());
    });
  });

  // The lock is what stops two of this user's replaces interleaving — see
  // `pnpm probe:arrivals`, which races two uploads and proves the effect against a real
  // database. This asserts only that the statement is still issued, and inside the
  // transaction, which is the half a unit test can see.
  it("takes a per-user advisory lock inside the transaction", async () => {
    stub.executed.length = 0;
    await replaceCollection("user_1", []);
    expect(stub.executed.join(" ")).toContain("pg_advisory_xact_lock");
  });

  it("watches combos under the lock, before the rows move, and tells them only after the commit, when the write added a card", async () => {
    stub.trace.length = 0;
    combo.delta = null;
    await replaceCollection("user_1", []);
    expect(stub.trace).toEqual(["lock", "watch", "write", "write", "delta", "commit"]);
    stub.trace.length = 0;
    combo.delta = { added: ["new"], held: new Set(["new", "held-before"]) };
    await replaceCollection("user_1", []);
    expect(stub.trace).toEqual(["lock", "watch", "write", "write", "delta", "commit", "after-commit", "notice"]);
    combo.delta = null;
  });

  it("tells nothing when the transaction does not commit", async () => {
    stub.trace.length = 0;
    combo.delta = { added: ["new"], held: new Set(["new", "held-before"]) };
    stub.fail.commit = true;
    try {
      await expect(replaceCollection("user_1", [])).rejects.toThrow("commit failed");
    } finally {
      stub.fail.commit = false;
      combo.delta = null;
    }
    expect(stub.trace).toEqual(["lock", "watch", "write", "write", "delta"]);
  });
});
