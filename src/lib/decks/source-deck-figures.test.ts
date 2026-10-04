// `.toSQL()` only — never executed. See the correlated-subquery section of AGENTS.md for why
// this file exists: a query built correctly in TypeScript can still render SQL nobody checked.
// A separate file from `read.test.ts`, which mocks `db` as `{}` for its pure-function tests —
// these queries need the real query builder to render.
//
// Found by Copilot's round-3 review of PR 1 (addendum R1, Pull it picks its source deck): the
// three-round rule — `loadSourceDeckFigures` had drawn findings three rounds running with no
// test covering it at all. The ownership filter and the exact-pairing filter are asserted here;
// the transaction's isolation options are not part of the rendered SQL and are not asserted by
// a test, same as the other two call sites (`readSnapshot`, `tuning-read.ts`) that follow the
// same rule.
import { describe, expect, it } from "vitest";
import { db } from "../../db";
import {
  assembleSourceFigures,
  sourceDeckPresenceQuery,
  sourceDeckSizesQuery,
} from "./read";

describe("sourceDeckSizesQuery", () => {
  it("filters by userId as well as the deck id list — a candidate deck must be the reader's own", () => {
    const { sql: text, params } = sourceDeckSizesQuery(db, ["d1", "d2"], "user_1").toSQL();
    expect(text).toMatch(/"decks"\."user_id"\s*=/i);
    expect(text).toMatch(/"decks"\."id"\s+in\b/i);
    expect(params).toContain("user_1");
    expect(params).toContain("d1");
    expect(params).toContain("d2");
  });

  it("qualifies the correlated subquery's predicate against the outer deck's id — see AGENTS.md's correlated-subquery section; found by Copilot's round-5 review, the exact pitfall that section warns about", () => {
    const { sql: text } = sourceDeckSizesQuery(db, ["d1"], "user_1").toSQL();
    expect(text).toMatch(/where\s+dc\.deck_id\s*=\s*"decks"\.id/i);
  });
});

describe("sourceDeckPresenceQuery", () => {
  it("filters on both the deck id list and the oracle id list — a row is a real pair, not a cross join", () => {
    const { sql: text, params } = sourceDeckPresenceQuery(db, ["d1"], ["o1", "o2"]).toSQL();
    expect(text).toMatch(/"deck_cards"\."deck_id"\s+in\b/i);
    expect(text).toMatch(/"deck_cards"\."oracle_id"\s+in\b/i);
    expect(params).toEqual(["d1", "o1", "o2"]);
  });
});

describe("assembleSourceFigures", () => {
  it("joins a pair to its deck's size and reports inDraft only when the pair itself is present", () => {
    const built = new Map([["d1", 40]]);
    const present = new Set(["d1:o1"]);
    const figures = assembleSourceFigures(
      [{ deckId: "d1", oracleId: "o1" }, { deckId: "d1", oracleId: "o2" }],
      built,
      present,
    );
    expect(figures.get("d1:o1")).toEqual({ built: 40, inDraft: true });
    expect(figures.get("d1:o2")).toEqual({ built: 40, inDraft: false });
  });

  it("skips a pair whose deck is absent from built, rather than reporting a size of zero", () => {
    const figures = assembleSourceFigures(
      [{ deckId: "someone_elses_deck", oracleId: "o1" }],
      new Map(),
      new Set(),
    );
    expect(figures.has("someone_elses_deck:o1")).toBe(false);
  });
});
