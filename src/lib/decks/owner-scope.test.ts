import { describe, expect, it } from "vitest";
import { db } from "../../db";
import { ownerCheck } from "./draft-state";
import { fillPassesQuery } from "./fill-passes";
import { versionsQuery } from "./versions";

// The deck page starts these reads BESIDE its ownership guard rather than after it, so each has
// to refuse a deck the reader does not own in its own SQL. Asserted on the emitted SQL, and in its
// QUALIFIED form: a bare `"user_id"` would resolve against whichever table in the query has one,
// which is the Drizzle trap AGENTS.md records, and would pass a test looking for the column name.
const owned = (sql: string) => {
  expect(sql).toContain('"decks"."user_id" = $');
  expect(sql).toMatch(/"decks"\."id"/);
};

describe("the deck page's early reads are owner-scoped in their own SQL", () => {
  it("reads fill passes only for the reader's own deck", () => {
    const q = fillPassesQuery("deck-1", "user-1").toSQL();
    owned(q.sql);
    expect(q.params).toEqual(expect.arrayContaining(["deck-1", "user-1"]));
  });

  it("reads versions only for the reader's own deck", () => {
    const q = versionsQuery("deck-1", "user-1").toSQL();
    owned(q.sql);
    expect(q.params).toEqual(expect.arrayContaining(["deck-1", "user-1"]));
  });

  it("checks ownership before the draft's snapshot reads anything else", () => {
    const q = ownerCheck(db, "deck-1", "user-1").toSQL();
    owned(q.sql);
    expect(q.params).toEqual(["deck-1", "user-1"]);
  });
});
