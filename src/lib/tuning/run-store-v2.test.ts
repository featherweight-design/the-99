// Suggested changes v2's writes (plan 2026-10-27, PR 3), rendered: what each statement asks is pinned here, since a
// correlated subquery written the obvious way compares a row's key to its own (AGENTS.md's Drizzle rule). What they
// write against a real Postgres is the probe's.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { and, eq } from "drizzle-orm";

// A transaction stand-in that renders every statement it is handed, in order, so the lock's place is pinned.
const tx = vi.hoisted(() => ({ log: [] as string[], lockRows: [{ id: "run_1" }] as unknown[], updateRows: [{ id: "run_1", callId: "call_1" }] as unknown[] }));
vi.mock("../../db", async () => {
  const { PgDialect: D } = await import("drizzle-orm/pg-core");
  const d = new D();
  const chain = (rows: unknown[]) => {
    const c: Record<string, unknown> = {};
    for (const k of ["set", "where"]) c[k] = () => c;
    c.returning = async () => rows;
    return c;
  };
  const t = {
    execute: async (q: Parameters<typeof d.sqlToQuery>[0]) => {
      const text = d.sqlToQuery(q).sql;
      tx.log.push(/for update/.test(text) ? "lock" : /^\s*insert/.test(text) ? "insert" : text);
      return { rows: /for update/.test(text) ? tx.lockRows : [{ id: "item_1" }] };
    },
    update: () => { tx.log.push("update"); return chain(tx.updateRows); },
  };
  return { db: { transaction: async (fn: (t: unknown) => Promise<unknown>) => fn(t) } };
});
vi.mock("../model/allowance", () => ({
  AllowanceSpentError: class extends Error {},
  reserveModelCall: async () => ({ id: "call_1" }),
  recordModelUsage: async () => { tx.log.push("recordLate"); },
  settleModelCall: async () => { tx.log.push("settle"); },
}));

import { db } from "../../db";
import { deckSuggestionRuns } from "../../db/schema";
import { failV2Run, insertV2Line, insertV2LineSql, lockPendingV2RunsSql, persistV2, v2HasItems, v2InterruptedReport } from "./run-store";

const dialect = new PgDialect();
const render = (q: Parameters<PgDialect["sqlToQuery"]>[0]) => dialect.sqlToQuery(q);
void db;

const LINE = { addOracleId: "a", cutOracleId: null, rationale: "r", rationaleShort: "s", evidence: [], position: 0, bracketAfter: null };

describe("the run row's lock (PR #2316 review)", () => {
  beforeEach(() => {
    tx.log = [];
    tx.lockRows = [{ id: "run_1" }];
    tx.updateRows = [{ id: "run_1", callId: "call_1" }];
  });

  it("locks the scope's pending runs for update, qualified on the run table", () => {
    const q = render(lockPendingV2RunsSql(eq(deckSuggestionRuns.id, "run_1")));
    expect(q.sql).toMatch(/select "deck_suggestion_runs"\.id from "deck_suggestion_runs"\s+where "deck_suggestion_runs"\."id" = \$1 and "deck_suggestion_runs"\.status = 'pending'\s+for update$/);
    expect(q.params).toEqual(["run_1"]);
  });

  it("a line insert takes the run's lock first, in its own transaction, and inserts only while the run is pending", async () => {
    expect(await insertV2Line("run_1", LINE)).toBe(true);
    expect(tx.log).toEqual(["lock", "insert"]);
    tx.log = [];
    tx.lockRows = [];
    expect(await insertV2Line("run_1", LINE)).toBe(false);
    expect(tx.log).toEqual(["lock"]);
  });

  it("persistV2 locks the run row before it settles it", async () => {
    expect(await persistV2({ runId: "run_1", callId: "call_1" }, { status: "ok" }, { askedCount: 1, survivedCount: 1, keptCount: 1, hadNotes: false, drops: [] }, "spent", [])).toBe(true);
    expect(tx.log).toEqual(["lock", "update", "settle"]);
  });

  it("failV2Run locks the run row before the partial settle reads its saved lines", async () => {
    expect(await failV2Run({ runId: "run_1", callId: "call_1" }, [])).toBe(true);
    expect(tx.log.slice(0, 2)).toEqual(["lock", "update"]);
  });
});

describe("insertV2LineSql", () => {
  it("writes the line only while its run is pending, with its own list's position", () => {
    const q = render(insertV2LineSql("run_1", {
      addOracleId: "a", cutOracleId: null, rationale: "r", rationaleShort: "s", evidence: [{ kind: "request", value: "v" }], position: 4, bracketAfter: [3, 4],
    }));
    expect(q.sql).toMatch(/insert into "deck_suggestion_items"\s+\(run_id, add_oracle_id, cut_oracle_id, rationale, rationale_short, evidence, position, bracket_after\)/);
    expect(q.sql).toContain(`where exists (select 1 from "deck_suggestion_runs" r where r.id = $9 and r.status = 'pending')`);
    expect(q.params).toEqual(["run_1", "a", null, "r", "s", JSON.stringify([{ kind: "request", value: "v" }]), 4, [3, 4], "run_1"]);
  });

  it("writes a null bracket flag as null", () => {
    const q = render(insertV2LineSql("run_1", { addOracleId: null, cutOracleId: "c", rationale: "r", rationaleShort: "s", evidence: [], position: 0, bracketAfter: null }));
    expect(q.sql).toContain(", null\n");
  });
});

describe("the interrupted settle's subqueries", () => {
  it("qualify the run on the outer side, never the item's own id", () => {
    const where = render(and(eq(deckSuggestionRuns.id, "run_1"), v2HasItems())!);
    expect(where.sql).toContain(`exists (select 1 from "deck_suggestion_items" si where si.run_id = "deck_suggestion_runs".id)`);
    const report = render(v2InterruptedReport()).sql;
    expect(report).toContain(`(select count(*) from "deck_suggestion_items" si where si.run_id = "deck_suggestion_runs".id)::int`);
    expect(report).toContain(`'interrupted', true`);
    expect(report).toContain(`'refunded', true`);
  });
});
