// The switch page's one statement (small items 9, item 7): a deleted group's name is read only for the groups the
// history window names, from the `group_deleted` events, never by an IN over every event the switch has.
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import type { SwitchName } from "../switches/registry";

vi.mock("../../db", () => ({ db: {} }));
vi.mock("./accounts", () => ({ listAccounts: vi.fn() }));
vi.mock("../switches/snapshot", () => ({ readSwitchSnapshot: vi.fn() }));

const { HISTORY_LIMIT, switchStateSql } = await import("./switches");

describe("switchStateSql", () => {
  const { sql: raw, params } = new PgDialect().sqlToQuery(switchStateSql("FEEDBACK_ENABLED" as SwitchName));
  const text = raw.replace(/\s+/g, " ");

  it("reads the history window once, one past the limit", () => {
    expect(text).toContain('with recent as ( select * from admin_events where "switch" = $1 order by at desc, id desc limit $2 )');
    expect(params).toEqual(["FEEDBACK_ENABLED", HISTORY_LIMIT + 1]);
    expect(text).toContain("order by e.at desc, e.id desc) from recent e)");
  });

  it("names deleted groups from group_deleted events, only for the groups the window names", () => {
    expect(text).toContain(
      "from admin_events d where d.kind = 'group_deleted' and d.group_id in (select r.group_id from recent r where r.group_id is not null)",
    );
    // No second pass over the switch's whole log.
    expect(text.match(/"switch" = \$1/g)).toHaveLength(1);
  });
});
