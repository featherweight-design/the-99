import { describe, expect, it } from "vitest";
import { preconArrivalQuery } from "./arrival-read";

// A correlated subquery in a projection renders its outer references unqualified unless they are
// written out (AGENTS.md). Every outer reference here must name `precons`, and the owner predicate
// must stand on `decks`.
describe("preconArrivalQuery", () => {
  const { sql, params } = preconArrivalQuery("user_1", "deck-1").toSQL();

  it("qualifies every outer reference to the precon", () => {
    const outer = sql.match(/pc\.file_name = ([^ )]+)/g) ?? [];
    expect(outer).toHaveLength(3);
    for (const ref of outer) expect(ref).toBe(`pc.file_name = "precons".file_name`);
  });

  it("counts non-basic cards, owned by this reader, for this reader's deck only", () => {
    expect(sql.match(/c\.type_line not like 'Basic%'/g)).toHaveLength(2);
    expect(sql).toMatch(/ci\.user_id = \$\d+/);
    expect(sql).toMatch(/"decks"\."id" = \$\d+ and "decks"\."user_id" = \$\d+/);
    expect(params).toEqual(expect.arrayContaining(["user_1", "deck-1"]));
  });

  it("answers nothing once the deck has a second version (the start itself commits the first)", () => {
    expect(sql).toContain(`(select count(*) from deck_versions dv where dv.deck_id = "decks".id) <= 1`);
  });
});
