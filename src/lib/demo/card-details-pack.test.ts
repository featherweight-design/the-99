import { describe, expect, it } from "vitest";
import { cheapestLiveCents, indexPriceRows, priceFor } from "../cards/price-lookup";
import { encodeDemo, decodeDemo } from "./wire";
import { packCardDetails, packPrices, unpackCardDetails, unpackPrices } from "./card-details-pack";
import type { DemoCardDetails } from "./project-cards";

// Catalog rows as the price read returns them: two printings sharing one (set, number) pair (so the key is ambiguous), one
// unpriced printing, one priced row with no catalog id, and two printings with the same figure on the same day.
const row = (id: string | null, set: string | null, cn: string | null, cents: number | null, asOf: string | null) => ({
  scryfall_id: id, set_code: set, collector_number: cn, price_cents: cents, price_cents_foil: cents === null ? null : cents * 2,
  price_cents_etched: null, as_of: asOf, newest_as_of: "2026-11-08",
});
const prices = indexPriceRows([
  row("id-a", "lea", "1", 900, "2026-11-08"),
  row("id-b", "sld", "7", 120, "2026-11-08"),
  row("id-c", "sld", "7", 130, "2026-11-01"),
  row("id-d", "cmr", "3", null, null),
  row(null, "plst", "9", 450, "2026-11-08"),
  row("id-e", "m21", "2", 120, "2026-11-08"),
] as never);

describe("packPrices", () => {
  it("unpacks to exactly the read's object, through the file's encoding", () => {
    const back = unpackPrices(decodeDemo(JSON.parse(JSON.stringify(encodeDemo(packPrices(prices))))));
    expect(back).toEqual(prices);
    // Key order too: the modal's cheapest-price pass walks `byScryfallId` in order.
    expect(Object.keys(back.byScryfallId)).toEqual(Object.keys(prices.byScryfallId));
    expect(Object.keys(back.byPrintingKey)).toEqual(Object.keys(prices.byPrintingKey));
  });

  it("answers every question the modal asks the same way", () => {
    const back = unpackPrices(packPrices(prices));
    expect(cheapestLiveCents(back)).toBe(cheapestLiveCents(prices));
    for (const p of [
      { scryfallId: "id-a", setCode: "LEA", collectorNumber: "1" },
      { scryfallId: "id-d", setCode: "CMR", collectorNumber: "3" },
      { setCode: "SLD", collectorNumber: "7" },
      { setCode: "PLST", collectorNumber: "9" },
      { setCode: "M21", collectorNumber: "" },
    ]) expect(priceFor(back, p)).toEqual(priceFor(prices, p));
  });

  it("writes each price once however many printings share it", () => {
    const packed = packPrices(prices);
    expect(packed.facts.length).toBeLessThan(packed.byId.length + packed.byKey.length);
    expect(packed.dates).toHaveLength(2);
  });
});

describe("packCardDetails", () => {
  it("packs only the prices, leaves a card without them alone, and unpacks to the details it was given", () => {
    const details = { x: { oracleId: "x", name: "Sol Ring", prices }, y: { oracleId: "y", name: "Forest", prices: null } } as unknown as DemoCardDetails;
    const file = packCardDetails(details) as Record<string, { prices: unknown; name: string }>;
    expect(file.x.name).toBe("Sol Ring");
    expect(file.x.prices).toMatchObject({ packed: 1 });
    expect(file.y.prices).toBeNull();
    expect(unpackCardDetails(file)).toEqual(details);
  });
});
