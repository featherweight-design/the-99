// The Home log reminder's read (log reminder 2b): raw SQL, so its shape is pinned here. The window fragments render
// `"rule_zero_tables"."col"`, which means the table is joined unaliased; an alias would make every one of them an
// unknown column at run time, and nothing else would catch it before staging.
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { candidateGamesQuery } from "./rule-zero-log-home";

const q = new PgDialect().sqlToQuery(candidateGamesQuery("user_viewer"));

describe("candidateGamesQuery", () => {
  it("reads only the viewer's own results, at an ended table still in its keep window, in a pod they are in", () => {
    expect(q.sql).toContain("rs.user_id = $");
    expect(q.sql).toContain("pod_members viewer_in");
    expect(q.sql).toContain('"rule_zero_tables"."expires_at" + interval \'7 days\' > now()');
    expect(q.sql).toContain('"rule_zero_tables"."closed_at" is not null');
    expect(q.params).toContain("user_viewer");
  });

  it("joins the tables unaliased, so the window fragments resolve", () => {
    expect(q.sql).toMatch(/join rule_zero_tables on rule_zero_tables\.id = rs\.table_id/);
    expect(q.sql).not.toMatch(/rule_zero_tables t\b/);
  });

  it("leaves out a logged game and a hidden one, each by the game's own millisecond id, qualified on both sides", () => {
    expect(q.sql).toContain("dg.rule_zero_game_at = rs.started_at");
    expect(q.sql).toContain("dg.user_id = rs.user_id");
    expect(q.sql).toContain("h.game_ms = round(extract(epoch from rs.started_at) * 1000)::bigint");
    expect(q.sql).toContain("h.user_id = rs.user_id");
    expect(q.sql).toContain("h.table_id = rs.table_id");
    expect(q.sql).toMatch(/order by rs\.started_at desc/);
  });
});
