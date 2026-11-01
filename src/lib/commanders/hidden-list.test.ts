// The Hidden list's read. Only the emitted SQL can show its correlated subqueries ask about the hidden row and not
// about their own: a bare `oracle_id` would answer true of every row (AGENTS.md, the subquery rule).
import { describe, expect, it } from "vitest";
import { hiddenListQuery } from "./hidden-list";

describe("hiddenListQuery", () => {
  const q = hiddenListQuery("user_1").toSQL();

  it("reads the reader's hides newest first, the order the list draws", () => {
    expect(q.sql).toMatch(/order by "hidden_commanders"\."hidden_at" desc, "hidden_commanders"\."oracle_id"/);
  });

  it("qualifies the hidden row's column in every subquery", () => {
    expect(q.sql).toContain('ci.oracle_id = "hidden_commanders".oracle_id');
    expect(q.sql).toContain('cs.commander_oracle_id = "hidden_commanders".oracle_id');
    expect(q.sql).toContain('d.commander_oracle_id = "hidden_commanders".oracle_id');
    expect(q.sql).toContain('d.partner_oracle_id = "hidden_commanders".oracle_id');
  });

  it("asks ownership and decks of this reader alone, bound rather than interpolated", () => {
    expect(q.sql).toContain("ci.user_id = $");
    expect(q.sql).toContain("d.user_id = $");
    expect(q.params.filter((p) => p === "user_1").length).toBe(3);
    expect(q.sql).not.toContain("user_1");
  });
});
