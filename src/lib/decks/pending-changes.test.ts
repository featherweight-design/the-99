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
import { pendingChangesSql } from "./read";

const emitted = () =>
  db.select({ id: decks.id, pendingChanges: pendingChangesSql }).from(decks).toSQL();

describe("pendingChangesSql", () => {
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
    expect(text).toContain("max(dvn.number)");
    expect(text).toContain("dv.number =");
  });

  it("counts each changed card once, not each side of it", () => {
    // `1 → 2` is a row in BOTH directions of the symmetric difference and ONE
    // add in `draftDiff`. Counting rows would tell a player who bought a second
    // copy that they had made two changes, and the tile's figure would disagree
    // with the deck page's for every quantity change on it.
    expect(emitted().sql).toContain("count(distinct diff.oracle_id)");
  });

  it("compares the cards alone, as the deck page's own change count does", () => {
    const { sql: text } = emitted();
    // `changeCount` in `draft-shape.ts` is adds + removes over the CARD diff.
    // A flag that also watched the commander columns would draw the edge on a
    // deck whose page counts zero changes — and, in the tile, over a figure
    // reading `0 changes since v2`. One definition, two surfaces that cannot
    // disagree. Nothing writes `commander_oracle_id` after creation anyway.
    expect(text).not.toContain("commander_oracle_id");
    expect(text).not.toContain("partner_oracle_id");
  });

  it("answers zero for a deck with no version rather than null", () => {
    // A null here would reach a field typed `boolean` and draw the pending edge
    // on a deck that has never committed — the one deck that must never carry
    // it, because that deck's mark is the hollow plate instead.
    expect(emitted().sql).toMatch(/coalesce\(\(\s*select/);
    expect(emitted().sql).toContain("), 0)::int");
  });
});
