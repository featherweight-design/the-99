// The questions the Costs core asks `model_calls`, rendered without a database. Both selects name
// one table, so every column must come out qualified and every month bound must be a parameter.
// `EXPORTED_QUERIES` lists every query this file exports, and each is held to the no-bare-column rule.
import { describe, expect, it } from "vitest";
import { callRowsQuery, dayRowsQuery, labelRunsQuery, monthFiguresQuery, partRowsQuery } from "./costs";

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

// A column name standing alone, not after `"model_calls".`: what Drizzle emits for a bare column
// object in a single-table select's projection.
const BARE = /(^|[^.])"(id|user_id|created_at|cost_micro_usd|origin|feature|status|model|call_id|step|effort|run_id|in_tokens|out_tokens|cache_write_tokens|cache_read_tokens|intended_at)"/;

const EXPORTED_QUERIES = {
  dayRowsQuery: () => dayRowsQuery(START, END).toSQL(),
  monthFiguresQuery: () => monthFiguresQuery(PREV, START, END, "user_owner").toSQL(),
  callRowsQuery: () => callRowsQuery(START, END).toSQL(),
  partRowsQuery: () => partRowsQuery(START, END).toSQL(),
  labelRunsQuery: () => labelRunsQuery(START, END).toSQL(),
};

describe("every exported query", () => {
  it("names the queries this file exports", async () => {
    const mod = await import("./costs");
    const queries = Object.keys(mod).filter((k) => k.endsWith("Query")).sort();
    expect(queries).toEqual(Object.keys(EXPORTED_QUERIES).sort());
  });

  it.each(Object.entries(EXPORTED_QUERIES))("%s: no bare column anywhere, every name is the table's", (_name, render) => {
    const { sql } = render();
    expect(sql).not.toMatch(BARE);
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

describe("the detail's queries", () => {
  it("callRowsQuery reads the month's runs, every column the table's", () => {
    const q = callRowsQuery(START, END).toSQL();
    expect(q.sql).toMatch(/^select "model_calls"\."id", "model_calls"\."user_id", .*"model_calls"\."cost_micro_usd", "model_calls"\."created_at" from "model_calls"/);
    expect(q.sql).toMatch(/where \("model_calls"\."created_at" >= \$1 and "model_calls"\."created_at" < \$2\)$/);
    expect(q.params).toEqual([START.toISOString(), END.toISOString()]);
  });

  it("partRowsQuery takes a part into its RUN's month, through the join", () => {
    const q = partRowsQuery(START, END).toSQL();
    expect(q.sql).toContain(`inner join "model_calls" on "model_calls"."id" = "model_call_parts"."call_id"`);
    expect(q.sql).toContain(`"model_call_parts"."effort", "model_call_parts"."cost_micro_usd"`);
    expect(q.sql).toMatch(/where \("model_calls"\."created_at" >= \$1 and "model_calls"\."created_at" < \$2\)$/);
    expect(q.sql).not.toContain(`"model_call_parts"."created_at"`);
  });

  it("labelRunsQuery groups the month's chunks by run and model, counting the collected ones", () => {
    const q = labelRunsQuery(START, END).toSQL();
    expect(q.sql).toContain(`count("card_label_batches"."in_tokens")::int`);
    expect(q.sql).toContain(`coalesce(sum("card_label_batches"."out_tokens"), 0)`);
    expect(q.sql).toContain(`min("card_label_batches"."intended_at")`);
    // Open and expired by status, as the ledger counts them, never by a null meter.
    expect(q.sql).toContain(`count(*) filter (where "card_label_batches"."status" in ('intended', 'submitted', 'in_progress'))`);
    expect(q.sql).toContain(`count(*) filter (where "card_label_batches"."status" = 'expired')`);
    expect(q.sql).toMatch(/where \("card_label_batches"\."intended_at" >= \$1 and "card_label_batches"\."intended_at" < \$2\) group by "card_label_batches"\."run_id", "card_label_batches"\."model"$/);
  });
});
