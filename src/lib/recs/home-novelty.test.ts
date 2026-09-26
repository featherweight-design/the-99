import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

const execute = vi.hoisted(() => vi.fn());
vi.mock("../../db", () => ({ db: { execute } }));

const { loadUnplayedCounts, unplayedCountsSql, NOVELTY_CANDIDATES } = await import("./home-novelty");
const { READY_COUNT } = await import("./ready-to-build");

describe("unplayedCountsSql", () => {
  const { sql, params } = new PgDialect().sqlToQuery(unplayedCountsSql("user_1"));

  it("scopes every read to the reader, and reaches past the set", () => {
    expect(params.filter((p) => p === "user_1")).toHaveLength(3);
    expect(params).toContain(NOVELTY_CANDIDATES);
    expect(NOVELTY_CANDIDATES).toBeGreaterThan(READY_COUNT);
  });

  // The ranked list's own order and filter, so the two agree about which commanders are in the set.
  it("picks candidates the way the ranked list orders them, built commanders out", () => {
    expect(sql).toContain("order by s.rank_score desc, s.oracle_id");
    expect(sql).toContain("bd.commander_oracle_id = s.oracle_id or bd.partner_oracle_id = s.oracle_id");
  });

  // A deck plays the tags of BOTH its commanders, as `loadPlayedTags` reads them for Something new.
  it("counts a partner's themes as played", () => {
    expect(sql).toContain("ps.commander_oracle_id = d.partner_oracle_id");
  });
});

describe("loadUnplayedCounts", () => {
  it("maps each candidate to its count", async () => {
    execute.mockResolvedValueOnce({ rows: [{ oracleId: "a", unplayed: 3 }, { oracleId: "b", unplayed: 0 }] });
    expect(await loadUnplayedCounts("user_1")).toEqual(new Map([["a", 3], ["b", 0]]));
  });

  // A failed read costs the lean, never Home: null walks the plain shuffle.
  it("returns null rather than throwing when the read fails", async () => {
    execute.mockRejectedValueOnce(new Error("boom"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await loadUnplayedCounts("user_1")).toBeNull();
    spy.mockRestore();
  });
});
