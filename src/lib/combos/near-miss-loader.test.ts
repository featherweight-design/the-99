import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `loadCompletionPartners`'s candidate argument, which has two meanings that must never be
 * confused: `null` is EVERY card that would complete something (the quick-add bar's
 * whole-deck map), and `[]` is NO cards (a page list that came back empty).
 *
 * Reading `[]` as "all" would quietly widen the deck page's read to the whole deck the first
 * time its candidate list was empty; reading `null` as "none" ships a map that is always
 * empty, which is invisible because an empty map is exactly what a deck with no combos
 * returns. Both are asserted here against the query the loader actually issues.
 */
const execute = vi.fn();
vi.mock("../../db", () => ({ db: { execute } }));
const { loadCompletionPartners } = await import("./near-miss");

const dialect = new PgDialect();
const DECK = ["11111111-1111-1111-1111-111111111111"];
const COMMANDER = ["22222222-2222-2222-2222-222222222222"];
const CANDIDATE = "33333333-3333-3333-3333-333333333333";

beforeEach(() => {
  execute.mockReset();
  execute.mockResolvedValue({ rows: [] });
});

function firstQuery() {
  const q = dialect.sqlToQuery(execute.mock.calls[0][0] as SQL);
  return { sql: q.sql.replace(/\s+/g, " "), params: q.params };
}

describe("loadCompletionPartners — the candidate argument", () => {
  it("null asks about every card: the query runs with no candidate filter", async () => {
    await loadCompletionPartners({
      deckOracleIds: DECK,
      commanderOracleIds: COMMANDER,
      candidateOracleIds: null,
    });
    expect(execute).toHaveBeenCalledTimes(1);
    const { sql, params } = firstQuery();
    // The candidate filter is the only `want.oracle_id = any(` in the text; the other
    // `want.oracle_id` predicate is the negated not-present check.
    expect(sql).not.toMatch(/and want\.oracle_id = any\(/);
    expect(JSON.stringify(params)).not.toContain(CANDIDATE);
  });

  it("a list asks about those cards only", async () => {
    await loadCompletionPartners({
      deckOracleIds: DECK,
      commanderOracleIds: COMMANDER,
      candidateOracleIds: [CANDIDATE],
    });
    const { sql, params } = firstQuery();
    expect(sql).toMatch(/and want\.oracle_id = any\(/);
    expect(JSON.stringify(params)).toContain(CANDIDATE);
  });

  it("an empty list asks about nothing and issues no query", async () => {
    const out = await loadCompletionPartners({
      deckOracleIds: DECK,
      commanderOracleIds: COMMANDER,
      candidateOracleIds: [],
    });
    expect(out.size).toBe(0);
    expect(execute).not.toHaveBeenCalled();
  });

  it("an empty deck asks nothing, even for every card", async () => {
    await loadCompletionPartners({ deckOracleIds: [], commanderOracleIds: [], candidateOracleIds: null });
    expect(execute).not.toHaveBeenCalled();
  });
});
