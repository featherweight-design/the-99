import { afterEach, describe, expect, it, vi } from "vitest";
import { ENV_VIEW } from "@/test/env-view";
import { PgDialect } from "drizzle-orm/pg-core";

const execute = vi.hoisted(() => vi.fn());
vi.mock("../../db", () => ({ db: { execute } }));

const { loadUnplayedCounts, unplayedCountsSql, NOVELTY_CANDIDATES } = await import("./home-novelty");
const { READY_COUNT } = await import("./ready-to-build");

describe("unplayedCountsSql", () => {
  const { sql, params } = new PgDialect().sqlToQuery(unplayedCountsSql("user_1", undefined, ENV_VIEW));

  it("scopes every read to the reader, and reaches past the set", () => {
    expect(params.filter((p) => p === "user_1")).toHaveLength(6);
    expect(params).toContain(NOVELTY_CANDIDATES);
    expect(NOVELTY_CANDIDATES).toBeGreaterThan(READY_COUNT);
  });

  // The ranked list's own order and filter, so the two agree about which commanders are in the set.
  it("picks candidates the way the ranked list orders them, built commanders out", () => {
    expect(sql).toContain("order by s.rank_score desc, s.oracle_id");
    expect(sql).toContain("bd.commander_oracle_id = s.oracle_id or bd.partner_oracle_id = s.oracle_id");
  });

  // `loadScores` refuses a set with one sentinel row and the ranked list recomputes; leaning on
  // that set's order would disagree with the list Home is drawing, so it yields no candidates.
  it("condemns a stale score set the way loadScores does", async () => {
    const { SCORE_WRITER_CURRENT } = await import("../../db/schema");
    expect(sql).toContain("stale.rank_score < 0 or stale.writer_version <>");
    expect(params).toContain(SCORE_WRITER_CURRENT);
  });

  // `assemble` also recomputes on a visible degraded row; a built commander's does not count.
  it("condemns a set with a visible degraded row, exempting built commanders", () => {
    expect(sql).toContain("dg.synergy_state = 'degraded'");
    expect(sql).toContain("dgd.commander_oracle_id = dg.oracle_id or dgd.partner_oracle_id = dg.oracle_id");
  });

  // A deck plays the tags of BOTH its commanders, as `loadPlayedTags` reads them for Something new.
  it("counts a partner's themes as played", () => {
    expect(sql).toContain("ps.commander_oracle_id = d.partner_oracle_id");
  });
});

describe("loadUnplayedCounts", () => {
  it("maps each candidate to its count", async () => {
    execute.mockResolvedValueOnce({ rows: [{ oracleId: "a", unplayed: 3 }, { oracleId: "b", unplayed: 0 }] });
    expect(await loadUnplayedCounts("user_1", ENV_VIEW)).toEqual(new Map([["a", 3], ["b", 0]]));
  });

  // A failed read costs the lean, never Home: null walks the plain shuffle.
  it("returns null rather than throwing when the read fails", async () => {
    execute.mockRejectedValueOnce(new Error("boom"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await loadUnplayedCounts("user_1", ENV_VIEW)).toBeNull();
    spy.mockRestore();
  });
});

describe("unplayedCountsSql by role basis", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("refuses any set not written under this basis: <> and the negated version with the switch on", async () => {
    const { SCORE_WRITER_CURRENT } = await import("../../db/schema");
    vi.stubEnv("LABEL_ROLE_COUNTS_ENABLED", "true");
    const on = new PgDialect().sqlToQuery(unplayedCountsSql("user_1", undefined, ENV_VIEW));
    expect(on.sql).toMatch(/stale\.writer_version <> \$\d+/);
    expect(on.params).toContain(-SCORE_WRITER_CURRENT);
    expect(on.params).not.toContain(SCORE_WRITER_CURRENT);
    vi.stubEnv("LABEL_ROLE_COUNTS_ENABLED", "");
    const off = new PgDialect().sqlToQuery(unplayedCountsSql("user_1", undefined, ENV_VIEW));
    expect(off.params).toContain(SCORE_WRITER_CURRENT);
    expect(off.params).not.toContain(-SCORE_WRITER_CURRENT);
  });
});
