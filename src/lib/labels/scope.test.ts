import { PgDialect } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { parseScope, scopeCondition } from "./scope";

const render = (scope: "all" | "in-use") =>
  new PgDialect().sqlToQuery(sql`select c.oracle_id from cards c where c.commander_legal = true ${scopeCondition(scope)}`).sql;

describe("parseScope", () => {
  it("defaults to all, accepts in-use, and refuses anything else", () => {
    expect(parseScope(undefined)).toBe("all");
    expect(parseScope("")).toBe("all");
    expect(parseScope("in-use")).toBe("in-use");
    expect(() => parseScope("inuse")).toThrow(/LABEL_SCOPE must be one of all, in-use/);
  });
});

describe("scopeCondition", () => {
  it("adds nothing for all", () => {
    expect(render("all")).not.toMatch(/in \(/);
  });

  it("restricts in-use to every place the app can ask about a card", () => {
    const q = render("in-use");
    for (const part of [
      "csc.oracle_id from commander_support_cards", "csc.commander_oracle_id from commander_support_cards",
      "cps.oracle_id from commander_pair_support_cards", "cps.partner_oracle_id from commander_pair_support_cards",
      "dc.oracle_id from deck_cards", "d.commander_oracle_id from decks", "d.partner_oracle_id from decks",
      "ci.oracle_id from collection_items",
    ]) expect(q).toContain(part);
    expect(q).toContain("and c.oracle_id in (");
  });
});
