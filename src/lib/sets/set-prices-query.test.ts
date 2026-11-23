import { describe, expect, it } from "vitest";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

import { setPricesQuery } from "./read";

const dialect = new PgDialect();
const render = (q: SQL) => dialect.sqlToQuery(q);

// The statement main issued before stores, copied from `loadSetPrices` as it was, with the set code as `$1`.
const BEFORE = `
    with newest as (select max(as_of) as as_of from printing_prices)
    select n.as_of::text                    as newest_as_of,
           pp.scryfall_id                   as scryfall_id,
           pp.price_cents                   as cents,
           pp.price_cents_foil              as foil_cents,
           pp.price_cents_etched            as etched_cents,
           pp.as_of::text                   as as_of
      from newest n
      left join printings p on p.set_code = $1
      left join printing_prices pp on pp.scryfall_id = p.scryfall_id
  `;

describe("setPricesQuery", () => {
  it("reads Mana Pool byte for byte as the set page did before stores", () => {
    const { sql, params } = render(setPricesQuery("dsk", "manapool"));
    expect({ sql, params }).toEqual({ sql: BEFORE, params: ["dsk"] });
  });

  it("reads another store's own rows against its own newest, and carries sold_out", () => {
    const { sql, params } = render(setPricesQuery("dsk", "tcgplayer"));
    expect(sql).not.toMatch(/\bprinting_prices\b/);
    expect(sql).toMatch(/with newest as \(select max\(as_of\) as as_of from printing_store_prices where store = \$1\)/);
    expect(sql).toContain("pp.sold_out                      as sold_out");
    expect(params).toContain("dsk");
    expect(params.filter((v) => v === "tcgplayer")).toHaveLength(2);
  });
});
