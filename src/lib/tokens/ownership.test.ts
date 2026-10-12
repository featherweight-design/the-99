import { describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const dbStub = vi.hoisted(() => ({ wheres: [] as unknown[] }));
vi.mock("../../db", () => ({
  db: { delete: () => ({ where: (w: unknown) => { dbStub.wheres.push(w); return { returning: async () => [{ id: "x" }] }; } }) },
}));

import { aggregateTokenRows, recordUploadTokens, tokenOwnershipState, unmarkTokenOwned, writeUploadTokens } from "./ownership";

const T1 = "11111111-1111-4111-8111-111111111111";
const T2 = "22222222-2222-4222-8222-222222222222";
const dialect = new PgDialect();

describe("tokenOwnershipState", () => {
  it("is owned whenever the token is held, read or not", () => {
    expect(tokenOwnershipState(true, false)).toBe("owned");
    expect(tokenOwnershipState(true, true)).toBe("owned");
  });
  it("is not owned only once the account has been read", () => {
    expect(tokenOwnershipState(false, true)).toBe("not");
  });
  it("is unknown before any read, however many tokens are marked", () => {
    expect(tokenOwnershipState(false, false)).toBe("unknown");
  });
});

describe("aggregateTokenRows", () => {
  it("sums every printing of a token into one holding, sorted for a stable payload", () => {
    expect(aggregateTokenRows([
      { tokenOracleId: T2, quantity: 1 }, { tokenOracleId: T1, quantity: 2 }, { tokenOracleId: T2, quantity: 4 },
    ])).toEqual([{ tokenOracleId: T1, quantity: 2 }, { tokenOracleId: T2, quantity: 5 }]);
  });
  it("drops a row with no usable count rather than recording a token the file did not hold", () => {
    expect(aggregateTokenRows([
      { tokenOracleId: T1, quantity: 0 }, { tokenOracleId: T1, quantity: -1 }, { tokenOracleId: T1, quantity: 1.5 }, { tokenOracleId: T1, quantity: Number.NaN },
    ])).toEqual([]);
  });
  it("is empty for no tokens", () => expect(aggregateTokenRows([])).toEqual([]));
});

function recorder() {
  const log: { op: string; table: string; rows?: unknown[]; set?: Record<string, unknown> }[] = [];
  const tx = {
    delete: (table: object) => ({ where: async () => { log.push({ op: "delete", table: getTableName(table as never) }); } }),
    insert: (table: object) => ({
      values: (rows: unknown[]) => ({
        onConflictDoUpdate: async (arg: { set: Record<string, unknown> }) => {
          log.push({ op: "upsert", table: getTableName(table as never), rows: Array.isArray(rows) ? rows : [rows], set: arg.set });
        },
      }),
    }),
  };
  return { tx: tx as never, log };
}
const render = (q: unknown) => dialect.sqlToQuery(q as SQL).sql;

describe("writeUploadTokens", () => {
  it("Replace removes the upload rows first, then writes the holdings, then the marker", async () => {
    const { tx, log } = recorder();
    await writeUploadTokens(tx, "u1", "up1", "replace", [{ tokenOracleId: T1, quantity: 3 }]);
    expect(log.map((l) => `${l.op}:${l.table}`)).toEqual(["delete:token_ownership", "upsert:token_ownership", "upsert:token_reads"]);
    expect(log[1].rows).toEqual([{ userId: "u1", tokenOracleId: T1, quantity: 3, source: "upload" }]);
  });

  it("writes the read marker even for an upload that held no token", async () => {
    const { tx, log } = recorder();
    await writeUploadTokens(tx, "u1", "up1", "replace", []);
    expect(log.map((l) => `${l.op}:${l.table}`)).toEqual(["delete:token_ownership", "upsert:token_reads"]);
    expect(log[1].rows).toEqual([{ userId: "u1", uploadId: "up1" }]);
  });

  it("Add deletes nothing and accumulates onto an upload row only", async () => {
    const { tx, log } = recorder();
    await writeUploadTokens(tx, "u1", "up1", "add", [{ tokenOracleId: T1, quantity: 2 }]);
    expect(log.some((l) => l.op === "delete")).toBe(false);
    const quantity = render(log[0].set!.quantity);
    expect(quantity).toContain("case when");
    expect(quantity).toMatch(/"token_ownership"."source" = 'upload'/);
    expect(quantity).toMatch(/"token_ownership"."quantity" \+ excluded.quantity/);
  });

  it("Replace takes exactly what the upload read, whatever row it meets", async () => {
    const { tx, log } = recorder();
    await writeUploadTokens(tx, "u1", "up1", "replace", [{ tokenOracleId: T1, quantity: 2 }]);
    expect(render(log[1].set!.quantity)).toBe("excluded.quantity");
  });

  it("turns a hand mark the upload also read into an upload row, in both modes", async () => {
    for (const mode of ["replace", "add"] as const) {
      const { tx, log } = recorder();
      await writeUploadTokens(tx, "u1", "up1", mode, [{ tokenOracleId: T1, quantity: 2 }]);
      expect(render(log.find((l) => l.op === "upsert" && l.table === "token_ownership")!.set!.source)).toBe("'upload'");
    }
  });

  it("only ever deletes UPLOAD rows, never a hand mark", async () => {
    const calls: unknown[] = [];
    const tx = {
      delete: () => ({ where: async (w: unknown) => { calls.push(w); } }),
      insert: () => ({ values: () => ({ onConflictDoUpdate: async () => {} }) }),
    };
    await writeUploadTokens(tx as never, "u1", "up1", "replace", []);
    const text = render(calls[0]);
    expect(text).toContain('"token_ownership"."source" = $');
    // The bound value is the source it deletes.
    expect(dialect.sqlToQuery(calls[0] as SQL).params).toContain("upload");
    expect(dialect.sqlToQuery(calls[0] as SQL).params).not.toContain("manual");
  });

  it("writes the holdings in batches that cross the boundary", async () => {
    const { tx, log } = recorder();
    const holdings = Array.from({ length: 1_100 }, (_, i) => ({ tokenOracleId: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`, quantity: 1 }));
    await writeUploadTokens(tx, "u1", "up1", "replace", holdings);
    expect(log.filter((l) => l.op === "upsert" && l.table === "token_ownership").map((l) => l.rows!.length)).toEqual([500, 500, 100]);
  });
});

describe("recordUploadTokens", () => {
  const withTables = (ok: boolean) => {
    const { tx, log } = recorder();
    return { tx: { ...(tx as object), execute: async () => ({ rows: [{ ok }] }) } as never, log };
  };

  it("writes the holdings and the marker for an upload that read tokens", async () => {
    const { tx, log } = withTables(true);
    await recordUploadTokens(tx, "u1", "up1", "replace", [{ tokenOracleId: T1, quantity: 2 }]);
    expect(log.some((l) => (l as { table?: string }).table === "token_reads")).toBe(true);
  });

  it("writes the marker for an upload that read an EMPTY list", async () => {
    const { tx, log } = withTables(true);
    await recordUploadTokens(tx, "u1", "up1", "add", []);
    expect(log.some((l) => (l as { table?: string }).table === "token_reads")).toBe(true);
  });

  it("writes nothing when the confirm read no tokens at all (absent), the marker included", async () => {
    const { tx, log } = withTables(true);
    await recordUploadTokens(tx, "u1", "up1", "replace", undefined);
    expect(log).toEqual([]);
  });

  it("writes nothing without an upload id, or where the tables do not exist yet", async () => {
    const a = withTables(true);
    await recordUploadTokens(a.tx, "u1", undefined, "add", [{ tokenOracleId: T1, quantity: 1 }]);
    const b = withTables(false);
    await recordUploadTokens(b.tx, "u1", "up1", "replace", []);
    expect([...a.log, ...b.log]).toEqual([]);
  });
});

describe("unmarkTokenOwned", () => {
  it("deletes only a HAND mark: the predicate pins the user, the token and source = manual", async () => {
    dbStub.wheres.length = 0;
    expect(await unmarkTokenOwned("u1", T1)).toBe(1);
    const q = dialect.sqlToQuery(dbStub.wheres[0] as SQL);
    expect(q.sql).toContain('"token_ownership"."user_id" = $');
    expect(q.sql).toContain('"token_ownership"."token_oracle_id" = $');
    expect(q.sql).toContain('"token_ownership"."source" = $');
    expect(q.params).toEqual(["u1", T1, "manual"]);
  });
});
