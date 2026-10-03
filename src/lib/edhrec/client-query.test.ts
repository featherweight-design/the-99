// The live cache read's SQL, rendered without a database. The retirement (How it works §5.2)
// compares each cached page against the index's stamp for the same commander, so the stamp has
// to come from that commander's own `commander_support` row, joined in the same statement.
import { describe, expect, it } from "vitest";
import { edhrecCacheQuery } from "./client";

describe("edhrecCacheQuery", () => {
  const q = edhrecCacheQuery(["00000000-0000-0000-0000-000000000001"]).toSQL();

  it("joins the index row by the commander's oracle id, qualified on both sides", () => {
    // A LEFT join: a commander the index does not hold keeps its cached page under the TTL alone.
    expect(q.sql).toContain(
      'left join "commander_support" on "commander_support"."commander_oracle_id" = "edhrec_cache"."commander_oracle_id"',
    );
  });

  it("reads the stamp from the index row, not the cache row", () => {
    expect(q.sql).toContain('"commander_support"."computed_at"');
    expect(q.sql).toContain('"edhrec_cache"."fetched_at"');
  });

  it("is one statement, so the pair it compares is read at one instant", () => {
    expect(q.sql.match(/\bselect\b/gi)).toHaveLength(1);
  });
});
