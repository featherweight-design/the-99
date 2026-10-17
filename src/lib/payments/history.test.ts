// The history reader's question, read off the emitted SQL (a component test never sees it): the grants of THIS reader,
// newest first, bounded, and qualified by table so a later join cannot change which column a name means.
import { describe, expect, it } from "vitest";
import { creditHistoryQuery, HISTORY_LIMIT } from "./return";

describe("creditHistoryQuery", () => {
  const q = creditHistoryQuery("user_a").toSQL();

  it("filters on the reader's own user_id, bound, never interpolated, and qualified", () => {
    expect(q.sql).toContain('"credit_grants"."user_id" = $1');
    expect(q.params[0]).toBe("user_a");
  });

  it("selects the columns a row draws and a receipt is fetched by", () => {
    for (const c of ["id", "source", "units", "revoked_units", "created_at", "external_id"]) expect(q.sql).toContain(`"${c}"`);
  });

  it("is newest first and bounded", () => {
    expect(q.sql).toMatch(/order by "credit_grants"\."created_at" desc/);
    expect(q.sql).toMatch(/limit \$2/);
    expect(q.params[1]).toBe(HISTORY_LIMIT);
  });
});
