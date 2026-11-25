import { describe, expect, it } from "vitest";
import type { PriceFact } from "../cards/price-fact";
import type { PrintingPrices } from "../cards/price-lookup";
import { wishlistPrintingView } from "./printing-line";

const NEWEST = new Date("2026-11-20T00:00:00Z");
const fact = (cents: number, asOf = NEWEST): PriceFact => ({ cents, foilCents: null, etchedCents: null, asOf });
const A = { scryfallId: "a", setCode: "SLD", collectorNumber: "2125", setName: "Fixture Lair set", imageUri: "a.jpg" };
const B = { scryfallId: "b", setCode: "STA", collectorNumber: "10", setName: "Strixhaven Mystical Archive", imageUri: "b.jpg" };
const prices = (byScryfallId: Record<string, PriceFact>): PrintingPrices =>
  ({ byScryfallId, byPrintingKey: {}, ambiguousKeys: new Set(), newestAsOf: NEWEST }) as unknown as PrintingPrices;
const base = { cardName: "Counterspell", printings: [A, B] };

describe("wishlistPrintingView", () => {
  it("names the wanted printing with its figure and the any-printing price", () => {
    const v = wishlistPrintingView({ ...base, wantedId: "a", previewId: null, prices: prices({ a: fact(2450), b: fact(149) }) });
    expect(v.count).toBe(2);
    expect(v.wanted).toMatchObject({ id: "a", price: "$24.50", soldOut: false });
    expect(v.preview).toBeNull();
    expect(v.anyPrice).toBe("$1.49");
  });
  it("reports a previewed printing only when it is not the wanted one", () => {
    const p = prices({ a: fact(2450), b: fact(149) });
    expect(wishlistPrintingView({ ...base, wantedId: "a", previewId: "a", prices: p }).preview).toBeNull();
    expect(wishlistPrintingView({ ...base, wantedId: "a", previewId: "b", prices: p }).preview).toMatchObject({ id: "b", setName: "Strixhaven Mystical Archive" });
    expect(wishlistPrintingView({ ...base, wantedId: null, previewId: "b", prices: p }).wanted).toBeNull();
  });
  it("marks a stale wanted printing sold out", () => {
    const v = wishlistPrintingView({ ...base, wantedId: "a", previewId: null, prices: prices({ a: fact(2450, new Date("2026-10-01T00:00:00Z")), b: fact(149) }) });
    expect(v.wanted?.soldOut).toBe(true);
  });
});
