// The commander page's rank window, read off the emitted SQL. A hidden commander still resolves (its
// page opens), but it has no rank, and the rows it would have pushed down count it no more than the
// list they were clicked from does.
import { describe, expect, it } from "vitest";
import { ENV_VIEW } from "@/test/env-view";
import { scoredCommanderQuery } from "./scored-commander";

const emitted = () => scoredCommanderQuery("user_1", "atraxa-praetors-voice", ENV_VIEW).toSQL();
/** Whitespace folded, so a reflowed template does not fail a shape assertion. */
const flat = () => emitted().sql.replace(/\s+/g, " ");

describe("scoredCommanderQuery's hidden flag", () => {
  it("is read in the window's own statement, against this reader's hidden rows", () => {
    expect(flat()).toMatch(/exists \( select 1 from "hidden_commanders" hc where hc\.user_id = \$\d+/);
    expect(emitted().params).toContain("user_1");
  });

  // The rule AGENTS.md names: in a single-table select's projection Drizzle leaves a column object
  // unqualified, and a bare `"oracle_id"` inside the subquery resolves to `hc`'s own column, which
  // would mark every row hidden and give every commander a null rank.
  it("compares the hidden row against the QUALIFIED score row", () => {
    expect(flat()).toContain(`hc.oracle_id = "commander_scores".oracle_id`);
    expect(flat()).not.toMatch(/hc\.oracle_id = "oracle_id"/);
  });

  // The flag is computed once per row, in the `flagged` CTE, and the window reads that column: one
  // `exists` per score row rather than one each for the column, the CASE and the partition.
  it("computes the flag once, as a column the window reads", () => {
    expect(flat().match(/exists \( select 1 from "hidden_commanders"/g)).toHaveLength(1);
    expect(flat()).toMatch(/^with "flagged" as \(select .*exists \( select 1 from "hidden_commanders" hc .*?\) as "hidden" from "commander_scores"/);
    expect(flat()).toMatch(/"ranked" as \(select .* from "flagged"\)/);
  });

  // A hidden row ahead of the target does not count: the window is partitioned by the flag, so a shown
  // commander is numbered among the shown rows only. Every column the window reads is qualified by the CTE.
  it("partitions the rank window by the flag", () => {
    expect(flat()).toContain(
      "row_number() over (partition by flagged.hidden order by flagged.rank_score desc, flagged.oracle_id)",
    );
  });

  // A hidden target resolves, with no rank: the CASE nulls it rather than a WHERE dropping it, which
  // would 404 the page the Hidden list links to.
  it("keeps a hidden target and gives it a null rank", () => {
    expect(flat()).toContain("case when flagged.hidden then null else row_number()");
    expect(flat()).toContain(`"hidden"`);
    expect(flat()).not.toMatch(/not exists \( select 1 from "hidden_commanders"/);
  });

  // The degraded flag counts the rows the list draws: a hidden degraded row ranks nothing, so it must
  // not send the page into a degraded re-rank. Qualified by the CTE, like the rest of the window.
  it("reads the degraded flag over the non-hidden rows only", () => {
    expect(flat()).toContain(
      "bool_or(flagged.synergy_state = 'degraded' and not flagged.hidden) over ()",
    );
    expect(flat()).not.toContain("bool_or(flagged.synergy_state = 'degraded') over ()");
  });
});
