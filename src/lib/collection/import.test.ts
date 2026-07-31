import { describe, expect, it, vi } from "vitest";
import { getTableName, type Table } from "drizzle-orm";

const stub = vi.hoisted(() => {
  const deleted: string[] = [];
  const tx = {
    delete: (table: Table) => {
      deleted.push(getTableName(table));
      return { where: async () => {} };
    },
    insert: () => ({ values: async () => {} }),
    update: () => ({ set: () => ({ where: async () => {} }) }),
  };
  return {
    deleted,
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
});
