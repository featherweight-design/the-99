import { describe, expect, it, vi } from "vitest";

import { db } from "../../db";
import { markUpcomingSeen, upcomingSetsQuery, utcDay } from "./upcoming";

describe("utcDay", () => {
  it("is the UTC calendar day, whatever the zone the process runs in", () => {
    expect(utcDay(new Date("2026-11-12T23:59:59Z"))).toBe("2026-11-12");
    expect(utcDay(new Date("2026-11-13T00:00:00Z"))).toBe("2026-11-13");
  });
});

describe("upcomingSetsQuery", () => {
  const { sql, params } = upcomingSetsQuery("user_1", new Date("2026-10-14T12:00:00Z"), db).toSQL();

  it("asks for non-digital Commander sets released after today, soonest first", () => {
    expect(sql).toContain(`"sets"."set_type" = $`);
    expect(sql).toContain(`"sets"."digital" = $`);
    expect(sql).toContain(`"sets"."released_at" > $`);
    expect(params).toEqual(expect.arrayContaining(["commander", false, "2026-10-14"]));
    expect(sql).toMatch(/order by "sets"."released_at", "sets"."code"/);
  });

  it("joins the parent set, the first-seen stamp for a set, and this reader's own prefs row", () => {
    expect(sql).toContain(`left join "sets" "parent" on "parent"."code" = "sets"."parent_set_code"`);
    expect(sql).toContain(`"catalog_first_seen"."kind" = $`);
    expect(params).toContain("set");
    expect(sql).toContain(`left join "user_prefs" on "user_prefs"."user_id" = $`);
    expect(params).toContain("user_1");
  });
});

describe("markUpcomingSeen", () => {
  it("writes nothing for no code, or for codes that are not set codes", async () => {
    const insert = vi.spyOn(db, "insert");
    await markUpcomingSeen("user_1", []);
    await markUpcomingSeen("user_1", ["", "TRC", "has space", "x".repeat(9), "a'; drop table sets;--"]);
    expect(insert).not.toHaveBeenCalled();
    insert.mockRestore();
  });

  it("refuses more than fifty codes in one call", async () => {
    const many = Array.from({ length: 51 }, (_, i) => `s${i.toString(36).padStart(2, "0")}`);
    await expect(markUpcomingSeen("user_1", many)).rejects.toThrow(/at most 50/);
  });
});
