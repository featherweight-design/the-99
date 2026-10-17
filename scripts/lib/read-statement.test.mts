import { describe, expect, it } from "vitest";
import { isReadStatement } from "./read-statement";

describe("isReadStatement", () => {
  it("lets reads and the transaction control around them through", () => {
    for (const q of [
      "select 1",
      "  -- a note\n with x as (select 1) select * from x",
      "(select 1) union (select 2)",
      "begin isolation level repeatable read",
      "set transaction isolation level repeatable read",
      "set session characteristics as transaction read only",
      "commit",
      "rollback",
      "show transaction_read_only",
      'select "updated_at", "created_at", "locked" from decks',
    ]) expect(isReadStatement(q), q).toBe(true);
  });

  it("refuses every write, lock or session change", () => {
    for (const q of [
      "insert into decks values (1)",
      "update user_prefs set moments_spent = '{}'",
      "delete from decks",
      "with gone as (delete from decks returning id) select * from gone",
      "select * from decks for update",
      "select pg_advisory_xact_lock(1)",
      "select nextval('s')",
      "create temp table t (i int)",
      "truncate decks",
      "begin read write",
      "set session characteristics as transaction read write",
      "set search_path = public",
      "vacuum",
    ]) expect(isReadStatement(q), q).toBe(false);
  });
});
