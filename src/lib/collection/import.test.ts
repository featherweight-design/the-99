import { describe, expect, it, vi } from "vitest";
import { getTableName, type Table } from "drizzle-orm";

const stub = vi.hoisted(() => {
  const deleted: string[] = [];
  const executed: string[] = [];
  const inserted: Record<string, unknown>[] = [];
  const standing: { rows: Record<string, unknown>[] } = { rows: [] };
  const tx = {
    delete: (table: Table) => {
      deleted.push(getTableName(table));
      return { where: async () => {} };
    },
    insert: () => ({ values: async (v: Record<string, unknown>[]) => { inserted.push(...v); } }),
    // The holdings the replace finds before it deletes: none, so the write is a first fill.
    select: () => ({ from: () => ({ where: async () => standing.rows }) }),
    update: () => ({ set: () => ({ where: async () => {}, returning: async () => [{ id: "u" }] }) }),
    // The per-user advisory lock. Recorded rather than ignored: it is the statement that
    // stops two replaces interleaving, and a stub that silently swallowed it would let the
    // lock be deleted with this suite still green.
    execute: async (q: { queryChunks?: unknown[] }) => {
      executed.push(JSON.stringify(q?.queryChunks ?? q));
      return { rows: [] };
    },
  };
  return {
    deleted,
    executed,
    inserted,
    standing,
    db: { transaction: async (fn: (t: typeof tx) => Promise<void>) => fn(tx) },
  };
});

vi.mock("../../db", () => ({ db: stub.db }));

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
});
