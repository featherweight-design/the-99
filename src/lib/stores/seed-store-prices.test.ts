import { describe, expect, it } from "vitest";
import { db } from "../../db";
import { printingStorePrices, tokenStorePrices } from "../../db/schema";
import type { StorePriceRow } from "./rows";
import { upsertSet } from "./seed-store-prices";

const ROW: StorePriceRow = {
  scryfallId: "0000579f-7b35-4ed3-b44c-db2a538066fe", store: "cardkingdom",
  priceCents: 100, priceCentsFoil: null, priceCentsEtched: null,
  quantity: 3, quantityFoil: null, quantityEtched: null,
  buyUrl: "https://www.cardkingdom.com/mtg/x", buyUrlFoil: null, buyUrlEtched: null,
  asOf: new Date("2026-11-22T12:11:03Z"),
};

describe("upsertSet", () => {
  // The never-backwards guard: an older file re-run (a retried leg, a stale artifact) must not pull a store's rows
  // behind its newest as_of. Pinned on the rendered SQL, since the write itself needs a database.
  it.each([["printing_store_prices", printingStorePrices], ["token_store_prices", tokenStorePrices]] as const)(
    "%s conflicts on (scryfall_id, store) and only moves a row forward",
    (name, table) => {
      const { sql } = db.insert(table).values([ROW]).onConflictDoUpdate(upsertSet(table)).toSQL();
      expect(sql).toContain(`on conflict ("scryfall_id","store") do update set`);
      expect(sql).toContain(`where "${name}"."as_of" <= excluded.as_of`);
    },
  );
});
