import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { baselineCandidatesQuery, baselineQuery, currentLineQuery, lineNowCents, needsBaseline, priceDropCandidatesQuery } from "./price-drop";

const render = (q: Parameters<PgDialect["sqlToQuery"]>[0]) => {
  const { sql, params } = new PgDialect().sqlToQuery(q);
  return { q: sql.replace(/\s+/g, " "), params };
};

describe("the price-drop job's SQL", () => {
  it("reads the lines that may need a baseline: empty ones, and any line or reader in another store than Mana Pool", () => {
    const q = render(baselineCandidatesQuery()).q;
    expect(q).toContain(`from "wishlist_items" wi left join "user_prefs" up on up.user_id = wi.user_id`);
    expect(q).toContain("wi.price_at_add_cents is null as missing, coalesce(wi.price_store, 'manapool') as price_store, up.preferred_store as preferred_store");
    expect(q).toContain("where wi.price_at_add_cents is null or coalesce(wi.price_store, 'manapool') <> 'manapool' or coalesce(up.preferred_store, 'manapool') <> 'manapool'");
  });

  it("writes each baseline in its reader's store, only where still needed, and clears the notice only on a move", () => {
    const { q, params } = render(baselineQuery(["u1", "u2"], ["a", "b"], [null, "p"], [100, null], ["manapool", "tcgplayer"], [null, "tcgplayer"]));
    expect(q).toContain(`update "wishlist_items" wi set price_at_add_cents = v.cents, price_store = v.store, price_noticed_at = case when coalesce(wi.price_store, 'manapool') = v.store then wi.price_noticed_at end`);
    expect(q).toContain("from unnest($1::text[], $2::uuid[], $3::uuid[], $4::int[], $5::text[], $6::text[]) as v(user_id, oracle_id, scryfall_id, cents, store, preferred)");
    // One reader's line, by its card AND its chosen printing (null names "any printing").
    expect(q).toContain("where wi.user_id = v.user_id and wi.oracle_id = v.oracle_id and wi.scryfall_id is not distinct from v.scryfall_id");
    expect(q).toContain("and (wi.price_at_add_cents is null or coalesce(wi.price_store, 'manapool') <> v.store)");
    // A reader who changed store since the run read their choice is left for the next run.
    expect(q).toContain(`and (select bp.preferred_store from "user_prefs" bp where bp.user_id = wi.user_id) is not distinct from v.preferred`);
    expect(params).toEqual([["u1", "u2"], ["a", "b"], [null, "p"], [100, null], ["manapool", "tcgplayer"], [null, "tcgplayer"]]);
  });

  it("a line needs a baseline when it has none, or has another store's", () => {
    expect(needsBaseline({ missing: true, price_store: "manapool" }, "manapool")).toBe(true);
    expect(needsBaseline({ missing: false, price_store: "manapool" }, "manapool")).toBe(false);
    expect(needsBaseline({ missing: false, price_store: "manapool" }, "tcgplayer")).toBe(true);
    // Switched off again: a TCGplayer baseline moves back to Mana Pool.
    expect(needsBaseline({ missing: false, price_store: "tcgplayer" }, "manapool")).toBe(true);
    expect(needsBaseline({ missing: false, price_store: "cardkingdom" }, "cardkingdom")).toBe(false);
  });

  it("reads only readers who want price-drop news (the feed kind on, or a device with its push on), only baselined lines, only lines the collection has not reached", () => {
    const { q, params } = render(priceDropCandidatesQuery());
    expect(q).toContain(`join "user_prefs" up on up.user_id = wi.user_id`);
    expect(q).toContain("(up.feed_kinds ->> $1::text) is not null");
    expect(q).toContain("(up.push_kinds ->> $2::text) is not null");
    expect(q).toContain(`exists (select 1 from "push_subscriptions" wnt where wnt.user_id = wi.user_id)`);
    expect(params).toEqual(["price-drop", "price-drop"]);
    expect(q).toContain("and wi.price_at_add_cents is not null");
    // The line's store and the reader's choice, for the job to compare in the reader's store alone.
    expect(q).toContain("coalesce(wi.price_store, 'manapool') as price_store, up.preferred_store as preferred_store");
    // Qualified on both sides (AGENTS.md, alias and qualify): an unqualified oracle_id would compare a row to itself.
    // "Collected" is the one `heldCopies` expression, so a line naming a printing is reached only by that printing.
    expect(q).toContain("ci.user_id = wi.user_id and ci.oracle_id = wi.oracle_id and (wi.scryfall_id::uuid is null or ci.scryfall_id = wi.scryfall_id::uuid");
    expect(q).toContain("< wi.quantity");
  });

  it("re-reads one line row-locked, with its baseline, stamp and whether it is still unmet", () => {
    const { q, params } = render(currentLineQuery("u1", "card"));
    expect(q).toContain(`from "wishlist_items" wi where wi.user_id = $1 and wi.oracle_id = $2 for update`);
    expect(q).toContain("wi.price_at_add_cents as at_add_cents, coalesce(wi.price_store, 'manapool') as price_store, wi.scryfall_id as scryfall_id, wi.price_noticed_at as noticed_at");
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
