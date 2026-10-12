import { beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({ tablesExist: true, tokenCount: 5, tokenQueries: 0 }));

vi.mock("../../db", () => {
  // Every select resolves to no rows; the token_printings select is counted by its table name.
  const chain = (name?: string) => {
    const q: Record<string, unknown> = {};
    q.from = (t: object) => chain(Object.getOwnPropertySymbols(t).map((s) => String((t as Record<symbol, unknown>)[s])).join(" "));
    q.where = () => {
      if (name && name.includes("token_printings")) stub.tokenQueries++;
      return Promise.resolve([]);
    };
    q.then = (res: (v: unknown[]) => unknown) => Promise.resolve([]).then(res);
    return q;
  };
  return { db: { select: () => chain() } };
});
vi.mock("../tokens/publish", () => ({
  tokenTablesExist: vi.fn(async () => stub.tablesExist),
  countTokenPrintings: vi.fn(async () => stub.tokenCount),
}));

import { loadMatchInputs } from "./import";

const ID = "11111111-1111-4111-8111-111111111111";
const row = (scryfallId: string | null) => ({ name: "Treasure", setCode: "tlea", quantity: 1, scryfallId, line: 1 }) as never;

describe("loadMatchInputs: did the token lookup run", () => {
  beforeEach(() => { stub.tablesExist = true; stub.tokenCount = 5; stub.tokenQueries = 0; });

  it("reports it ran when rows carry printing ids and a catalog is published", async () => {
    expect((await loadMatchInputs([row(ID)])).indexes.tokensRead).toBe(true);
    expect(stub.tokenQueries).toBe(1);
  });

  it("reports it did NOT run for a paste (no printing ids), whatever the catalog holds", async () => {
    expect((await loadMatchInputs([row(null)])).indexes.tokensRead).toBeFalsy();
    expect(stub.tokenQueries).toBe(0);
  });

  it("reports it did NOT run where the catalog is migrated but empty, or absent", async () => {
    stub.tokenCount = 0;
    expect((await loadMatchInputs([row(ID)])).indexes.tokensRead).toBe(false);
    stub.tokenCount = 5; stub.tablesExist = false;
    expect((await loadMatchInputs([row(ID)])).indexes.tokensRead).toBe(false);
    expect(stub.tokenQueries).toBe(0);
  });
});
