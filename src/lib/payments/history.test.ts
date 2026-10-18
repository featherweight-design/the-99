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

  it("selects the columns a row draws and a receipt is fetched by, each qualified by its table", () => {
    for (const c of ["id", "source", "units", "revoked_units", "created_at", "external_id"]) expect(q.sql).toContain(`"credit_grants"."${c}"`);
    for (const c of ["amount_cents", "currency"]) expect(q.sql).toContain(`"payment_records"."${c}"`);
  });

  // payment_records carries no account id, so a payment is reached only THROUGH the viewer's own grant: a left join
  // on the Session id, with the viewer's filter on the grant side.
  it("joins the payment record through the grant's Session id, and keeps a grant that has no record", () => {
    expect(q.sql).toMatch(/left join "payment_records" on "credit_grants"\."external_id" = "payment_records"\."checkout_session_id"/);
    expect(q.sql).not.toMatch(/"payment_records"\."[a-z_]+" = \$1/);
  });

  // Purchases only: a welcome lot or an admin's gift is no history row, so neither makes a reader "someone who has bought".
  it("keeps plan and pack lots alone, so a welcome lot and a gift are left out", () => {
    expect(q.sql).toMatch(/"credit_grants"\."source" in \(\$2, \$3\)/);
    expect(q.params.slice(1, 3)).toEqual(["plan", "pack"]);
  });

  it("is newest first and bounded", () => {
    expect(q.sql).toMatch(/order by "credit_grants"\."created_at" desc/);
    expect(q.sql).toMatch(/limit \$4/);
    expect(q.params[3]).toBe(HISTORY_LIMIT);
  });
});
