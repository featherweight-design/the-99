import { PgDialect } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { parseScope, scopeCondition, scopeDeck, scopeList } from "./scope";

const render = (scope: "all" | "in-use") =>
  new PgDialect().sqlToQuery(sql`select c.oracle_id from cards c where c.commander_legal = true ${scopeCondition(scope)}`).sql;

describe("parseScope", () => {
  it("defaults to all, accepts in-use, and refuses anything else", () => {
    expect(parseScope(undefined)).toBe("all");
    expect(parseScope("")).toBe("all");
    expect(parseScope("in-use")).toBe("in-use");
    expect(() => parseScope("inuse")).toThrow(/LABEL_SCOPE must be one of all, in-use/);
  });

  // The labels trial (vocabulary plan, Task 6b): one deck's pool, named by the deck's id.
  it("accepts deck:<uuid>, and refuses a deck scope that names no uuid", () => {
    const id = "904fdc61-e190-4ba5-8e34-2b18fa0584f2";
    expect(parseScope(`deck:${id}`)).toBe(`deck:${id}`);
    expect(scopeDeck(parseScope(`deck:${id}`))).toBe(id);
    expect(scopeDeck("in-use")).toBeNull();
    expect(() => parseScope("deck:gishath")).toThrow(/deck:<uuid>/);
    expect(() => parseScope(`deck:${id}x`)).toThrow(/deck:<uuid>/);
    // Case-insensitive, as the repository's other UUID guards are.
    expect(scopeDeck(parseScope(`deck:${id.toUpperCase()}`))).toBe(id.toUpperCase());
  });

  // A hand-picked prompt trial: the name is a file name, so nothing that could walk a path passes.
  it("accepts list:<name>, and refuses a name that is not lowercase words and hyphens", () => {
    expect(scopeList(parseScope("list:v8-trial"))).toBe("v8-trial");
    expect(scopeList("all")).toBeNull();
    expect(scopeDeck(parseScope("list:v8-trial"))).toBeNull();
    for (const bad of ["list:", "list:../x", "list:a/b", "list:V8", "list:a.json", "list:-a", "list:a-"]) {
      expect(() => parseScope(bad)).toThrow(/list:<name>/);
    }
  });
});

describe("scopeCondition", () => {
  // A deck scope's set comes from `labelTrialPool`; turning it into "no condition" would label every card.
  it("refuses a deck scope rather than adding nothing", () => {
    expect(() => scopeCondition("deck:904fdc61-e190-4ba5-8e34-2b18fa0584f2")).toThrow(/resolve its ids/);
    expect(() => scopeCondition("list:v8-trial")).toThrow(/resolve its ids/);
  });

  it("adds nothing for all: the query is exactly the base query", () => {
    const base = new PgDialect().sqlToQuery(sql`select c.oracle_id from cards c where c.commander_legal = true `).sql;
    expect(render("all")).toBe(base);
  });

  it("restricts in-use to every place the app can ask about a card", () => {
    const q = render("in-use");
    for (const part of [
      "csc.oracle_id from commander_support_cards", "csc.commander_oracle_id from commander_support_cards",
      "cps.oracle_id from commander_pair_support_cards", "cps.commander_oracle_id from commander_pair_support_cards",
      "cps.partner_oracle_id from commander_pair_support_cards",
      "dc.oracle_id from deck_cards", "d.commander_oracle_id from decks", "d.partner_oracle_id from decks",
      "ci.oracle_id from collection_items",
    ]) expect(q).toContain(part);
    expect(q).toContain("and c.oracle_id in (");
  });
});
