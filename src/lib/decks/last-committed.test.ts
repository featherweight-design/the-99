// The commit subquery, rendered.
//
// This is the `.toSQL()` half of the pair AGENTS.md describes: emitted SQL
// proves the question, and `pnpm probe:touched` proves the answer against a
// fixture whose true value is known. A component test cannot reach either — it
// receives the date as a prop and stays green however the query was written.
import { describe, expect, it } from "vitest";
import { db } from "../../db";
import { decks } from "../../db/schema";
import { lastCommittedSql } from "./read";

const emitted = () =>
  db.select({ id: decks.id, lastCommittedAt: lastCommittedSql }).from(decks).toSQL();

describe("lastCommittedSql", () => {
  // The whole reason this test exists. `where "deck_id" = "id"` compares each
  // version row's foreign key to its own primary key: no match, ever, no error,
  // and a `committed` stamp that never prints.
  it("qualifies both sides of the correlation", () => {
    const { sql: text } = emitted();
    expect(text).toContain("dv.deck_id");
    // `"decks".id` — the table quoted, the column bare, which is what the
    // recipe in AGENTS.md emits. What matters is that the outer table is NAMED:
    // a bare `"id"` would resolve against `deck_versions`.
    expect(text).toContain('"decks".id');
    expect(text).not.toMatch(/where\s+"deck_id"\s*=\s*"id"/);
  });

  it("aliases the inner table rather than relying on the outer name", () => {
    expect(emitted().sql).toMatch(/from\s+"deck_versions"\s+dv/);
  });

  it("reads the newest commit, not the count of them", () => {
    const { sql: text } = emitted();
    expect(text).toContain("max(dv.committed_at)");
    expect(text).not.toContain("count(");
  });
});
