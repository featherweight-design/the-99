import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { backfillQuery, baselineMissingQuery, currentLineQuery, lineNowCents, priceDropCandidatesQuery } from "./price-drop";

const render = (q: Parameters<PgDialect["sqlToQuery"]>[0]) => {
  const { sql, params } = new PgDialect().sqlToQuery(q);
  return { q: sql.replace(/\s+/g, " "), params };
};

describe("the price-drop job's SQL", () => {
  it("finds every line still missing a baseline", () => {
    expect(render(baselineMissingQuery()).q)
      .toBe(`select distinct wi.oracle_id as oracle_id, wi.scryfall_id as scryfall_id from "wishlist_items" wi where wi.price_at_add_cents is null`);
  });

  it("fills a baseline only where it is still empty, one statement for the run", () => {
    const { q, params } = render(backfillQuery(["a", "b"], [null, "p"], [100, 250]));
    expect(q).toContain(`update "wishlist_items" wi set price_at_add_cents = v.cents from unnest($1::uuid[], $2::uuid[], $3::int[]) as v(oracle_id, scryfall_id, cents)`);
    // A line is matched by its card AND its chosen printing (null names "any printing").
    expect(q).toContain("where wi.oracle_id = v.oracle_id and wi.scryfall_id is not distinct from v.scryfall_id and wi.price_at_add_cents is null");
    expect(params).toEqual([["a", "b"], [null, "p"], [100, 250]]);
  });

  it("reads only readers who want price-drop news (the feed kind on, or a device with its push on), only baselined lines, only lines the collection has not reached", () => {
    const { q, params } = render(priceDropCandidatesQuery());
    expect(q).toContain(`join "user_prefs" up on up.user_id = wi.user_id`);
    expect(q).toContain("(up.feed_kinds ->> $1::text) is not null");
    expect(q).toContain("(up.push_kinds ->> $2::text) is not null");
    expect(q).toContain(`exists (select 1 from "push_subscriptions" wnt where wnt.user_id = wi.user_id)`);
    expect(params).toEqual(["price-drop", "price-drop"]);
    expect(q).toContain("and wi.price_at_add_cents is not null");
    // Qualified on both sides (AGENTS.md, alias and qualify): an unqualified oracle_id would compare a row to itself.
    // "Collected" is the one `heldCopies` expression, so a line naming a printing is reached only by that printing.
    expect(q).toContain("ci.user_id = wi.user_id and ci.oracle_id = wi.oracle_id and (wi.scryfall_id::uuid is null or ci.scryfall_id = wi.scryfall_id::uuid");
    expect(q).toContain("< wi.quantity");
  });

  it("re-reads one line row-locked, with its baseline, stamp and whether it is still unmet", () => {
    const { q, params } = render(currentLineQuery("u1", "card"));
    expect(q).toContain(`from "wishlist_items" wi where wi.user_id = $1 and wi.oracle_id = $2 for update`);
    expect(q).toContain("wi.price_at_add_cents as at_add_cents, wi.scryfall_id as scryfall_id, wi.price_noticed_at as noticed_at");
    expect(q).toContain("ci.user_id = wi.user_id and ci.oracle_id = wi.oracle_id and (wi.scryfall_id::uuid is null");
    expect(q).toContain("< wi.quantity as unmet");
    expect(params).toEqual(["u1", "card"]);
  });
});

describe("lineNowCents", () => {
  const NEWEST = new Date("2026-11-22T00:00:00Z");
  const fact = (cents: number | null, asOf: Date) => ({ cents, foilCents: null, etchedCents: null, asOf });
  const read = (named: Map<string, ReturnType<typeof fact>>) => ({ named, newestAsOf: NEWEST }) as unknown as Parameters<typeof lineNowCents>[0];

  it("watches a chosen printing's own figure", () => {
    const r = read(new Map([["p1", fact(2450, NEWEST)]]));
    expect(lineNowCents(r, { oracle_id: "o", scryfall_id: "p1" })).toBe(2450);
  });

  it("has none for a printing the read does not hold, or one sold out (its last figure is older than the newest read)", () => {
    const r = read(new Map([["old", fact(2450, new Date("2026-11-01T00:00:00Z"))]]));
    expect(lineNowCents(r, { oracle_id: "o", scryfall_id: "gone" })).toBeNull();
    expect(lineNowCents(r, { oracle_id: "o", scryfall_id: "old" })).toBeNull();
  });
});
