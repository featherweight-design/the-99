import { describe, expect, it } from "vitest";
import { parseCardKingdomPricelist } from "./cardkingdom";
import { dollarsToCents } from "./rows";
import { tcgplayerRow } from "./tcgplayer";
import { cardKingdomContractProblems } from "./cardkingdom-contract";

describe("dollarsToCents", () => {
  it.each([["0.29", 29], ["12.5", 1250], ["3", 300], [" 1.05 ", 105], ["1234.99", 123499]])("%s is %i cents", (s, c) => {
    expect(dollarsToCents(s)).toBe(c);
  });
  it.each([["0.00"], ["-1.00"], ["1.234"], ["abc"], [""], [null], [1.5], [undefined]])("%s is no price", (v) => {
    expect(dollarsToCents(v)).toBeNull();
  });
});

const AS_OF = new Date("2026-11-22T09:00:00Z");

describe("tcgplayerRow", () => {
  it("builds the product links from the TCGplayer ids, never Scryfall's purchase_uris", () => {
    const row = tcgplayerRow({
      id: "a", tcgplayer_id: 123, tcgplayer_etched_id: 456,
      prices: { usd: "0.35", usd_foil: "1.10", usd_etched: "4.00" },
      purchase_uris: { tcgplayer: "https://partner.tcgplayer.com/x?utm=scryfall" },
    }, AS_OF);
    expect(row).toEqual({
      scryfallId: "a", store: "tcgplayer",
      priceCents: 35, priceCentsFoil: 110, priceCentsEtched: 400,
      quantity: null, quantityFoil: null, quantityEtched: null,
      buyUrl: "https://www.tcgplayer.com/product/123", buyUrlFoil: null,
      buyUrlEtched: "https://www.tcgplayer.com/product/456",
      asOf: AS_OF,
    });
  });
  it("has no stock signal: quantities are null, never 0", () => {
    const row = tcgplayerRow({ id: "a", prices: { usd: "1.00", usd_foil: null } }, AS_OF);
    expect([row?.quantity, row?.quantityFoil, row?.quantityEtched]).toEqual([null, null, null]);
    expect(row?.buyUrl).toBeNull();
  });
  it("skips an entry with no price at all", () => {
    expect(tcgplayerRow({ id: "a", tcgplayer_id: 1, prices: { usd: null, usd_foil: null, usd_etched: null } }, AS_OF)).toBeNull();
    expect(tcgplayerRow({ id: "a" }, AS_OF)).toBeNull();
  });
});

const P1 = "5f8287b1-5bb6-5f4c-ad17-316a40d5bb0c";
const OK = "0000579f-7b35-4ed3-b44c-db2a538066fe";
function sku(over: Record<string, unknown>) {
  return { scryfall_id: P1, is_foil: "false", variation: "", price_retail: "1.00", qty_retail: 3, url: "mtg/set/card", ...over };
}
function feed(data: unknown[]) {
  return { meta: { created_at: "2026-11-22 12:11:03", base_url: "https://www.cardkingdom.com/" }, data };
}

describe("parseCardKingdomPricelist", () => {
  it("folds each finish's SKU into one row per printing, with its own price, stock and page", () => {
    const r = parseCardKingdomPricelist(feed([
      sku({}),
      sku({ is_foil: "true", price_retail: "2.50", qty_retail: 0, url: "mtg/set/card-foil" }),
      sku({ is_foil: "true", variation: "Foil Etched", price_retail: "4.00", qty_retail: 1, url: "mtg/set/card-foil-etched" }),
    ]));
    expect(r.asOf.toISOString()).toBe("2026-11-22T12:11:03.000Z");
    expect(r.rows).toEqual([{
      scryfallId: P1, store: "cardkingdom",
      priceCents: 100, priceCentsFoil: 250, priceCentsEtched: 400,
      quantity: 3, quantityFoil: 0, quantityEtched: 1,
      buyUrl: "https://www.cardkingdom.com/mtg/set/card",
      buyUrlFoil: "https://www.cardkingdom.com/mtg/set/card-foil",
      buyUrlEtched: "https://www.cardkingdom.com/mtg/set/card-foil-etched",
      asOf: r.asOf,
    }]);
  });
  it("an etched variation is etched whatever is_foil says", () => {
    const r = parseCardKingdomPricelist(feed([sku({ is_foil: "false", variation: "Foil Etched", url: "mtg/e" })]));
    expect(r.rows[0]).toMatchObject({ priceCents: null, priceCentsEtched: 100, buyUrl: "https://www.cardkingdom.com/mtg/e" });
  });
  it("of two SKUs for one finish, keeps the in-stock one, then the cheaper", () => {
    const r = parseCardKingdomPricelist(feed([
      sku({ price_retail: "0.50", qty_retail: 0, url: "mtg/a" }),
      sku({ price_retail: "0.90", qty_retail: 2, url: "mtg/b" }),
      sku({ price_retail: "0.70", qty_retail: 5, url: "mtg/c" }),
    ]));
    expect(r.rows[0]).toMatchObject({ priceCents: 70, quantity: 5, buyUrl: "https://www.cardkingdom.com/mtg/c" });
    expect(r.collapsed).toBe(2);
  });
  it("skips and counts rows it cannot use, including a link off Card Kingdom", () => {
    const r = parseCardKingdomPricelist(feed([
      sku({ scryfall_id: null }), sku({ price_retail: 1 }), sku({ qty_retail: "3" }), sku({ is_foil: "maybe" }),
      sku({ url: "https://evil.example/x" }), sku({ url: "//evil.example/x" }),
      // One short of a uuid, as the 2026-11-22 feed carried: it would fail the whole id lookup chunk in Postgres.
      sku({ scryfall_id: "4ae5a2ce-997e-4c09-a0c4-639c55a2340" }), sku({ scryfall_id: OK }),
    ]));
    expect(r.skipped).toBe(7);
    expect(r.rows.map((x) => x.scryfallId)).toEqual([OK]);
  });
  it("skips a link that does not parse rather than refusing the feed", () => {
    const r = parseCardKingdomPricelist(feed([sku({ url: "http://[" }), sku({ scryfall_id: OK })]));
    expect(r.skipped).toBe(1);
    expect(r.rows).toHaveLength(1);
  });
  it("lowercases the id, so it matches the catalog lookup's canonical form", () => {
    const r = parseCardKingdomPricelist(feed([sku({ scryfall_id: OK.toUpperCase() })]));
    expect(r.rows[0].scryfallId).toBe(OK);
  });
  it("refuses a payload without its meta or data", () => {
    expect(() => parseCardKingdomPricelist({ data: [] })).toThrow(/created_at/);
    expect(() => parseCardKingdomPricelist({ meta: { created_at: "2026-11-22 12:11:03", base_url: "http://x/" }, data: [] })).toThrow(/base_url/);
    expect(() => parseCardKingdomPricelist({ meta: { created_at: "nope", base_url: "https://x/" }, data: [] })).toThrow(/not a date/);
  });
});

describe("cardKingdomContractProblems", () => {
  it("names a missing field", () => {
    const { url: _url, ...noUrl } = sku({});
    expect(cardKingdomContractProblems(feed([noUrl]))).toContain("url is missing from 1 of 1 entries");
  });
  it("does not fail on one odd entry among many", () => {
    const { url: _url, ...noUrl } = sku({});
    const problems = cardKingdomContractProblems(feed([noUrl, ...Array.from({ length: 30 }, () => sku({}))]));
    expect(problems.some((p) => /url is missing/.test(p))).toBe(false);
  });
  it("fails a price that changed type, which drains every row while the fields all still exist", () => {
    const problems = cardKingdomContractProblems(feed(Array.from({ length: 10 }, () => sku({ price_retail: 1 }))));
    expect(problems.some((p) => /unusable/.test(p))).toBe(true);
  });
});
