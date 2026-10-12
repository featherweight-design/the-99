// The questions the Costs core asks `model_calls`, rendered without a database. Both selects name
// one table, so every column must come out qualified and every month bound must be a parameter.
import { describe, expect, it } from "vitest";
import { dayRowsQuery, monthFiguresQuery } from "./costs";

const PREV = new Date("2026-09-01T00:00:00Z");
const START = new Date("2026-10-01T00:00:00Z");
const END = new Date("2026-11-01T00:00:00Z");

describe("dayRowsQuery", () => {
  it("groups the month's rows by UTC day and origin, half-open on the month", () => {
    const q = dayRowsQuery(START, END).toSQL();
    expect(q.sql).toContain(`extract(day from "model_calls"."created_at")::int`);
    expect(q.sql).toContain(`coalesce(sum("model_calls"."cost_micro_usd"), 0)`);
    expect(q.sql).toMatch(/where \("model_calls"\."created_at" >= \$1 and "model_calls"\."created_at" < \$2\)/);
    expect(q.sql).toMatch(/group by extract\(day from "model_calls"\."created_at"\)::int, "model_calls"\."origin"$/);
    // No origin filter: system rows are drawn too, on their own.
    expect(q.sql).not.toContain(`"origin" =`);
  });
});

describe("monthFiguresQuery", () => {
  it("reads both months in one pass, each figure filtered to its own month", () => {
    const q = monthFiguresQuery(PREV, START, END, "user_owner").toSQL();
    expect(q.sql).toContain(`(count(distinct "model_calls"."user_id") filter (where "model_calls"."created_at" >= $1 and "model_calls"."origin" = 'player'))::int`);
    expect(q.sql).toContain(`coalesce(sum("model_calls"."cost_micro_usd") filter (where "model_calls"."created_at" >= $`);
    expect(q.sql).toContain(`"model_calls"."user_id" = $`);
    expect(q.sql).toContain(`count(*) filter (where "model_calls"."created_at" < $`);
    expect(q.sql).toMatch(/where \("model_calls"\."created_at" >= \$\d+ and "model_calls"\."created_at" < \$\d+\)$/);
    expect(q.params).toEqual(expect.arrayContaining(["user_owner"]));
    // No bare column anywhere: every name is the table's.
    expect(q.sql).not.toMatch(/[(\s]"(user_id|created_at|cost_micro_usd|origin)"/);
  });
});
