import { describe, expect, it } from "vitest";

import { db } from "../../db";
import { countsPageQuery, runsPageQuery } from "./history-read";

const key = { at: "2026-10-07T10:00:00.123Z", id: "run:00000000-0000-4000-8000-000000000003" };

describe("History's page queries", () => {
  it("pages the paid runs on the millisecond and the uuid, filtered by reader and deck", () => {
    const q = runsPageQuery(db, "d", "u", ["suggested_changes"], key, 20).toSQL();
    expect(q.sql).toContain('"deck_suggestion_runs"."deck_id" = $');
    expect(q.sql).toContain('"deck_suggestion_runs"."user_id" = $');
    expect(q.sql).toMatch(/\(date_trunc\('milliseconds', "deck_suggestion_runs"\."created_at"\), "deck_suggestion_runs"\."id"\) < \(\$\d+::timestamp, \$\d+::uuid\)/);
    expect(q.sql).toMatch(/order by date_trunc\('milliseconds', "deck_suggestion_runs"\."created_at"\) desc, "deck_suggestion_runs"\."id" desc limit \$\d+/);
    expect(q.params).toContain("2026-10-07T10:00:00.123Z");
    expect(q.params).toContain("00000000-0000-4000-8000-000000000003");
    // One row past the page says whether another page exists.
    expect(q.params).toContain(21);
  });

  it("reads the first page with no key at all", () => {
    expect(runsPageQuery(db, "d", "u", ["proposed_cuts"], null, 20).toSQL().sql).not.toContain("::uuid");
  });

  it("pages the free counts the same way", () => {
    const q = countsPageQuery(db, "d", "u", ["proposed_cuts"], key, 20).toSQL();
    expect(q.sql).toContain('"deck_tool_counts"."deck_id" = $');
    expect(q.sql).toContain('"deck_tool_counts"."user_id" = $');
    expect(q.sql).toMatch(/\(date_trunc\('milliseconds', "deck_tool_counts"\."created_at"\), "deck_tool_counts"\."id"\) < /);
  });
});
