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
      // The claim model's own comments (`availability-query.ts`), which name copies, updates and deletes in prose.
      "with all_claims as (\n  -- list update, a swap, an import resolve, not only Put back) cancels its own release here,\n  -- draft: its commit and its discard both delete it.\n  select 1\n) select * from all_claims",
      "select /* a copy, an update */ 1",
      "select 'delete me' as note",
      "select 1;",
      "select ';' as semi",
      'select "copy" from t',
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
      "select pg_try_advisory_lock(1)",
      "select pg_advisory_lock_shared(1)",
      "select pg_try_advisory_xact_lock(1)",
      "select * from decks for share",
      "select * from decks for key share",
      "select nextval('s')",
      "create temp table t (i int)",
      "truncate decks",
      "begin read write",
      "set session characteristics as transaction read write",
      "set search_path = public",
      "vacuum",
      "select 1; -- a note\ndelete from decks",
      "select 'it''s' as x; delete from decks",
      "select /* note */ * from decks for update",
      "begin; delete from decks; commit",
      "commit; set default_transaction_read_only = off",
      "show transaction_read_only; update decks set name = 'x'",
      "set transaction isolation level repeatable read; delete from decks",
    ]) expect(isReadStatement(q), q).toBe(false);
  });
});
