import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName, type Table } from "drizzle-orm";

const rec = vi.hoisted(() => ({ log: [] as string[], tablesExist: true }));

vi.mock("../../db", () => {
  const tx = {
    delete: (table: Table) => ({ where: async () => { rec.log.push(`delete:${getTableName(table)}`); } }),
    insert: () => ({ values: async () => {} }),
    update: () => ({ set: () => ({ where: () => ({ returning: async () => [{ id: "u" }] }) }) }),
    execute: async () => ({ rows: [] }),
  };
  return { db: { transaction: async (fn: (t: typeof tx) => Promise<void>) => fn(tx) } };
});
vi.mock("../tokens/ownership", async (orig) => ({
  ...(await orig<typeof import("../tokens/ownership")>()),
  tokenOwnershipTablesExist: vi.fn(async () => rec.tablesExist),
  writeUploadTokens: vi.fn(async (_tx: unknown, userId: string, uploadId: string, mode: string, holdings: unknown[]) => {
    rec.log.push(`tokens:${userId}:${uploadId}:${mode}:${holdings.length}`);
  }),
}));
vi.mock("../tokens/publish", () => ({ tokenTablesExist: vi.fn(async () => true) }));

import { replaceCollection } from "./import";

const T = [{ tokenOracleId: "11111111-1111-4111-8111-111111111111", quantity: 2 }];

describe("replaceCollection and tokens", () => {
  beforeEach(() => { rec.log = []; rec.tablesExist = true; });

  it("records the upload's tokens in the same transaction, after the collection is replaced", async () => {
    await replaceCollection("u1", [], { confirmUploadId: "up1", tokens: T });
    expect(rec.log).toEqual(["delete:collection_items", "tokens:u1:up1:replace:1", "delete:commander_scores"]);
  });

  it("writes the marker for an upload that read no token (an empty list, not an absent one)", async () => {
    await replaceCollection("u1", [], { confirmUploadId: "up1", tokens: [] });
    expect(rec.log).toContain("tokens:u1:up1:replace:0");
    rec.log = [];
    await replaceCollection("u1", [], { confirmUploadId: "up1" });
    expect(rec.log).toContain("tokens:u1:up1:replace:0");
  });

  it("records nothing for a replace that is not an upload (the seed CLI)", async () => {
    await replaceCollection("u1", [], { tokens: T });
    expect(rec.log.some((l) => l.startsWith("tokens:"))).toBe(false);
  });

  it("still replaces the collection where the ownership tables do not exist yet", async () => {
    rec.tablesExist = false;
    await replaceCollection("u1", [], { confirmUploadId: "up1", tokens: T });
    expect(rec.log).toEqual(["delete:collection_items", "delete:commander_scores"]);
  });
});
