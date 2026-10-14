import { describe, expect, it, vi } from "vitest";

import { db } from "../../db";
import { RELEASED_GRACE_DAYS, SEEN_KEY, markUpcomingSeen, upcomingSeenWrite, upcomingSetsQuery, utcDay } from "./upcoming";

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
    expect(sql).toContain(`("sets"."released_at" > $`);
    expect(params).toEqual(expect.arrayContaining(["commander", false, "2026-10-14"]));
    expect(sql).toMatch(/order by "sets"."released_at", "sets"."code"/);
  });

  it("or released in the last thirty days while no precon lists it (E1)", () => {
    expect(RELEASED_GRACE_DAYS).toBe(30);
    expect(sql).toMatch(/or \("sets"."released_at" <= \$\d+ and "sets"."released_at" > \$\d+ and not exists/);
    // Today, and thirty UTC days before it: the floor is exclusive, so a set out 30 days ago has left.
    expect(params).toEqual(expect.arrayContaining(["2026-10-14", "2026-09-14"]));
  });

  it("matches a precon to its set case-blind, with the inner table aliased and both sides qualified", () => {
    // MTGJSON's set codes are uppercase and Scryfall's lowercase; an unqualified `code` would read `precons`' own.
    expect(sql).toContain(`not exists (select 1 from "precons" p where lower(p.set_code) = "sets"."code")`);
  });

  it("joins the parent set, the first-seen stamp for a set, and this reader's own prefs row", () => {
    expect(sql).toContain(`left join "sets" "parent" on "parent"."code" = "sets"."parent_set_code"`);
    expect(sql).toContain(`"catalog_first_seen"."kind" = $`);
    expect(params).toContain("set");
    expect(sql).toContain(`left join "user_prefs" on "user_prefs"."user_id" = $`);
    expect(params).toContain("user_1");
  });
});

describe("SEEN_KEY", () => {
  it("takes a bare set code or lists: and a set code", () => {
    for (const k of ["trc", "dsc", "pip", "40k", "lists:trc", "lists:40k"]) expect(SEEN_KEY.test(k), k).toBe(true);
  });

  it("refuses anything else", () => {
    for (const k of [
      "", "TRC", "LISTS:trc", "lists:TRC", "has space", "lists: trc", " trc", "trc ", "x".repeat(9), "t",
      "lists:", "lists:x", "lists:lists:trc", "set:trc", "precon:trc", "listss:trc", "lists-trc",
      "a'; drop table sets;--", "lists:trc'--", "trc\n", "lists:trc;lists:dsc",
    ]) expect(SEEN_KEY.test(k), JSON.stringify(k)).toBe(false);
  });
});

describe("upcomingSeenWrite", () => {
  const { sql, params } = upcomingSeenWrite("user_1", ["trc", "lists:trc"], db).toSQL();

  it("unions into the reader's row, once each", () => {
    expect(sql).toContain(`on conflict ("user_id") do update set "upcoming_seen_codes" = array(select distinct unnest("user_prefs"."upcoming_seen_codes" || excluded.upcoming_seen_codes))`);
    expect(params[0]).toBe("user_1");
  });

  it("updates only when it adds a key, so a repeat moves no stamp", () => {
    expect(sql).toMatch(/ where not \(excluded\.upcoming_seen_codes <@ "user_prefs"\.upcoming_seen_codes\)$/);
  });
});

describe("markUpcomingSeen", () => {
  it("writes nothing for no key, or for keys of neither form", async () => {
    const insert = vi.spyOn(db, "insert");
    await markUpcomingSeen("user_1", []);
    await markUpcomingSeen("user_1", ["", "TRC", "has space", "x".repeat(9), "lists:", "set:trc", "a'; drop table sets;--"]);
    expect(insert).not.toHaveBeenCalled();
    insert.mockRestore();
  });

  it("writes both forms, each once", async () => {
    const values = vi.fn(() => ({ onConflictDoUpdate: vi.fn(async () => undefined) }));
    const insert = vi.fn(() => ({ values }));
    await markUpcomingSeen("user_1", ["trc", "lists:trc", "trc", "NOPE"], { insert } as never);
    expect(values).toHaveBeenCalledWith({ userId: "user_1", upcomingSeenCodes: ["trc", "lists:trc"] });
  });

  it("writes more than fifty keys fifty to a statement, never refusing a dismiss", async () => {
    const many = Array.from({ length: 101 }, (_, i) => `s${i.toString(36).padStart(2, "0")}`);
    const sizes: number[] = [];
    const values = vi.fn((v: { upcomingSeenCodes: string[] }) => {
      sizes.push(v.upcomingSeenCodes.length);
      return { onConflictDoUpdate: vi.fn(async () => undefined) };
    });
    await markUpcomingSeen("user_1", many, { insert: vi.fn(() => ({ values })) } as never);
    expect(sizes).toEqual([50, 50, 1]);
  });
});
