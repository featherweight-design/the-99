import { describe, expect, it } from "vitest";
import { linkHeadQuery, preconMatchQuery, toMatch } from "./link-read";

// The deck's cards are a correlated subquery inside a filter on the projection (AGENTS.md): its outer
// reference must name `precon_cards`, never fall through to `deck_cards`' own oracle id.
describe("preconMatchQuery", () => {
  const { sql, params } = preconMatchQuery("deck-1", ["cmd-a", "cmd-b"]).toSQL();

  it("compares the deck's card to the PRECON's card, qualified", () => {
    expect(sql).toContain(`exists (select 1 from deck_cards dc where dc.deck_id = $`);
    expect(sql).toMatch(/and dc\.oracle_id = "precon_cards"\."oracle_id"\)/);
    expect(params).toEqual(expect.arrayContaining(["deck-1", "cmd-a", "cmd-b"]));
  });

  it("counts the commanders as held, and basics nowhere", () => {
    expect(sql).toMatch(/or "precon_cards"\."oracle_id" in \(\$\d+, \$\d+\)/);
    expect(sql.match(/"cards"\."type_line" not like 'Basic%'/g)).toHaveLength(2);
  });

  it("reads plain precons only, one row each", () => {
    expect(sql).toContain(`where "precons"."twin_of" is null group by "precons"."file_name"`);
  });
});

describe("toMatch", () => {
  const row = {
    fileName: "P", name: "Pair", setCode: "SET", releaseDate: "2024-01-01", cards: 100, of: 80, shared: 50,
    commanderIds: ["a", "b", "a"], commanderNames: ["A", "B", "A"], leadImage: null,
  };

  it("keeps a commander listed under two printings once, and matches a pair in either order", () => {
    const m = toMatch(row, ["b", "a"]);
    expect(m.commanders).toEqual(["A", "B"]);
    expect(m.sameCommanders).toBe(true);
    expect(toMatch(row, ["a"]).sameCommanders).toBe(false);
  });
});

// A link to a precon a later feed dropped reads as no link: the head reads the precon's own row.
describe("linkHeadQuery", () => {
  it("reads the link through the precon's row, so a dropped precon reads as unlinked", async () => {
    const { db } = await import("../../db");
    const { sql } = linkHeadQuery(db, "user_1", "deck-1").toSQL();
    expect(sql).toContain(`select "precons"."file_name"`);
    expect(sql).toContain(`left join "precons" on "precons"."file_name" = "decks"."built_from_precon"`);
  });
});
