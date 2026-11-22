// Hiding a log reminder takes unknown input from a server action: anything but a uuid and a whole positive game id is
// refused before the database is touched.
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ execute: vi.fn(), select: vi.fn(), del: vi.fn() }));
vi.mock("../../db", () => ({ db: { execute: m.execute, select: m.select, delete: m.del } }));

import { hideLogReminder, unhideLogReminder } from "./rule-zero-log-hidden";

const TABLE = "7a0e0000-0000-4000-8000-000000000001";

describe("hideLogReminder", () => {
  it.each([
    ["a table id that is not a uuid", "nope", 1_700_000_000_000],
    ["a missing table id", undefined, 1_700_000_000_000],
    ["a fractional game id", TABLE, 1.5],
    ["a negative game id", TABLE, -4],
    ["a string game id", TABLE, "1700000000000"],
    ["an unsafe game id", TABLE, Number.MAX_SAFE_INTEGER + 2],
  ])("refuses %s without a query", async (_n, table, ms) => {
    expect(await hideLogReminder("user_v", table, ms)).toBe(false);
    expect(await unhideLogReminder("user_v", table, ms)).toBe(false);
    expect(m.execute).not.toHaveBeenCalled();
    expect(m.del).not.toHaveBeenCalled();
  });

  it("selects the insert from the viewer's own result row, at a table in a pod they are in", async () => {
    m.execute.mockResolvedValueOnce({ rowCount: 1 });
    expect(await hideLogReminder("user_v", TABLE, 1_700_000_000_000)).toBe(true);
    const { sql } = new PgDialect().sqlToQuery(m.execute.mock.calls[0][0]);
    expect(sql).toContain("from rule_zero_result_seats rs");
    expect(sql).toContain("rs.user_id = $");
    expect(sql).toContain("pod_members viewer_in");
    expect(sql).toContain("on conflict do nothing");
    expect(sql).toContain("interval '7 days' > now()");
  });
});
