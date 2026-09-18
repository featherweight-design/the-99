// The pending-changes subquery, rendered.
//
// The `.toSQL()` half of the pair AGENTS.md describes, and the half a component
// test can never be: a tile receives the flag as a prop and stays green however
// the query was written. `pnpm probe:touched` proves the answer against a
// fixture whose true value is known; this proves the question.
//
// The failure this exists for is SILENT. Unqualified, the correlation compares
// each child row's own foreign key to its own primary key, matches nothing,
// raises nothing, and reports every deck in the app as clean — which looks
// exactly like a player who has not edited anything.
import { describe, expect, it } from "vitest";
import { db } from "../../db";
import { decks } from "../../db/schema";
import { hasPendingChangesSql } from "./read";

const emitted = () =>
  db.select({ id: decks.id, hasPendingChanges: hasPendingChangesSql }).from(decks).toSQL();

describe("hasPendingChangesSql", () => {
  it("qualifies every correlation against the outer deck", () => {
    const { sql: text } = emitted();
    // The outer table NAMED at each correlation. A bare `"id"` resolves against
    // whichever child table the subquery is reading.
    expect(text).toContain('dv.deck_id = "decks".id');
    expect(text).toContain('dcd.deck_id = "decks".id');
    expect(text).toContain('dco.deck_id = "decks".id');
    expect(text).not.toMatch(/where\s+"deck_id"\s*=\s*"id"/);
  });

  it("aliases every inner table rather than relying on the outer name", () => {
    const { sql: text } = emitted();
    expect(text).toMatch(/from\s+"deck_versions"\s+dv/);
    expect(text).toMatch(/from\s+"deck_cards"\s+dcd/);
    expect(text).toMatch(/from\s+"deck_version_cards"\s+dvd/);
    // The second pair, which reads the difference the other way. A build that
    // kept only the first direction would report a pure CUT as no change.
    expect(text).toMatch(/from\s+"deck_version_cards"\s+dvo/);
    expect(text).toMatch(/from\s+"deck_cards"\s+dco/);
  });

  it("compares the pair, in both directions", () => {
    const { sql: text } = emitted();
    // Two `except`s, not one: `draft except version` alone is blind to a cut,
    // and `oracle_id` alone is blind to a quantity change.
    expect(text.match(/except/g)?.length).toBe(2);
    expect(text).toContain("dcd.oracle_id, dcd.quantity");
    expect(text).toContain("dvo.oracle_id, dvo.quantity");
  });

  it("reads the newest version, and only that one", () => {
    const { sql: text } = emitted();
    expect(text).toMatch(/order by\s+dv\.number desc/);
    expect(text).toContain("limit 1");
  });

  it("folds a commander swap in, since it is not a deck_cards row", () => {
    const { sql: text } = emitted();
    // `is distinct from`, never `<>`: a partner is nullable on both sides, and
    // `null <> null` is null — so dropping a partner would compare as unknown
    // and the swap would not register.
    expect(text).toContain("dv.commander_oracle_id is distinct from");
    expect(text).toContain("dv.partner_oracle_id is distinct from");
    expect(text).not.toMatch(/commander_oracle_id\s*<>/);
  });

  it("answers false for a deck with no version rather than null", () => {
    // A null here would reach a field typed `boolean` and draw the pending edge
    // on a deck that has never committed — the one deck that must never carry
    // it, because that deck's mark is the hollow plate instead.
    expect(emitted().sql).toMatch(/coalesce\(\(\s*select/);
    expect(emitted().sql).toContain("), false)");
  });
});
