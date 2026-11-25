// The collection's Find a deck read (tool discovery call 1).
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { findADeckStateQuery, loadFindADeckState } from "./find-a-deck";

describe("findADeckStateQuery", () => {
  it("scopes every part to the caller and takes the door's deck rule (a deck with a commander)", () => {
    const { sql, params } = new PgDialect().sqlToQuery(findADeckStateQuery("user_1"));
    expect(params).toEqual(["user_1", "user_1"]);
    expect(sql).toContain("d.user_id = $1 and d.commander_oracle_id is not null");
    expect(sql).toContain("ci.user_id = $2 and not c.commander_legal");
  });
});

describe("loadFindADeckState", () => {
  const reader = (rows: unknown[]) => ({ execute: async () => ({ rows }) });
  it("reads the row", async () => {
    expect(await loadFindADeckState("u", reader([{ has_deck: true, illegal: ["a"] }]))).toEqual({ hasDeck: true, illegal: ["a"] });
  });
  it("reads a missing row or a null array as no deck, nothing illegal", async () => {
    expect(await loadFindADeckState("u", reader([]))).toEqual({ hasDeck: false, illegal: [] });
    expect(await loadFindADeckState("u", reader([{ has_deck: false, illegal: null }]))).toEqual({ hasDeck: false, illegal: [] });
  });
});
