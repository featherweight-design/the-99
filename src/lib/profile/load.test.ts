// The combo join's emitted SQL, rendered rather than run.
//
// This query is handwritten with manual aliases, and every one of §4.3b's three rules lives
// in it rather than in any TypeScript a unit test could reach. The assembly is probe
// territory — only a database can say whether the right rows come back — but a dropped
// `must_be_commander` arm or a missing `::uuid[]` cast is visible here, without one.
//
// The repo's method for a bare `sql` template: `PgDialect.sqlToQuery`. A bare template has no
// `.toSQL()`, and the correlated-subquery section of AGENTS.md is why this file exists at all.
import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));

import { PgDialect } from "drizzle-orm/pg-core";

import { assembledCombosQuery } from "./load";

// Renders the LOADER's own query, not a copy of it — a copy drifts with the assertion and
// pins nothing.
const rendered = () =>
  new PgDialect()
    .sqlToQuery(assembledCombosQuery(["a", "b"], ["cmd"]))
    .sql.replace(/\s+/g, " ");

describe("the assembled-combo query", () => {
  // THE MODAL'S FOUR FIELDS, in the projection. Drop one and the loader's `?? null` maps it to
  // null on every row, so every combo in the app reads "no mana needed, no steps, no
  // prerequisites" behind a passing suite — the same silent-null shape the ingest's
  // `fieldCollapse` floors guard from the other end.
  it.each(["mana_needed", "mana_value_needed", "steps", "notable_prerequisites"])(
    "projects %s, which the reasoning modal draws",
    (column) => {
      expect(rendered()).toContain(`v.${column}`);
    },
  );

  // AND THE GROUP KEY STAYS ON THE PRIMARY KEY ALONE.
  //
  // This assertion used to require each column TWICE — projection and group by — on the
  // reasoning that the group-by half was self-catching because Postgres refuses an ungrouped
  // column. It does not refuse one that is functionally dependent on a grouped primary key, so
  // the second half was never load-bearing; it just pinned a needlessly wide aggregate key,
  // with `steps` averaging 395 characters in it. Review caught the same defect in
  // `completionsQuery` one round earlier and this half was missed.
  it("groups on the primary key alone, never on a 395-character string", () => {
    const sql = rendered();
    const group = sql.slice(sql.indexOf("group by"));
    expect(group).toContain("group by v.variant_id");
    for (const wide of ["v.steps", "v.mana_needed", "v.notable_prerequisites", "v.produces"]) {
      expect(group).not.toContain(wide);
    }
  });

  // RULE 1. A template-gated variant names a CATEGORY of card — "a creature with flying" —
  // not a card, so a decklist cannot be said to assemble it. Dropping this admits thousands
  // of variants no deck holds.
  it("excludes template-gated variants", () => {
    expect(rendered()).toContain("cardinality(v.requires_template_ids) = 0");
  });

  // Card count is the SHAPE the profile counts, and the produces test is applied in
  // TypeScript afterwards — never here, because a two-card variant producing "infinite
  // squirrels" is a two-card variant.
  it("takes two-card variants only", () => {
    expect(rendered()).toContain("v.card_count = 2");
  });

  // RULE 2, and the one a careless rewrite loses: a piece flagged `must_be_commander` works
  // only from the command zone, so a deck holding it in the 99 assembles nothing. BOTH arms
  // must be present — the `then` restricting to the commanders, the `else` allowing the whole
  // deck — because either arm alone is a different rule.
  it("keeps both arms of the must_be_commander case", () => {
    const text = rendered();
    expect(text).toContain("case when vc.must_be_commander");
    expect(text).toContain("then vc.oracle_id = any(");
    expect(text).toContain("else vc.oracle_id = any(");
  });

  // RULE 3. The commanders are cards: a combo one of them completes is assembled.
  it("reports whether a piece is in the command zone", () => {
    expect(rendered()).toContain("as uses_commander");
  });

  // Every `any()` takes a cast. An uncast JS array against a uuid column fails at RUNTIME
  // with no compile-time or lint signal — the house convention, and the reason this
  // assertion counts the casts rather than testing for one.
  it("casts every array parameter to uuid[]", () => {
    const text = rendered();
    expect(text.match(/::uuid\[\]/g) ?? []).toHaveLength(4);
    expect(text).not.toMatch(/any\(\$\d+\)(?!::)/);
  });

  // The `exists` prunes before the group. Without it every two-card variant in the index is
  // aggregated and then discarded, which is the whole table for a two-card deck.
  it("prunes to variants touching the deck before grouping", () => {
    const text = rendered();
    expect(text.indexOf("exists (select 1")).toBeGreaterThan(-1);
    expect(text.indexOf("exists (select 1")).toBeLessThan(text.indexOf("group by"));
  });

  // Aliased and qualified on BOTH sides, everywhere. Drizzle omits table qualification from
  // columns interpolated into the projection of a single-table select, and this query's
  // `oracle_id` appears on three different relations.
  it("qualifies every column reference", () => {
    const text = rendered();
    expect(text).not.toMatch(/\s"oracle_id"\s*=/);
    for (const ref of ["vc.oracle_id", "vc2.oracle_id", "v.variant_id", "vc.variant_id"]) {
      expect(text).toContain(ref);
    }
  });
});

// `card_count` keeps UPSTREAM's `uses` length while `spellbook_variant_cards` is deduped by
// oracle id, so the column alone would admit a variant naming one card twice — and a deck
// holding that single card would be reported as assembling a two-card combo.
describe("two rows, not merely a card_count of 2", () => {
  it("requires the group to hold exactly two pieces", () => {
    expect(rendered()).toContain("having count(*) = 2");
  });

  it("keeps the count gate and the commander rule as separate clauses", () => {
    const text = rendered();
    expect(text.indexOf("having count(*) = 2")).toBeLessThan(
      text.indexOf("case when vc.must_be_commander"),
    );
  });
});
