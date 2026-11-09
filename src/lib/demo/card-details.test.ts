import { describe, expect, it, vi } from "vitest";
import { indexPriceRows } from "../cards/price-lookup";
import { packCardDetails } from "./card-details-pack";
import type { DemoCardDetails } from "./project-cards";
import { encodeDemo } from "./wire";

vi.mock("./card-details.generated", () => ({ cardDetailsJson: null }));

const prices = indexPriceRows([
  { scryfall_id: "id-a", set_code: "lea", collector_number: "1", price_cents: 900, price_cents_foil: null, price_cents_etched: null, as_of: "2026-11-08", newest_as_of: "2026-11-08" },
] as never);
const details = { x: { oracleId: "x", name: "Sol Ring", prices } } as unknown as DemoCardDetails;
const deckCombos = { played: { x: null }, over: {}, under: {} };
const file = (format: number) => encodeDemo({ format, cardDetails: packCardDetails(details), deckCombos });

describe("decodeCardDetails", () => {
  it("reads the file as the modal takes it, prices unpacked, and none from a file not yet written or in another format", async () => {
    const { decodeCardDetails } = await import("./card-details");
    expect(decodeCardDetails(file(1))).toEqual({ cardDetails: details, deckCombos });
    expect(decodeCardDetails(null)).toBeNull();
    expect(decodeCardDetails(file(2))).toBeNull();
  });
});

describe("loadDemoCardDetails", () => {
  it("fetches the chunk once, and every press after the first takes the same answer", async () => {
    const { loadDemoCardDetails } = await import("./card-details");
    const first = loadDemoCardDetails();
    expect(loadDemoCardDetails()).toBe(first);
    expect(await first).toBeNull();
  });
});
