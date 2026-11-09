import { describe, expect, it, vi } from "vitest";
import { indexPriceRows } from "../cards/price-lookup";
import { packCardDetails } from "./card-details-pack";
import type { DemoCardDetails } from "./project-cards";
import { encodeDemo } from "./wire";

// The chunk as the loader fetches it: the first fetch can be made to fail, to see the next press try again.
const chunk = vi.hoisted(() => ({ fail: false }));
vi.mock("./card-details.generated", () => ({
  get cardDetailsJson() {
    if (chunk.fail) throw new Error("chunk failed to load");
    return null;
  },
}));

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

  it("does not keep a failed load: the next press tries again", async () => {
    vi.resetModules();
    const { loadDemoCardDetails } = await import("./card-details");
    chunk.fail = true;
    await expect(loadDemoCardDetails()).rejects.toThrow("chunk failed to load");
    chunk.fail = false;
    expect(await loadDemoCardDetails()).toBeNull();
  });
});

describe("demoCardDetail", () => {
  const combo = (inScope: boolean) => ({ combos: [{ others: [] }], inScope }) as never;
  const data = {
    cardDetails: { a: { oracleId: "a", cardCombos: combo(false) }, b: { oracleId: "b", cardCombos: combo(false) }, c: { oracleId: "c" } },
    deckCombos: { played: { a: combo(true), b: null }, over: {}, under: {} },
  } as never;

  it("opens a card as it is anywhere off a deck step, and with no override", async () => {
    const { demoCardDetail } = await import("./card-details");
    expect(demoCardDetail(data, "a")?.cardCombos).toEqual(combo(false));
    expect(demoCardDetail(data, "a", "over")?.cardCombos).toEqual(combo(false));
    expect(demoCardDetail(data, "c", "played")).toEqual({ oracleId: "c" });
    expect(demoCardDetail(data, "zzz", "played")).toBeUndefined();
  });

  it("lays a deck step's combos over the card's, and a null override removes the block", async () => {
    const { demoCardDetail } = await import("./card-details");
    expect(demoCardDetail(data, "a", "played")?.cardCombos).toEqual(combo(true));
    expect(demoCardDetail(data, "b", "played")).toEqual({ oracleId: "b" });
  });
});
