import { describe, expect, it } from "vitest";

import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

import { classifyRoles } from "../recs/roles";
import { ROLE_WORDS, roleWords, spellPool } from "./gather";
import type { SpellRole } from "./stand-ins";

// One text per pattern in `classifyRoles` (roles.ts), each shaped the way the catalog words it. The
// unlisted pool is chosen by `ROLE_WORDS` in SQL before roles are read, so a role the words miss is
// a stand-in that can never be offered, with no error anywhere.
const TEXTS = [
  "{T}: Add {C}{C}.",
  "Mana Crypt adds two colorless mana.",
  "Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.",
  "Draw two cards.",
  "Destroy all creatures.",
  "Exile all nonland permanents.",
  "All creatures get -2/-2 until end of turn.",
  "Destroy target creature.",
  "Exile target artifact.",
  "Counter target spell.",
  "Lightning Bolt deals 3 damage to any target.",
  "Target creature gets -3/-3 until end of turn.",
];

// Postgres word boundaries, spelled for a JavaScript test.
const js = (pg: string) => new RegExp(pg.replaceAll("\\m", "\\b").replaceAll("\\M", "\\b"), "i");

describe("ROLE_WORDS", () => {
  it("admits every text classifyRoles gives a role, under that role's own words", () => {
    for (const text of TEXTS) {
      const roles = classifyRoles({ typeLine: "Instant", oracleText: text, keywords: [] }).filter((r) => r !== "land");
      expect(roles.length, text).toBeGreaterThan(0);
      for (const role of roles) expect(js(ROLE_WORDS[role]).test(text), `${role}: ${text}`).toBe(true);
    }
  });

  it("refuses the near misses a bare word admitted", () => {
    for (const text of [
      "Target creature you control gains flying.",
      "As an additional cost to cast this spell, discard a card.",
      "Put a +1/+1 counter on each creature you control.",
    ]) {
      expect(js(roleWords(["ramp", "draw", "removal", "wipes"])).test(text), text).toBe(false);
    }
  });
});

describe("spellPool's label slice (the run plan's Task 5)", () => {
  const dialect = new PgDialect();
  const args = {
    deck: { commander: "00000000-0000-4000-8000-000000000001", partner: null }, userId: "user_1",
    identity: sql.param(["G"]), draft: sql.param([]), cut: "00000000-0000-4000-8000-000000000002",
    staples: sql.param([]), mv: 3,
  };
  const compile = (roles: SpellRole[] | "any", labels: string[]) => dialect.sqlToQuery(spellPool({ ...args, roles, labels }));

  it("reads no label when it is given none, so the switch off leaves the text pool alone", () => {
    expect(compile(["removal"], []).sql).not.toMatch(/card_labels|labelled/);
  });

  it("adds one containment per pattern, OR-joined, as its own slice", () => {
    const patterns = [JSON.stringify([{ space: "role", kind: "removal" }]), JSON.stringify([{ space: "role", kind: "draw" }])];
    const q = compile(["removal"], patterns);
    expect(q.sql).toMatch(/labelled as \(/);
    expect(q.sql.match(/cl\.labels @> \$\d+::jsonb/g)).toHaveLength(2);
    expect(q.sql).toMatch(/cl\.labels @> \$\d+::jsonb or cl\.labels @> \$\d+::jsonb/);
    expect(q.sql).toMatch(/c\.oracle_id in \(select oracle_id from labelled\)/);
    expect(q.params).toEqual(expect.arrayContaining(patterns));
  });

  // The labels trial's raw pool (vocabulary plan, Task 6b): the cheapest slice with NO role filter,
  // since the filter is what keeps out the text-mismatched cards a label could newly admit.
  it("drops the role-word filter for \"any\", and only then", () => {
    const any = compile("any", []);
    expect(any.sql).not.toMatch(/split_part\(u\.oracle_text/);
    expect(any.sql).toMatch(/\n\s+and true\n/);
    expect(any.sql).not.toMatch(/\n\s+and false\n/);
    expect(compile(["removal"], []).sql).toMatch(/split_part\(u\.oracle_text/);
  });

  it("an original with no role words has an empty text slice, never the whole catalog", () => {
    const q = compile([], [JSON.stringify([{ space: "role", kind: "removal" }])]);
    expect(q.sql).not.toMatch(/split_part\(u\.oracle_text/);
    expect(q.sql).toMatch(/and false/);
  });
});
