import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { okRunWhere, suggestedRunsOfDeck, swapped } from "./tuning-read";

describe("the panel's run reads", () => {
  it("scope a deck's runs to Suggested changes, so another tool's run on the deck is never its latest", () => {
    const q = new PgDialect().sqlToQuery(suggestedRunsOfDeck("deck-1")!);
    expect(q.sql).toContain(`"deck_suggestion_runs"."tool" = $2`);
    expect(q.params).toEqual(["deck-1", "suggested_changes"]);
  });
  it("read a run named by id only when it is the reader's own ok run of this tool on this deck", () => {
    const q = new PgDialect().sqlToQuery(okRunWhere("deck-1", "user-1", "run-9")!);
    expect(q.sql).toContain(`"deck_suggestion_runs"."deck_id" = $1`);
    expect(q.sql).toContain(`"deck_suggestion_runs"."user_id" = $3`);
    expect(q.sql).toContain(`"deck_suggestion_runs"."id" = $5`);
    expect(q.params).toEqual(["deck-1", "suggested_changes", "user-1", "ok", "run-9"]);
  });

  it("read the newest ok run when none is named", () => {
    const q = new PgDialect().sqlToQuery(okRunWhere("deck-1", "user-1", null)!);
    expect(q.sql).not.toContain(`"deck_suggestion_runs"."id" =`);
    expect(q.params).toEqual(["deck-1", "suggested_changes", "user-1", "ok"]);
  });
});

describe("swapped: the list a line would leave behind (the bracket flag reads it)", () => {
  const list = [{ oracleId: "a", quantity: 1 }, { oracleId: "b", quantity: 2 }];
  const asMap = (l: { oracleId: string; quantity: number }[]) => Object.fromEntries(l.map((c) => [c.oracleId, c.quantity]));

  it("changes only the add for an addition, and only the cut for a cut", () => {
    expect(asMap(swapped(list, { addOracleId: "z", cutOracleId: null }))).toEqual({ a: 1, b: 2, z: 1 });
    expect(asMap(swapped(list, { addOracleId: null, cutOracleId: "a" }))).toEqual({ b: 2 });
    expect(asMap(swapped(list, { addOracleId: null, cutOracleId: "b" }))).toEqual({ a: 1, b: 1 });
  });

  it("still changes both for a pair stored before the two lists", () => {
    expect(asMap(swapped(list, { addOracleId: "z", cutOracleId: "a" }))).toEqual({ b: 2, z: 1 });
  });
});
