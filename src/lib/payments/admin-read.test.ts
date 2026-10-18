// The Payments tab's questions, read off the emitted SQL (a component test never sees them).
import { describe, expect, it } from "vitest";
import { blockedQuery, disputesQuery, giftsQuery, grantsQuery, GRANTS_SHOWN, revenueQuery } from "./admin-read";

const start = new Date("2026-10-01T00:00:00Z");
const end = new Date("2026-11-01T00:00:00Z");

describe("the Payments tab's reads", () => {
  it("sums the month's payments per currency, counting the unattributed apart", () => {
    const q = revenueQuery(start, end).toSQL();
    // One table, no join: a payment's figures are its own record's, never a lot's.
    expect(q.sql).not.toContain("credit_grants");
    expect(q.sql).toMatch(/where \("payment_records"\."created_at" >= \$\d and "payment_records"\."created_at" < \$\d\) group by "payment_records"\."currency"/);
    expect(q.sql).toMatch(/sum\(("payment_records"\.)?"amount_cents"\)/);
    expect(q.sql).toMatch(/sum\(("payment_records"\.)?"tax_cents"\)/);
    expect(q.sql).toMatch(/filter \(where ("payment_records"\.)?"status" = 'unattributed'\)/);
  });

  it("reads each payment's refund off its own record, so a purge or a payment with no lot loses none, capped at the payment, with the tax inside it", () => {
    const q = revenueQuery(start, end).toSQL();
    expect(q.sql).toMatch(/least\(("payment_records"\.)?"refunded_cents", ("payment_records"\.)?"amount_cents"\)/);
    expect(q.sql).toMatch(/\* ("payment_records"\.)?"tax_cents" \/ ("payment_records"\.)?"amount_cents"/);
  });

  it("lists open disputes and the month's, reaching the account through the payment's lot", () => {
    const q = disputesQuery(start, end).toSQL();
    expect(q.sql).toContain(`left join "payment_records" on "payment_records"."payment_intent_id" = "payment_disputes"."payment_intent_id"`);
    expect(q.sql).toContain(`left join "credit_grants" on "credit_grants"."external_id" = "payment_records"."checkout_session_id"`);
    expect(q.sql).toMatch(/"payment_disputes"\."status" = \$1 or/);
    expect(q.params[0]).toBe("open");
    expect(q.sql).toContain(`"payment_disputes"."closed_at" >=`);
  });

  it("lists every paused account, whatever the month", () => {
    const q = blockedQuery().toSQL();
    expect(q.sql).toMatch(/where "stripe_customers"\."purchase_blocked_at" is not null order by "stripe_customers"\."purchase_blocked_at"/);
    expect(q.params).toEqual([]);
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
