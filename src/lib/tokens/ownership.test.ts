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
  it("keeps each printing's count beside the token's sum (token printings TP1)", () => {
    expect(aggregateTokenRows([
      { tokenOracleId: T1, tokenPrintingId: "pb", quantity: 1 }, { tokenOracleId: T1, tokenPrintingId: "pa", quantity: 2 },
      { tokenOracleId: T1, tokenPrintingId: "pb", quantity: 3 }, { tokenOracleId: T1, tokenPrintingId: null, quantity: 1 },
    ])).toEqual([{ tokenOracleId: T1, quantity: 7, printings: [{ tokenPrintingId: "pa", quantity: 2 }, { tokenPrintingId: "pb", quantity: 4 }] }]);
  });
  it("drops a row with no usable count rather than recording a token the file did not hold", () => {
    expect(aggregateTokenRows([
      { tokenOracleId: T1, quantity: 0 }, { tokenOracleId: T1, quantity: -1 }, { tokenOracleId: T1, quantity: 1.5 }, { tokenOracleId: T1, quantity: Number.NaN },
    ])).toEqual([]);
  });
  it("is empty for no tokens", () => expect(aggregateTokenRows([])).toEqual([]));
});

function recorder() {
  const log: { op: string; table: string; rows?: unknown[]; set?: Record<string, unknown>; where?: unknown }[] = [];
  const tx = {
    delete: (table: object) => ({ where: async (where?: unknown) => { log.push({ op: "delete", table: getTableName(table as never), where }); } }),
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
  it("Replace takes the joins first (the hand mark's lock order), then removes the upload rows, then writes the holdings and the marker", async () => {
    const { tx, log } = recorder();
    await writeUploadTokens(tx, "u1", "up1", "replace", [{ tokenOracleId: T1, quantity: 3, printings: [{ tokenPrintingId: "pa", quantity: 3 }] }]);
    expect(log.map((l) => `${l.op}:${l.table}`)).toEqual([
      "delete:deck_token_joins", "delete:deck_token_joins", "delete:token_ownership", "delete:token_printing_holdings",
      "upsert:token_ownership", "upsert:token_printing_holdings", "upsert:token_reads",
    ]);
    expect(log[4].rows).toEqual([{ userId: "u1", tokenOracleId: T1, quantity: 3, source: "upload" }]);
    // The printings beside them, under the upload's own source.
    expect(log[5].rows).toEqual([{ userId: "u1", tokenPrintingId: "pa", source: "upload", quantity: 3 }]);
  });

  it("Replace clears the joins of every token whose upload row it drops, a hand mark's none (it has no upload row)", async () => {
    const { tx, log } = recorder();
    await writeUploadTokens(tx, "u1", "up1", "replace", []);
    const q = dialect.sqlToQuery(log.find((l) => l.op === "delete" && l.table === "deck_token_joins")!.where as SQL);
    // By the player, over exactly the tokens held by an UPLOAD row: a hand mark's row is source 'manual'.
    expect(q.sql).toContain('"deck_token_joins"."user_id" =');
    expect(q.sql).toContain('select "token_ownership"."token_oracle_id" from "token_ownership"');
    expect(q.sql).toContain("'upload'");
    expect(q.params).toContain("u1");
    expect(q.sql).not.toContain("'manual'");
  });

  it("Add leaves the joins of tokens it does not read alone", async () => {
    const { tx, log } = recorder();
    await writeUploadTokens(tx, "u1", "up1", "add", []);
    expect(log.some((l) => l.op === "delete" && l.table === "deck_token_joins")).toBe(false);
  });

  it("writes the read marker even for an upload that held no token", async () => {
    const { tx, log } = recorder();
    await writeUploadTokens(tx, "u1", "up1", "replace", []);
    expect(log.map((l) => `${l.op}:${l.table}`)).toEqual(["delete:deck_token_joins", "delete:token_ownership", "delete:token_printing_holdings", "upsert:token_reads"]);
    expect(log[3].rows).toEqual([{ userId: "u1", uploadId: "up1" }]);
  });

  it("Add removes no ownership row and accumulates onto an upload row only", async () => {
    const { tx, log } = recorder();
    await writeUploadTokens(tx, "u1", "up1", "add", [{ tokenOracleId: T1, quantity: 2 }]);
    expect(log.some((l) => l.op === "delete" && l.table === "token_ownership")).toBe(false);
    const quantity = render(log.find((l) => l.op === "upsert" && l.table === "token_ownership")!.set!.quantity);
    expect(quantity).toContain("case when");
    expect(quantity).toMatch(/"token_ownership"."source" = 'upload'/);
    expect(quantity).toMatch(/"token_ownership"."quantity" \+ excluded.quantity/);
  });

  it("Replace takes exactly what the upload read, whatever row it meets", async () => {
    const { tx, log } = recorder();
    await writeUploadTokens(tx, "u1", "up1", "replace", [{ tokenOracleId: T1, quantity: 2 }]);
    expect(render(log.find((l) => l.op === "upsert" && l.table === "token_ownership")!.set!.quantity)).toBe("excluded.quantity");
  });

  it("takes a token the upload read off every deck's Shopping list, in both modes, and only that token", async () => {
    for (const mode of ["replace", "add"] as const) {
      const calls: unknown[] = [];
      const { tx } = recorder();
      const spy = { ...(tx as object), delete: (t: object) => ({ where: async (w: unknown) => { if (getTableName(t as never) === "deck_token_joins") calls.push(w); } }) };
      await writeUploadTokens(spy as never, "u1", "up1", mode, [{ tokenOracleId: T1, quantity: 2 }, { tokenOracleId: T2, quantity: 1 }]);
      // Replace also clears the joins of the tokens whose upload rows it drops (the subquery delete); the one that
      // names the tokens READ is the one with their ids bound.
      const read = calls.filter((c) => dialect.sqlToQuery(c as SQL).params.includes(T1));
      expect(read).toHaveLength(1);
      expect(calls).toHaveLength(mode === "replace" ? 2 : 1);
      const q = dialect.sqlToQuery(read[0] as SQL);
      expect(q.sql).toContain('"deck_token_joins"."user_id" = $');
      expect(q.params).toEqual(expect.arrayContaining(["u1", T1, T2]));
      expect(q.sql).not.toContain('"deck_id"');
    }
  });

  it("deletes no join for an upload that read no token", async () => {
    const { tx, log } = recorder();
    await writeUploadTokens(tx, "u1", "up1", "add", []);
    expect(log.some((l) => l.table === "deck_token_joins")).toBe(false);
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
    // The join cleanup comes first; the ownership delete is the one that names the source.
    const own = calls.find((c) => render(c).includes('"token_ownership"."source" = $'))!;
    expect(own).toBeDefined();
    // The bound value is the source it deletes.
    expect(dialect.sqlToQuery(own as SQL).params).toContain("upload");
    expect(dialect.sqlToQuery(own as SQL).params).not.toContain("manual");
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
    const select = () => ({ from: (table: object) => ({ where: async () => { log.push({ op: "select", table: getTableName(table as never) }); return []; } }) });
    return { tx: { ...(tx as object), execute: async () => ({ rows: [{ ok }] }), select } as never, log };
  };

  it("writes the holdings and the marker for an upload that read tokens", async () => {
    const { tx, log } = withTables(true);
    await recordUploadTokens(tx, "u1", "up1", "replace", [{ tokenOracleId: T1, quantity: 2 }]);
    expect(log.some((l) => (l as { table?: string }).table === "token_reads")).toBe(true);
  });

  it("lets a standing precon add claim back what a Replace dropped, after the upload's own writes; an Add does not", async () => {
    const replace = withTables(true);
    await recordUploadTokens(replace.tx, "u1", "up1", "replace", []);
    const reads = replace.log.map((l) => `${l.op}:${l.table}`);
    expect(reads.indexOf("select:collection_history")).toBeGreaterThan(reads.indexOf("upsert:token_reads"));
    const add = withTables(true);
    await recordUploadTokens(add.tx, "u1", "up1", "add", []);
    expect(add.log.some((l) => l.op === "select")).toBe(false);
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
