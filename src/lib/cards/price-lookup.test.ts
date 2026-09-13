import { describe, expect, it } from "vitest";
import { indexPriceRows, priceFor, priceKeyFor, type PrintingPriceRow } from "./price-lookup";

const NEWEST = "2026-09-08 09:00:00";

const row = (over: Partial<PrintingPriceRow> = {}): PrintingPriceRow => ({
  newest_as_of: NEWEST,
  scryfall_id: "s-1",
  set_code: "C21",
  collector_number: "263",
  price_cents: 241,
  price_cents_foil: null,
  price_cents_etched: null,
  as_of: NEWEST,
  ...over,
});

describe("indexPriceRows", () => {
  it("indexes one printing under both its id and its set/number key", () => {
    const { byScryfallId, byPrintingKey } = indexPriceRows([row()]);

    expect(byScryfallId["s-1"]?.cents).toBe(241);
    expect(byPrintingKey[priceKeyFor({ setCode: "C21", collectorNumber: "263" })]?.cents).toBe(241);
  });

  it("reads the newest as_of even when no printing carries a price", () => {
    // The `left join ... on true` row: a card whose printings the feed has never
    // carried still has to tell the caller how old the table is, or every figure
    // elsewhere on the page would have nothing to be measured against.
    const { byScryfallId, newestAsOf } = indexPriceRows([
      row({ scryfall_id: null, set_code: null, collector_number: null, as_of: null }),
    ]);

    expect(byScryfallId).toEqual({});
    expect(newestAsOf?.toISOString()).toBe("2026-09-08T09:00:00.000Z");
  });

  it("drops a printing with no price row rather than storing a zeroed fact", () => {
    // A fact of nulls would be indistinguishable from a live row stocked in foil
    // only, which is a different claim about the shop.
    const { byScryfallId } = indexPriceRows([
      row({ scryfall_id: "s-2", as_of: null, price_cents: null }),
    ]);

    expect(byScryfallId["s-2"]).toBeUndefined();
  });

  it("keeps a stale row, because liveness is the reader's comparison and not a filter", () => {
    const { byScryfallId } = indexPriceRows([row({ as_of: "2026-08-25 09:00:00" })]);

    expect(byScryfallId["s-1"]?.asOf.toISOString()).toBe("2026-08-25T09:00:00.000Z");
  });

  it("carries a foil-only printing's figures", () => {
    const { byScryfallId } = indexPriceRows([
      row({ price_cents: null, price_cents_foil: 610 }),
    ]);

    expect(byScryfallId["s-1"]).toMatchObject({ cents: null, foilCents: 610 });
  });

  it("uppercases the set code on the key, as BrowsePrinting does", () => {
    const { byPrintingKey } = indexPriceRows([row({ set_code: "c21" })]);

    expect(byPrintingKey["C21|263"]).toBeDefined();
  });
});

describe("priceFor", () => {
  const prices = indexPriceRows([row(), row({
    scryfall_id: "s-2", collector_number: "264", price_cents: 999,
  })]);

  it("answers by the printing's own id", () => {
    expect(priceFor(prices, { scryfallId: "s-2", setCode: "C21", collectorNumber: "264" }))
      .toEqual({ fact: expect.objectContaining({ cents: 999 }) });
  });

  it("answers by set and collector number when the holding names no id", () => {
    // A bare `Name,Qty` import has no scryfall_id, but a holding that carries a
    // collector number still names exactly one printing.
    expect(priceFor(prices, { setCode: "C21", collectorNumber: "263" }))
      .toEqual({ fact: expect.objectContaining({ cents: 241 }) });
  });

  it("says the store answered no when the read succeeded and this printing is not in it", () => {
    expect(priceFor(prices, { scryfallId: "s-absent", setCode: "C21", collectorNumber: "999" }))
      .toEqual({ fact: null });
  });

  it("draws nothing when the printing names neither an id nor a collector number", () => {
    // Nothing was asked about, so `no stock` would be a claim we never made.
    expect(priceFor(prices, { setCode: "C21", collectorNumber: "" })).toBeNull();
  });

  it("draws nothing when no read reached us", () => {
    expect(priceFor(null, { scryfallId: "s-1", setCode: "C21", collectorNumber: "263" })).toBeNull();
  });

  it("falls through to set and number when the holding's id is not a printing id", () => {
    // `collection_items.scryfall_id` is not always a printing: the import falls back
    // to the oracle catalog's own id when `printings` has not been seeded
    // (`match.ts:59-63`). Treating that as a printing the feed never carried would
    // print `no stock` about an id the shop was never asked about.
    const prices = indexPriceRows([row()]);

    expect(priceFor(prices, { scryfallId: "oracle-level-id", setCode: "C21", collectorNumber: "263" }))
      .toEqual({ fact: expect.objectContaining({ cents: 241 }) });
  });

  it("still answers `the store said no` for an id the catalog does know", () => {
    const prices = indexPriceRows([
      row(),
      row({ scryfall_id: "s-unpriced", collector_number: "264", as_of: null, price_cents: null }),
    ]);

    expect(priceFor(prices, { scryfallId: "s-unpriced", setCode: "C21", collectorNumber: "264" }))
      .toEqual({ fact: null });
  });

  it("refuses a fallback key the catalog gives to two printings", () => {
    // `printings` puts no uniqueness on (set_code, collector_number), so two
    // variants can share one. A single-valued index would keep whichever row came
    // last and price a holding from a coin toss between siblings.
    const collided = indexPriceRows([
      row({ scryfall_id: "s-a", collector_number: "263", price_cents: 100 }),
      row({ scryfall_id: "s-b", collector_number: "263", price_cents: 5000 }),
    ]);

    expect(collided.ambiguousKeys).toEqual(["C21|263"]);
    expect(collided.byPrintingKey["C21|263"]).toBeUndefined();
    // The holding that names no id of its own gets silence, not one of the two.
    expect(priceFor(collided, { setCode: "C21", collectorNumber: "263" })).toBeNull();
    // A holding that DOES name its printing is unaffected: the id is exact.
    expect(priceFor(collided, { scryfallId: "s-b", setCode: "C21", collectorNumber: "263" }))
      .toEqual({ fact: expect.objectContaining({ cents: 5000 }) });
  });

  it("counts a collision even when only one of the two is priced", () => {
    const collided = indexPriceRows([
      row({ scryfall_id: "s-a", collector_number: "263" }),
      row({ scryfall_id: "s-b", collector_number: "263", as_of: null, price_cents: null }),
    ]);

    expect(collided.ambiguousKeys).toEqual(["C21|263"]);
    expect(priceFor(collided, { setCode: "C21", collectorNumber: "263" })).toBeNull();
  });

  it("never falls back to another printing of the same card", () => {
    // The figure sits under this printing's art. A sibling's price there would be
    // a number no copy of this card has.
    const only = indexPriceRows([row({ scryfall_id: "s-9", collector_number: "900" })]);

    expect(priceFor(only, { scryfallId: "s-1", setCode: "C21", collectorNumber: "263" }))
      .toEqual({ fact: null });
  });
});
