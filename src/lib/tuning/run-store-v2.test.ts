// Suggested changes v2's writes (plan 2026-10-27, PR 3), rendered: what each statement asks is pinned here, since a
// correlated subquery written the obvious way compares a row's key to its own (AGENTS.md's Drizzle rule). What they
// write against a real Postgres is the probe's.
import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { and, eq } from "drizzle-orm";

vi.mock("../../db", () => ({ db: {} }));

import { db } from "../../db";
import { deckSuggestionRuns } from "../../db/schema";
import { insertV2LineSql, v2HasItems, v2InterruptedReport } from "./run-store";

const dialect = new PgDialect();
const render = (q: Parameters<PgDialect["sqlToQuery"]>[0]) => dialect.sqlToQuery(q);
void db;

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
