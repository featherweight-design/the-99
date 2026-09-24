// The deck list's notice subquery, rendered without a database (AGENTS.md: a correlated subquery in
// a single-table select must alias and qualify). Written the obvious way, `deck_id = id` compares a
// row to itself and every tile reads no notice with no error, so the qualified forms are asserted.
// What it ANSWERS is proved against a real Postgres by `probe:notices`, which reads its fixture deck
// through `loadDeckNotices` at every state it passes through and requires the two to agree.

import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { noticeSummarySql } from "./summary-sql";

const rendered = new PgDialect().sqlToQuery(noticeSummarySql());

describe("noticeSummarySql", () => {
  it("correlates every inner read on the outer deck, qualified", () => {
    expect(rendered.sql).toContain('dc.deck_id = "decks".id');
    expect(rendered.sql).toContain('dp.deck_id = "decks".id');
    expect(rendered.sql).toContain('dp.user_id = "decks".user_id');
    expect(rendered.sql).toContain('ic.oracle_id = "decks".commander_oracle_id');
    expect(rendered.sql).toContain('coalesce("decks".notices_legal_seen');
  });

  it("aliases every inner table", () => {
    for (const aliased of ['"deck_cards" dc', '"cards" ic', '"cards" c', '"deck_profiles" dp', '"deck_data_changes" e']) {
      expect(rendered.sql).toContain(aliased);
    }
  });

  // `touches`' clauses, one each, so a clause dropped from the SQL is dropped from a string here.
  it("carries the touches rule and the unread mark", () => {
    expect(rendered.sql).toContain("e.seq > dp.seen_seq");
    expect(rendered.sql).toContain("e.seq > dp.notices_read_seq");
    expect(rendered.sql).toContain("e.oracle_ids <@");
    expect(rendered.sql).toContain("mustBeCommander");
    expect(rendered.sql).toContain("> dp.rules_version");
  });

  it("takes no parameters", () => {
    expect(rendered.params).toEqual([]);
  });
});
