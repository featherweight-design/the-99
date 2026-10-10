// The rank window's population, read off the emitted SQL. Each clause here
// restates a rule enforced somewhere else too, and every failure mode is the
// same shape: a number on one screen disagreeing with the same number on
// another, which no test of either screen alone would catch.
import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "../../db";
import { commanderScores } from "../../db/schema";
import { SCORE_WRITER_CURRENT } from "../../db/schema";
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
  it("refuses the whole set when any row differs from the writer this deployment writes", () => {
    const sql = emitted().sql;
    expect(sql).toContain("writer_version <>");
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

// The role basis rides in the writer version (labels-everywhere PR 5): the window accepts only the
// version this deployment writes, so the other basis's set is refused whole.
describe("rankableScoreRows by role basis", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("compares with <> and the classifier version with the switch off", () => {
    vi.stubEnv("LABEL_ROLE_COUNTS_ENABLED", "");
    const { sql, params } = emitted();
    expect(sql).toMatch(/stale\.writer_version <> \$\d+/);
    expect(params).toContain(SCORE_WRITER_CURRENT);
    expect(params).not.toContain(-SCORE_WRITER_CURRENT);
  });

  it("compares with <> and the NEGATED version with the switch on, so a classifier set is refused", () => {
    vi.stubEnv("LABEL_ROLE_COUNTS_ENABLED", "true");
    const { sql, params } = emitted();
    expect(sql).toMatch(/stale\.writer_version <> \$\d+/);
    expect(params).toContain(-SCORE_WRITER_CURRENT);
    expect(params).not.toContain(SCORE_WRITER_CURRENT);
  });
});
