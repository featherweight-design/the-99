// The deck list's stored-bracket subquery, rendered without a database.
//
// It sits in the PROJECTION of a single-table select, which is exactly where Drizzle emits column
// references bare (AGENTS.md). Written the obvious way, `deck_id = id` compares each profile row
// to itself and every tile reads null with no error. So the qualified form is what is asserted.

import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { STORED_PROFILE_MAX_AGE_DAYS, storedPermitsSql } from "./stored-sql";

const rendered = new PgDialect().sqlToQuery(storedPermitsSql("gen-1"));

describe("storedPermitsSql", () => {
  it("correlates on the outer deck, qualified on both sides", () => {
    expect(rendered.sql).toContain('dp.deck_id = "decks".id');
    expect(rendered.sql).toContain('dp.user_id = "decks".user_id');
  });

  // The list's stand-in for the fingerprint: an analysis older than the deck's last edit is absent.
  it("retires a row computed before the deck's last edit", () => {
    expect(rendered.sql).toContain('dp.computed_at >= "decks".last_edited_at');
  });

  it("applies the catalog and the week, as parameters", () => {
    expect(rendered.params).toEqual(["gen-1", STORED_PROFILE_MAX_AGE_DAYS]);
    expect(rendered.sql).toContain("dp.catalog = $1");
    expect(rendered.sql).toContain("make_interval(days => $2)");
  });
});
