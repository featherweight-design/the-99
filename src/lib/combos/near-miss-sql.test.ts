import { PgDialect } from "drizzle-orm/pg-core";
import { describe, it, expect } from "vitest";
import { pairsWithOnePiece } from "./near-miss";

/**
 * THE EMITTED SQL, rendered rather than executed.
 *
 * These reads are handwritten SQL over three subtle invariants — the prune before the group,
 * the `must_be_commander` CASE, and the `::uuid[]` casts — and every one of them fails
 * SILENTLY when it breaks: a dropped cast is a type error at runtime on one deployment and a
 * missing prune is a query that still returns the right rows, slowly. The repo pins its other
 * handwritten readers this way for the same reason.
 *
 * This proves the QUESTION. `probe:*`-style verification against a real Postgres proves the
 * answer, and both readers were run against staging before this landed.
 */
const dialect = new PgDialect();
const render = (args: Parameters<typeof pairsWithOnePiece>[0]) =>
  dialect.sqlToQuery(pairsWithOnePiece(args)).sql.replace(/\s+/g, " ");

const base = {
  present: ["11111111-1111-1111-1111-111111111111"],
  commanders: ["22222222-2222-2222-2222-222222222222"],
  missingIn: null,
};

describe("pairsWithOnePiece — emitted SQL", () => {
  // RULE 1. A template-gated variant names a CATEGORY of card, not a card, so nothing can be
  // said to be one card away from it.
  it("excludes template-gated variants and keeps the two-row guard", () => {
    const sql = render(base);
    expect(sql).toContain("cardinality(v.requires_template_ids) = 0");
    // Unquoted: this is literal text in the template, not an interpolated column object —
    // which is also why the Drizzle qualification hazard in AGENTS.md cannot apply here.
    expect(sql).toContain("v.card_count = 2");
    // `having count(*) = 2` rather than the column alone: `card_count` keeps upstream's own
    // `uses` length while the table is deduped by oracle id, so a variant naming one card
    // twice would aggregate to a single piece.
    expect(sql).toContain("having count(*) = 2");
  });

  // THE PRUNE BEFORE THE GROUP. Without it every two-card variant in the index is aggregated
  // on every call and then thrown away — and the query still returns the right rows, so
  // nothing but this notices.
  it("prunes by oracle id before the aggregate", () => {
    const sql = render(base);
    const group = sql.indexOf("group by v.variant_id");
    const prune = sql.indexOf("exists (select 1 from");
    expect(prune, "no prune at all").toBeGreaterThan(-1);
    expect(prune, "the prune landed after the group, where it does nothing").toBeLessThan(group);
  });

  // RULES 2 AND 3, on the piece that IS present. A `must_be_commander` piece counts only when
  // it is actually a commander; the commanders count as held.
  it("keeps both arms of the must_be_commander case", () => {
    const sql = render(base);
    expect(sql).toContain("case when held.must_be_commander");
    // Both arms, against DIFFERENT lists — collapsing them to one is the false positive rule
    // 2 exists to prevent, and the shapes are otherwise identical.
    expect(sql).toMatch(/then held\.oracle_id = any\(\$\d+::uuid\[\]\)/);
    expect(sql).toMatch(/else held\.oracle_id = any\(\$\d+::uuid\[\]\)/);
  });

  // THE OTHER PIECE IS NOT PRESENT — this is the whole "near miss", and without it the query
  // returns combos the reader has already assembled.
  it("requires the other piece to be absent", () => {
    expect(render(base)).toContain("not (want.oracle_id = any(");
  });

  // EVERY ARRAY IS CAST. `= any($1)` without `::uuid[]` is a runtime type error against a uuid
  // column, and it is invisible until the query runs.
  it("casts every id array to uuid[]", () => {
    const sql = render(base);
    const anys = sql.match(/= any\(\$\d+[^)]*\)/g) ?? [];
    expect(anys.length).toBeGreaterThan(0);
    for (const a of anys) expect(a, `uncast array: ${a}`).toContain("::uuid[]");
  });

  // PARAMETERISED, never interpolated. The ids come from a signed-in reader's own collection,
  // but a query that inlines them is one refactor away from taking something else.
  it("parameterises the ids rather than inlining them", () => {
    const q = dialect.sqlToQuery(pairsWithOnePiece(base));
    // `toContainEqual`, because the parameter is the ARRAY: `toContain` compares by identity
    // and passes only by accident when the same reference is reused.
    expect(q.params).toContainEqual(base.present);
    expect(q.sql).not.toContain("11111111-1111-1111-1111-111111111111");
  });

  // THE CANDIDATE RESTRICTION IS OPTIONAL and must appear only when asked for: the collection
  // read has no candidate list, and a clause that leaked in would silently return nothing.
  it("adds the candidate restriction only when one is given", () => {
    // Matched as `and want…`, never as `want.oracle_id = any(` alone: the base query already
    // contains that fragment inside `not (want.oracle_id = any(…))`, the absence check every
    // near miss turns on, so the bare form is present on both sides and proves nothing.
    expect(render(base)).not.toMatch(/and want\.oracle_id = any\(/);
    const scoped = render({ ...base, missingIn: ["33333333-3333-3333-3333-333333333333"] });
    expect(scoped).toMatch(/and want\.oracle_id = any\(\$\d+::uuid\[\]\)/);
  });
});
