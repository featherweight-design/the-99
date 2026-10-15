import { describe, expect, it, vi } from "vitest";
import { getTableName, type Table } from "drizzle-orm";

const stub = vi.hoisted(() => {
  const deleted: string[] = [];
  const executed: string[] = [];
  const tx = {
    delete: (table: Table) => {
      deleted.push(getTableName(table));
      return { where: async () => {} };
    },
    insert: () => ({ values: async () => {} }),
    // The holdings the replace finds before it deletes: none, so the write is a first fill.
    select: () => ({ from: () => ({ where: async () => [] }) }),
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
