// The exclusion every "what should I build next" list applies once a player hides a commander. Only
// the emitted SQL can show it correlates against the caller's table rather than its own.
import { describe, expect, it } from "vitest";
import type { SQLWrapper } from "drizzle-orm";
import { db } from "../../db";
import { commanderScores, commanderSupport } from "../../db/schema";
import { notHiddenBy } from "./hidden";

const emitted = (column: SQLWrapper) =>
  db
    .select({ oracleId: commanderScores.oracleId })
    .from(commanderScores)
    .where(notHiddenBy("user_1", column))
    .toSQL();

describe("notHiddenBy", () => {
  // `NOT IN (subquery)` returns no rows at all once the subquery yields one NULL.
  it("asks with not exists rather than a NOT IN", () => {
    const q = emitted(commanderScores.oracleId);
    expect(q.sql).toContain("not exists");
    expect(q.sql).not.toMatch(/not in \(\s*select/i);
  });

  // An unqualified `oracle_id` on either side resolves to the hidden row's own column, which matches
  // every hidden row and empties the list.
  it("qualifies its own side through the alias and keeps the caller's side qualified", () => {
    const q = emitted(commanderScores.oracleId);
    expect(q.sql).toMatch(/from "hidden_commanders" hc\b/);
    expect(q.sql).toContain('hc.oracle_id = "commander_scores"."oracle_id"');
    expect(emitted(commanderSupport.commanderOracleId).sql).toContain(
      'hc.oracle_id = "commander_support"."commander_oracle_id"',
    );
  });

  it("binds the user rather than interpolating it", () => {
    const q = emitted(commanderScores.oracleId);
    expect(q.sql).toContain("hc.user_id = $");
    expect(q.params).toContain("user_1");
    expect(q.sql).not.toContain("user_1");
  });
});
