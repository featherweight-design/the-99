import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { backfillQuery, baselineMissingQuery, priceDropCandidatesQuery } from "./price-drop";

const render = (q: Parameters<PgDialect["sqlToQuery"]>[0]) => {
  const { sql, params } = new PgDialect().sqlToQuery(q);
  return { q: sql.replace(/\s+/g, " "), params };
};

describe("the price-drop job's SQL", () => {
  it("finds every line still missing a baseline", () => {
    expect(render(baselineMissingQuery()).q)
      .toBe(`select distinct wi.oracle_id as oracle_id from "wishlist_items" wi where wi.price_at_add_cents is null`);
  });

  it("fills a baseline only where it is still empty, one statement for the run", () => {
    const { q, params } = render(backfillQuery(["a", "b"], [100, 250]));
    expect(q).toContain(`update "wishlist_items" wi set price_at_add_cents = v.cents from unnest($1::uuid[], $2::int[]) as v(oracle_id, cents)`);
    expect(q).toContain("where wi.oracle_id = v.oracle_id and wi.price_at_add_cents is null");
    expect(params).toEqual([["a", "b"], [100, 250]]);
  });

  it("reads only readers whose price-drop kind is on, only baselined lines, only lines the collection has not reached", () => {
    const { q } = render(priceDropCandidatesQuery());
    expect(q).toContain(`join "user_prefs" up on up.user_id = wi.user_id`);
    expect(q).toContain("where (up.feed_kinds ->> 'price-drop') is not null and wi.price_at_add_cents is not null");
    // Qualified on both sides (AGENTS.md, alias and qualify): an unqualified oracle_id would compare a row to itself.
    expect(q).toContain(`coalesce((select sum(ci.quantity) from "collection_items" ci where ci.user_id = wi.user_id and ci.oracle_id = wi.oracle_id), 0) < wi.quantity`);
  });
});
