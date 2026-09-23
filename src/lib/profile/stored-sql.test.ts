// The deck list's stored-bracket subquery, rendered without a database.
//
// It sits in the PROJECTION of a single-table select, which is exactly where Drizzle emits column
// references bare (AGENTS.md). Written the obvious way, `deck_id = id` compares each profile row
// to itself and every tile reads null with no error. So the qualified form is what is asserted.

import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { storedPermitsSql } from "./stored-sql";

const rendered = new PgDialect().sqlToQuery(storedPermitsSql());

describe("storedPermitsSql", () => {
  it("correlates on the outer deck, qualified on both sides", () => {
    expect(rendered.sql).toContain('dp.deck_id = "decks".id');
    expect(rendered.sql).toContain('dp.user_id = "decks".user_id');
  });

  // THE CHIP HOLDS (ruling 4). No clause may retire the row: an edit, a catalog refresh and a week
  // passing all leave the last analyzed bracket on the tile.
  it("carries no freshness clause", () => {
    expect(rendered.sql).not.toContain("last_edited_at");
    expect(rendered.sql).not.toContain("catalog");
    expect(rendered.sql).not.toContain("computed_at");
    expect(rendered.params).toEqual([]);
  });
});
