import { describe, expect, it } from "vitest";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

import { ownedPrintingPricesQuery, printingPricesQuery } from "./prices";

const dialect = new PgDialect();
const render = (q: SQL) => dialect.sqlToQuery(q);

// The statement main issued before stores, copied from `loadPrintingPrices` as it was, with the oracle id as `$1`.
const BEFORE = `
    with newest as (select max(as_of) as as_of from printing_prices)
    select n.as_of              as newest_as_of,
           p.scryfall_id        as scryfall_id,
           upper(p.set_code)    as set_code,
           p.collector_number   as collector_number,
           pp.price_cents       as price_cents,
           pp.price_cents_foil  as price_cents_foil,
           pp.price_cents_etched as price_cents_etched,
           pp.as_of             as as_of
      from newest n
      left join printings p on p.oracle_id = $1
      left join printing_prices pp on pp.scryfall_id = p.scryfall_id
  `;

describe("printingPricesQuery", () => {
  it("reads Mana Pool byte for byte as card details did before stores", () => {
    // The text and the parameters are what Postgres receives; a nested fragment adds a `typings` hint, which is not sent.
    const { sql, params } = render(printingPricesQuery("o-1", "manapool"));
    expect({ sql, params }).toEqual({ sql: BEFORE, params: ["o-1"] });
  });

  it("reads another store's own rows against its own newest, and carries sold_out", () => {
    const { sql, params } = render(printingPricesQuery("o-1", "tcgplayer"));
    expect(sql).not.toMatch(/\bprinting_prices\b/);
    expect(sql).toMatch(/with newest as \(select max\(as_of\) as as_of from printing_store_prices where store = \$1\)/);
    expect(sql).toMatch(/left join \(\s+select scryfall_id, as_of, sold_out/);
    expect(sql).toMatch(/\) s\s+\) pp on pp\.scryfall_id = p\.scryfall_id/);
    expect(sql).toContain("pp.sold_out          as sold_out");
    expect(params).toContain("o-1");
    expect(params.filter((v) => v === "tcgplayer")).toHaveLength(2);
  });
});

// The statement main issued before stores, copied from `loadOwnedPrintingPrices` as it was, with the ids as `$1`.
const OWNED_BEFORE = `
    with newest as (select max(as_of) as as_of from printing_prices),
         owned as (select distinct unnest($1::uuid[]) as oracle_id)
    select o.oracle_id          as oracle_id,
           n.as_of              as newest_as_of,
           p.scryfall_id        as scryfall_id,
           upper(p.set_code)    as set_code,
           p.collector_number   as collector_number,
           pp.price_cents       as price_cents,
           pp.price_cents_foil  as price_cents_foil,
           pp.price_cents_etched as price_cents_etched,
           pp.as_of             as as_of
      from newest n
      cross join owned o
      left join printings p on p.oracle_id = o.oracle_id
      left join printing_prices pp on pp.scryfall_id = p.scryfall_id
  `;

describe("ownedPrintingPricesQuery", () => {
  it("reads Mana Pool byte for byte as the owned-printings read did before stores", () => {
    const { sql, params } = render(ownedPrintingPricesQuery(["o-1", "o-2"], "manapool"));
    expect({ sql, params }).toEqual({ sql: OWNED_BEFORE, params: [["o-1", "o-2"]] });
  });

  it("reads another store's own rows against its own newest, and carries sold_out", () => {
    const { sql, params } = render(ownedPrintingPricesQuery(["o-1"], "tcgplayer"));
    expect(sql).not.toMatch(/\bprinting_prices\b/);
    expect(sql).toMatch(/from printing_store_prices where store = \$1\)/);
    expect(sql).toContain("pp.sold_out          as sold_out");
    expect(params.filter((v) => v === "tcgplayer")).toHaveLength(2);
  });
});
