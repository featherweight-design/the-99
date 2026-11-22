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

function sku(over: Record<string, unknown>) {
  return { scryfall_id: "p1", is_foil: "false", variation: "", price_retail: "1.00", qty_retail: 3, url: "mtg/set/card", ...over };
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
      scryfallId: "p1", store: "cardkingdom",
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
      sku({ url: "https://evil.example/x" }), sku({ url: "//evil.example/x" }), sku({ scryfall_id: "ok" }),
    ]));
    expect(r.skipped).toBe(6);
    expect(r.rows.map((x) => x.scryfallId)).toEqual(["ok"]);
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
    expect(cardKingdomContractProblems(feed([noUrl]))).toContain("first entry is missing url");
  });
  it("fails a price that changed type, which drains every row while the fields all still exist", () => {
    const problems = cardKingdomContractProblems(feed(Array.from({ length: 10 }, () => sku({ price_retail: 1 }))));
    expect(problems.some((p) => /unusable/.test(p))).toBe(true);
  });
});
