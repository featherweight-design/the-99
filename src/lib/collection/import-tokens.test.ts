import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName, type Table } from "drizzle-orm";

const rec = vi.hoisted(() => ({ log: [] as string[] }));

vi.mock("../../db", () => {
  const tx = {
    delete: (table: Table) => ({ where: async () => { rec.log.push(`delete:${getTableName(table)}`); } }),
    insert: () => ({ values: async () => {} }),
    // The holdings the replace finds before it deletes: none, so the write is a first fill.
    select: () => ({ from: () => ({ where: async () => [] }) }),
    update: () => ({ set: () => ({ where: () => ({ returning: async () => [{ id: "u" }] }) }) }),
    execute: async () => ({ rows: [] }),
  };
  return { db: { transaction: async (fn: (t: typeof tx) => Promise<void>) => fn(tx) } };
});
vi.mock("../tokens/ownership", async (orig) => ({
  ...(await orig<typeof import("../tokens/ownership")>()),
  recordUploadTokens: vi.fn(async (_tx: unknown, userId: string, uploadId: string | undefined, mode: string, tokens?: unknown[]) => {
    rec.log.push(`tokens:${userId}:${uploadId}:${mode}:${tokens ? tokens.length : "absent"}`);
  }),
}));
vi.mock("../tokens/publish", () => ({ tokenTablesExist: vi.fn(async () => true) }));

import { replaceCollection } from "./import";

const T = [{ tokenOracleId: "11111111-1111-4111-8111-111111111111", quantity: 2 }];

describe("replaceCollection and tokens", () => {
  beforeEach(() => { rec.log = []; });

  it("hands the upload's tokens to the transaction, after the collection is replaced", async () => {
    await replaceCollection("u1", [], { confirmUploadId: "up1", tokens: T });
    expect(rec.log).toEqual(["delete:collection_items", "tokens:u1:up1:replace:1", "delete:commander_scores"]);
  });

  it("passes an empty list as a real read and an absent one as absent", async () => {
    await replaceCollection("u1", [], { confirmUploadId: "up1", tokens: [] });
    expect(rec.log).toContain("tokens:u1:up1:replace:0");
    rec.log = [];
    await replaceCollection("u1", [], { confirmUploadId: "up1" });
    expect(rec.log).toContain("tokens:u1:up1:replace:absent");
  });
});
