// The Payments tab's questions, read off the emitted SQL (a component test never sees them).
import { describe, expect, it } from "vitest";
import { giftsQuery, grantsQuery, GRANTS_SHOWN, revenueQuery } from "./admin-read";

const start = new Date("2026-10-01T00:00:00Z");
const end = new Date("2026-11-01T00:00:00Z");

describe("the Payments tab's reads", () => {
  it("sums the month's payments per currency, counting the unattributed apart", () => {
    const q = revenueQuery(start, end).toSQL();
    expect(q.sql).toMatch(/from "payment_records" where \("payment_records"\."created_at" >= \$\d and "payment_records"\."created_at" < \$\d\) group by "payment_records"\."currency"/);
    expect(q.sql).toContain(`sum("amount_cents")`);
    expect(q.sql).toContain(`sum("tax_cents")`);
    expect(q.sql).toContain(`filter (where "status" = 'unattributed')`);
  });

  it("lists the month's bought and gifted lots alone, newest first and bounded, with the full count", () => {
    const q = grantsQuery(start, end).toSQL();
    expect(q.sql).toMatch(/"credit_grants"\."source" in \(\$1, \$2, \$3\)/);
    expect(q.params.slice(0, 3)).toEqual(["plan", "pack", "gift"]);
    expect(q.sql).toContain("count(*) over ()");
    expect(q.sql).toMatch(/order by "credit_grants"\."created_at" desc limit \$\d/);
    expect(q.params).toContain(GRANTS_SHOWN);
  });

  it("reads the month's credits_granted events alone", () => {
    const q = giftsQuery(start, end).toSQL();
    expect(q.sql).toMatch(/"admin_events"\."kind" = \$1/);
    expect(q.params[0]).toBe("credits_granted");
    expect(q.sql).toMatch(/^select "at", "actor_id", "user_id", "new_value", "note" from "admin_events"/);
  });
});
