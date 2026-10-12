import { describe, expect, it } from "vitest";
import { linkHeadQuery, preconCatalogQuery, sharedCount, toMatch } from "./link-read";

// The precons' own figures: nothing in them depends on a deck, which is what lets them be read once
// per catalog generation.
describe("preconCatalogQuery", () => {
  const { sql } = preconCatalogQuery().toSQL();

  it("reads no deck at all", () => {
    expect(sql).not.toContain("deck_cards");
    expect(sql).not.toContain("decks");
  });

  it("collects each precon's distinct non-basic cards, the set a deck's shared count is taken over", () => {
    expect(sql).toContain(`array_agg(distinct "precon_cards"."oracle_id") filter (where "cards"."type_line" not like 'Basic%')`);
    expect(sql.match(/"cards"\."type_line" not like 'Basic%'/g)).toHaveLength(2);
  });

  it("reads plain precons only, one row each", () => {
    expect(sql).toContain(`where "precons"."twin_of" is null group by "precons"."file_name"`);
  });
});

describe("sharedCount", () => {
  it("counts the precon's cards the deck holds, commanders included by the caller", () => {
    expect(sharedCount(["a", "b", "c"], new Set(["b", "c", "z"]))).toBe(2);
    expect(sharedCount(null, new Set(["a"]))).toBe(0);
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
