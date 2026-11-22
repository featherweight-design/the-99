// The viewer's games at a table (log reminder C1, L1): the per-game logged read is a correlated subquery in a
// single-table-looking select, so its SQL is pinned qualified; the heading is a pure read of the stored places.
import { describe, expect, it } from "vitest";
import { gameResultOf, viewerGamesQuery } from "./rule-zero-games";

const VIEWER = "user_viewer";
const TABLE = "7a0e0000-0000-4000-8000-000000000001";

describe("viewerGamesQuery", () => {
  const q = viewerGamesQuery(VIEWER, TABLE).toSQL();

  it("reads the viewer's own result rows inside the kept window, newest first", () => {
    expect(q.sql).toContain('from "rule_zero_result_seats" inner join "rule_zero_tables"');
    expect(q.sql).toContain('"rule_zero_result_seats"."user_id" = $');
    expect(q.sql).toContain("interval '7 days' > now()");
    expect(q.sql).toMatch(/order by "rule_zero_result_seats"."started_at" desc/);
  });

  it("qualifies the logged subquery on both sides, so it never reads as an always-false self comparison", () => {
    expect(q.sql).toContain('dg.user_id = "rule_zero_result_seats"."user_id"');
    expect(q.sql).toContain('dg.rule_zero_table_id = "rule_zero_result_seats"."table_id"');
    expect(q.sql).toContain('dg.rule_zero_game_at = "rule_zero_result_seats"."started_at"');
  });
});

describe("gameResultOf", () => {
  const rows = [
    { userId: VIEWER, displayName: "Hugh" },
    { userId: "user_colin", displayName: "Colin" },
  ];

  it("says the viewer won", () => {
    expect(gameResultOf(VIEWER, [{ userId: VIEWER, place: 1 }, { userId: "user_colin", place: 2 }], rows)).toEqual({ kind: "you" });
  });

  it("names another winner, and calls a shared first place a draw", () => {
    expect(gameResultOf(VIEWER, [{ userId: "user_colin", place: 1 }, { userId: VIEWER, place: 2 }], rows).kind).toBe("won");
    expect(gameResultOf(VIEWER, [{ userId: "user_colin", place: 1 }, { userId: VIEWER, place: 1 }], rows)).toEqual({ kind: "draw" });
  });

  it("draws no heading when the winner is not among the drawn seats", () => {
    expect(gameResultOf(VIEWER, [{ userId: "user_gone", place: 1 }], rows)).toEqual({ kind: "unknown" });
    expect(gameResultOf(VIEWER, [], rows)).toEqual({ kind: "unknown" });
  });
});
