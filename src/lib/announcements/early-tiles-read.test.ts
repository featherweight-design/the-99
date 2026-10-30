import { describe, expect, it } from "vitest";
import { db } from "../../db";
import { earlyListsQuery, releasedCommandersQuery } from "./early-tiles-read";

describe("earlyListsQuery", () => {
  it("reads recent Commander decklists posts' lists that declare a commander, in post order", () => {
    const { sql, params } = earlyListsQuery(new Date("2026-03-01T00:00:00Z"), db).toSQL();
    expect(sql).toContain('inner join "wizards_announcements" on "wizards_announcements"."id" = "wizards_announcement_decklists"."announcement_id"');
    expect(sql).toContain('"wizards_announcements"."kind" = $');
    expect(sql).toContain('"wizards_announcements"."published_at" >= $');
    expect(sql).toContain('"wizards_announcement_decklists"."commander_name" is not null');
    expect(sql).toContain('order by "wizards_announcements"."published_at", "wizards_announcement_decklists"."position"');
    expect(params[0]).toBe("commander-decklists");
  });
});

describe("releasedCommandersQuery", () => {
  it("qualifies both tables of its join and keeps plain-edition commanders only", () => {
    const { sql } = releasedCommandersQuery(["c1", "c2"], db).toSQL();
    expect(sql).toContain('select distinct "precon_cards"."oracle_id", "precons"."set_code"');
    expect(sql).toContain('inner join "precons" on "precons"."file_name" = "precon_cards"."file_name"');
    expect(sql).toContain('"precon_cards"."is_commander" = $');
    expect(sql).toContain('"precons"."twin_of" is null');
  });
});
