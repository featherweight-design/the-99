// The rank window's population, read off the emitted SQL. Each clause here
// restates a rule enforced somewhere else too, and every failure mode is the
// same shape: a number on one screen disagreeing with the same number on
// another, which no test of either screen alone would catch.
import { describe, expect, it } from "vitest";
import { db } from "../../db";
import { commanderScores } from "../../db/schema";
import { rankableScoreRows } from "./store";

const emitted = () =>
  db
    .select({ oracleId: commanderScores.oracleId })
    .from(commanderScores)
    .where(rankableScoreRows("user_1"))
    .toSQL();

describe("rankableScoreRows", () => {
  it("scopes to the one reader", () => {
    expect(emitted().params).toContain("user_1");
  });

  // `loadScores` condemns a whole set when one row predates the current writer.
  // A row-level filter here would rank the current rows of a mixed set instead —
  // a rank counted over a set the list has already thrown away.
  it("refuses the whole set when any row predates the current writer", () => {
    const sql = emitted().sql;
    expect(sql).toContain("writer_version <");
    expect(sql).toMatch(/not exists\s*\(\s*select 1 from "commander_scores" stale/);
    // Not `where cs.writer_version = 2`, which would pass a mixed set through.
    expect(sql).not.toMatch(/"commander_scores"\."writer_version"\s*=/);
  });

  // `loadScores` condemns a set for an unwritten rank score too — the sentinel
  // 0017's rollout window could leave behind. A window that knew only about the
  // writer version would rank off a set the list is recomputing.
  it("refuses a set holding an unwritten rank score, as the list does", () => {
    expect(emitted().sql).toContain("rank_score <");
  });

  it("counts the window over unbuilt commanders only", () => {
    const sql = emitted().sql;
    expect(sql).toContain("commander_oracle_id");
    expect(sql).toContain("partner_oracle_id");
  });
});
