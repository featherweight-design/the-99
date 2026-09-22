import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { completionsQuery } from "./candidate-facts";

// Renders the LOADER's own query, not a copy of it — a copy drifts with the assertion and pins
// nothing. Same rule as `load.test.ts`, which guards the other half of this pair.
const rendered = () =>
  new PgDialect()
    .sqlToQuery(completionsQuery(["a"], ["b", "c"]))
    .sql.replace(/\s+/g, " ");

describe("the completions query", () => {
  // THE MODAL'S FOUR FIELDS, in the projection. A near-miss is drawn in the same modal as an
  // assembled combo, so dropping one here has the same consequence it has on the other read:
  // the mapping's `?? null` reads it as null on every row, silently, with no error anywhere.
  //
  // This test exists because the guard was written for `assembledCombosQuery` alone while this
  // statement was inlined and unrenderable — one of two reads into one surface, guarded.
  it.each(["mana_needed", "mana_value_needed", "steps", "notable_prerequisites"])(
    "projects %s, which the reasoning modal draws",
    (column) => {
      expect(rendered()).toContain(`v.${column}`);
    },
  );

  // THE WIDE COLUMNS STAY OUT OF THE MATERIALISED CTE AND OUT OF THE GROUP KEY.
  //
  // `two_card` is referenced three times, so Postgres materialises it; `steps` averages 395
  // characters against a max of 754. Carrying the four columns there spooled them for every
  // two-card membership row in the index and then used them as GROUP BY keys, when only the
  // matched completions need them. Asserting the CTE's own select list is the only way to see
  // that from the emitted string — every column still appears in the statement either way.
  it("keeps the CTE narrow: variant_id and oracle_id only", () => {
    const sql = rendered();
    const cte = sql.slice(sql.indexOf("with two_card as ("), sql.indexOf("), held as ("));
    expect(cte).toContain("v.variant_id");
    expect(cte).toContain("vc.oracle_id");
    for (const wide of ["steps", "mana_needed", "notable_prerequisites", "produces"]) {
      expect(cte).not.toContain(wide);
    }
  });

  it("groups on two columns, never on a 395-character string", () => {
    const sql = rendered();
    const group = sql.slice(sql.indexOf("group by t.oracle_id"));
    expect(group).toContain("group by t.oracle_id, t.variant_id");
    for (const wide of ["t.steps", "t.mana_needed", "t.notable_prerequisites"]) {
      expect(group).not.toContain(wide);
    }
  });

  // RULE 1, shared with the assembled read: a template-gated variant names a CATEGORY of card,
  // so a decklist cannot be said to complete it either.
  it("excludes template-gated variants", () => {
    expect(rendered()).toContain("cardinality(v.requires_template_ids) = 0");
  });

  // The whole premise of the read: a variant the deck holds exactly one piece of.
  it("matches on holding exactly one piece", () => {
    expect(rendered()).toContain("h.n = 1");
  });
});
