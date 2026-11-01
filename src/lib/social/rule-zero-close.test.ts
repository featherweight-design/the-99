// closeTable's atomicity, behaviourally: the answer is the row count of ONE guarded UPDATE ... RETURNING, and the guard
// handed to it is the open predicate. The db is faked; what is asserted is what the function does with its answer.
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ rows: [] as { id: string }[], wheres: [] as unknown[], sets: [] as unknown[] }));

vi.mock("../../db", () => ({
  db: {
    update: () => ({
      set: (v: unknown) => {
        state.sets.push(v);
        return { where: (w: unknown) => { state.wheres.push(w); return { returning: async () => state.rows }; } };
      },
    }),
  },
}));

import { closeTable } from "./rule-zero";

const VIEWER = "user_viewer";
const TABLE = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";

beforeEach(() => {
  state.rows = [];
  state.wheres = [];
  state.sets = [];
});

describe("closeTable", () => {
  it("answers true when the guarded update wrote exactly one row", async () => {
    state.rows = [{ id: TABLE }];
    expect(await closeTable(VIEWER, TABLE)).toBe(true);
    expect(state.sets).toHaveLength(1);
  });

  it("answers false when the guard matched nothing (non-setter, unknown, already closed, expired, lapsed seat)", async () => {
    state.rows = [];
    expect(await closeTable(VIEWER, TABLE)).toBe(false);
  });

  it("is one statement whose WHERE carries the setter, the open predicate and the seat", async () => {
    state.rows = [{ id: TABLE }];
    await closeTable(VIEWER, TABLE);
    expect(state.wheres).toHaveLength(1);
    const q = new PgDialect().sqlToQuery(state.wheres[0] as Parameters<PgDialect["sqlToQuery"]>[0]);
    expect(q.sql).toContain(`"rule_zero_tables"."set_by" = $`);
    expect(q.sql).toContain(`("rule_zero_tables"."closed_at" is null and "rule_zero_tables"."expires_at" > now())`);
    expect(q.sql).toContain("(gt.closed_at is null and gt.expires_at > now())");
    expect(q.params).toContain(VIEWER);
  });

  it("writes nothing for a malformed id", async () => {
    expect(await closeTable(VIEWER, "nope")).toBe(false);
    expect(state.sets).toHaveLength(0);
  });
});
