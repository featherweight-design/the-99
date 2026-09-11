// The exclusion two very different queries share: discovery's candidate list and
// the detail page's rank window. They read different tables, so only the emitted
// SQL can show they ask the same question.
import { describe, expect, it } from "vitest";
import { db } from "../../db";
import { commanderScores, commanderSupport } from "../../db/schema";
import { notBuiltBy } from "./built";

const emitted = (column: unknown) =>
  db
    .select({ oracleId: commanderScores.oracleId })
    .from(commanderScores)
    .where(notBuiltBy("user_1", column))
    .toSQL();

describe("notBuiltBy", () => {
  it("names both the commander and the partner column", () => {
    const q = emitted(commanderScores.oracleId);
    expect(q.sql).toContain("commander_oracle_id");
    expect(q.sql).toContain("partner_oracle_id");
  });

  // `NOT IN (subquery)` returns no rows at all once the subquery yields one NULL,
  // and every partnerless deck yields exactly that.
  it("asks with not exists rather than a NOT IN over a nullable column", () => {
    const q = emitted(commanderScores.oracleId);
    expect(q.sql).toContain("not exists");
    expect(q.sql).not.toMatch(/not in \(\s*select/i);
  });

  it("correlates against whichever table the caller is ranking", () => {
    expect(emitted(commanderScores.oracleId).sql).toContain('"commander_scores"."oracle_id"');
    expect(emitted(commanderSupport.commanderOracleId).sql).toContain(
      '"commander_support"."commander_oracle_id"',
    );
  });

  it("binds the user rather than interpolating it", () => {
    expect(emitted(commanderScores.oracleId).params).toContain("user_1");
  });
});
