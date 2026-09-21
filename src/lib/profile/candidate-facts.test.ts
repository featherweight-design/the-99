import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";

/** Rendered rather than stringified — a `sql` template has no useful `toString`. */
const dialect = new PgDialect();

/**
 * The SQL, rendered — the half a unit test can reach.
 *
 * This loader's cost is its whole justification: one statement for a 480-candidate pool
 * against ~195ms each candidate-by-candidate (`pnpm measure:facts-cost`). What can be pinned
 * without a database is that it issues ONE statement for the completions rather than one per
 * candidate, and that the statement asks the set question — a variant with exactly one piece
 * held — rather than re-running the deck's whole combo match.
 *
 * The returned FIGURES need a real Postgres and belong to a probe.
 */
const executed: string[] = [];
vi.mock("../../db", () => ({
  db: {
    select: () => ({ from: () => ({ where: async () => [] }) }),
    execute: async (q: Parameters<PgDialect["sqlToQuery"]>[0]) => {
      executed.push(dialect.sqlToQuery(q).sql);
      return { rows: [] };
    },
  },
}));
vi.mock("../bracket/flags-read", () => ({ loadBracketFlags: async () => new Map() }));

const { loadCandidateFacts } = await import("./candidate-facts");

describe("the candidate facts read", () => {
  it("issues ONE completions statement for a whole pool", async () => {
    executed.length = 0;
    const pool = Array.from({ length: 200 }, (_, i) => `c${i}`);
    await loadCandidateFacts(pool, ["d1", "d2"]);
    // 200 candidates, one statement. The naive shape is 200, measured at ~39 seconds.
    expect(executed).toHaveLength(1);
  });

  it("asks for variants the deck holds exactly ONE piece of", async () => {
    executed.length = 0;
    await loadCandidateFacts(["c1"], ["d1"]);
    // The set question. `h.n = 1` is what makes it "one card away" rather than "assembled"
    // or "untouched", and it is the whole difference from `assembledCombosQuery`.
    expect(executed[0]).toContain("h.n = 1");
    expect(executed[0]).toMatch(/card_count\s*=\s*2/);
    // Template-gated variants name a CATEGORY of card, so a decklist cannot assemble one.
    expect(executed[0]).toContain("requires_template_ids");
  });

  it("does not count a card the deck already holds as completing anything", async () => {
    executed.length = 0;
    await loadCandidateFacts(["d1"], ["d1"]);
    // Otherwise a card already in the deck reads as closing the combo it is already half of.
    expect(executed[0]).toMatch(/t\.oracle_id\s*<>\s*all/);
  });

  it("makes no round trip for an empty pool", async () => {
    executed.length = 0;
    const out = await loadCandidateFacts([], ["d1"]);
    expect(out.size).toBe(0);
    expect(executed).toHaveLength(0);
  });

  it("makes no completions query for a deck with no cards", async () => {
    executed.length = 0;
    // Nothing can be one card away from a combo when nothing is held.
    await loadCandidateFacts(["c1"], []);
    expect(executed).toHaveLength(0);
  });
});
