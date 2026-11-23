// The collection's Find a deck read and ✕ (tool discovery call 1).
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { db } from "../../db";
import { closeFindADeck, closeFindADeckQuery, findADeckStateQuery, loadFindADeckState } from "./find-a-deck";

const NOW = new Date("2026-11-23T12:00:00Z");

describe("findADeckStateQuery", () => {
  it("scopes every part to the caller and takes the door's deck rule (a deck with a commander)", () => {
    const { sql, params } = new PgDialect().sqlToQuery(findADeckStateQuery("user_1"));
    expect(params).toEqual(["user_1", "user_1", "user_1"]);
    expect(sql).toContain("d.user_id = $1 and d.commander_oracle_id is not null");
    expect(sql).toContain("p.user_id = $2 and p.find_a_deck_closed_at is not null");
    expect(sql).toContain("ci.user_id = $3 and not c.commander_legal");
  });
});

describe("loadFindADeckState", () => {
  const reader = (rows: unknown[]) => ({ execute: async () => ({ rows }) });
  it("reads the row", async () => {
    expect(await loadFindADeckState("u", reader([{ has_deck: true, closed: false, illegal: ["a"] }]))).toEqual({
      hasDeck: true, closed: false, illegal: ["a"],
    });
  });
  it("reads a missing row or a null array as no deck, not closed, nothing illegal", async () => {
    expect(await loadFindADeckState("u", reader([]))).toEqual({ hasDeck: false, closed: false, illegal: [] });
    expect(await loadFindADeckState("u", reader([{ has_deck: false, closed: true, illegal: null }]))).toEqual({
      hasDeck: false, closed: true, illegal: [],
    });
  });
});

describe("closeFindADeck (the call-out's ✕)", () => {
  it("upserts the caller's own row, stamping only the column, guarded on the stored row's column (qualified)", () => {
    const { sql, params } = closeFindADeckQuery("user_1", NOW, db).toSQL();
    expect(sql).toMatch(/^insert into "user_prefs" /);
    expect(sql).toMatch(/ on conflict \("user_id"\) do update set "find_a_deck_closed_at" = \$\d+ where "user_prefs"\.find_a_deck_closed_at is null$/);
    expect(params).toContain("user_1");
  });

  it("writes for the caller alone, and reports a repeat (the guard matched nothing) as no write", async () => {
    const values: unknown[] = [];
    const q = (rows: unknown[]) => ({
      insert: () => ({ values: (v: unknown) => { values.push(v); return { onConflictDoUpdate: () => ({ returning: async () => rows }) }; } }),
    }) as never;
    expect(await closeFindADeck("user_1", NOW, q([{ userId: "user_1" }]))).toBe(true);
    expect(await closeFindADeck("user_1", NOW, q([]))).toBe(false);
    expect(values).toEqual([{ userId: "user_1", findADeckClosedAt: NOW }, { userId: "user_1", findADeckClosedAt: NOW }]);
  });
});
