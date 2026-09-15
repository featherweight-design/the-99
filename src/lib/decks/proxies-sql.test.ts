import { describe, it, expect } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { proxiedMembership } from "./proxies";

// Query SHAPE, rendered. The action's own tests stub every raw read with an
// undifferentiated `held: true`, so they cannot see which columns the predicate
// asks about — and `probe-proxies` used to carry its own copy of this SQL, which
// meant a regression dropping a commander arm left both green while proxying a
// commander broke in production. This is the `.toSQL()` idiom AGENTS.md already
// prescribes for exactly that gap.
const render = (q: ReturnType<typeof proxiedMembership>) =>
  new PgDialect().sqlToQuery(q).sql;

describe("the membership predicate", () => {
  const sql = render(proxiedMembership("d1", "o1"));

  it("accepts a card on the deck's list", () => {
    expect(sql).toContain("from deck_cards dc");
    expect(sql).toContain("dc.deck_id");
    expect(sql).toContain("dc.oracle_id");
  });

  it("accepts EITHER commander, which is ruling 3", () => {
    // Neither commander is a `deck_cards` row, so without these two clauses a
    // commander could not be marked at all.
    expect(sql).toContain("d.commander_oracle_id");
    expect(sql).toContain("d.partner_oracle_id");
  });

  it("scopes both arms to the one deck", () => {
    // Unscoped, any deck's membership would satisfy a mark on this one.
    expect(sql).toContain("d.id =");
  });
});
