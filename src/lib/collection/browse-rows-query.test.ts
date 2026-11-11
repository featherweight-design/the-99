// The fields route's read is bounded by SQL, so the SQL is what is pinned: the ids are one bound
// array-shaped predicate on the held card's column, and the reader's own `user_id` stays beside it.
import { describe, expect, it } from "vitest";
import { db } from "../../db";
import { collectionRowsQuery } from "./browse-rows-query";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

describe("collectionRowsQuery", () => {
  it("narrows to the ids as bound parameters, never interpolated", () => {
    const q = collectionRowsQuery(db, "user_1", [A, B]).toSQL();
    expect(q.sql).toMatch(/"collection_items"\."user_id" = \$\d+ and "collection_items"\."oracle_id" in \(\$\d+, \$\d+\)/);
    expect(q.sql).not.toContain(A);
    expect(q.params).toEqual(expect.arrayContaining(["user_1", A, B]));
  });

  it("keeps the reader's own predicate when ids are named, and when they are not", () => {
    for (const ids of [[A], undefined, A] as const) {
      const q = collectionRowsQuery(db, "user_9", ids as string | string[] | undefined).toSQL();
      expect(q.sql).toMatch(/where "collection_items"\."user_id" = \$\d+/);
      expect(q.params).toContain("user_9");
    }
  });

  it("asks no ids' worth when none are named: the whole collection, still the reader's", () => {
    const q = collectionRowsQuery(db, "user_1").toSQL();
    expect(q.sql).not.toMatch(/"oracle_id" in \(/);
    expect(q.params).toContain("user_1");
    expect(q.params).not.toContain(A);
  });

  // The query has no correlated subquery (every other table is a join), so there is nothing for
  // Drizzle to leave unqualified; this fails the day one is added without an alias.
  it("has no subquery to leave unqualified", () => {
    expect(collectionRowsQuery(db, "user_1", [A]).toSQL().sql).not.toMatch(/\(select /i);
  });
});
