import { describe, expect, it, vi } from "vitest";
import { indexPriceRows } from "../cards/price-lookup";
import { packCardDetails } from "./card-details-pack";
import type { DemoCardDetails } from "./project-cards";
import { encodeDemo } from "./wire";

// The chunks as the loader fetches them: each written (the played chunk holds `x`, shared holds `y`), and the played chunk's
// fetch can be made to fail, to see the next press try again.
const chunk = vi.hoisted(() => ({ fail: false, json: {} as Record<string, unknown> }));
const chunkFile = (name: string) => ({
  get cardDetailsJson() {
    if (name === "played" && chunk.fail) throw new Error("chunk failed to load");
    return chunk.json[name] ?? null;
  },
});
vi.mock("./card-details/binder.generated", () => chunkFile("binder"));
vi.mock("./card-details/played.generated", () => chunkFile("played"));
vi.mock("./card-details/over.generated", () => chunkFile("over"));
vi.mock("./card-details/under.generated", () => chunkFile("under"));
vi.mock("./card-details/shared.generated", () => chunkFile("shared"));

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
  const empty = { played: {}, over: {}, under: {} };
  const written = () => {
    chunk.json = Object.fromEntries(["binder", "played", "over", "under", "shared"].map((n) => [n, encodeDemo({ format: 1, cardDetails: {}, deckCombos: empty })]));
    chunk.json.played = encodeDemo({ format: 1, cardDetails: packCardDetails(details), deckCombos });
    chunk.json.shared = encodeDemo({ format: 1, cardDetails: { y: { oracleId: "y", name: "Mountain", prices: null } }, deckCombos: empty });
  };

  it("opens a step's own cards and the shared ones, fetched once: every press after the first takes the same answer", async () => {
    vi.resetModules();
    written();
    const { loadDemoCardDetails } = await import("./card-details");
    const first = loadDemoCardDetails("played");
    expect(loadDemoCardDetails("played")).toBe(first);
    const data = await first;
    expect(Object.keys(data!.cardDetails).sort()).toEqual(["x", "y"]);
    expect(data!.deckCombos.played).toEqual({ x: null });
    // Another step takes the shared cards and none of the played deck's.
    expect(Object.keys((await loadDemoCardDetails("binder"))!.cardDetails)).toEqual(["y"]);
  });

  it("reads none while a chunk is unwritten, and reads it again on the next press", async () => {
    vi.resetModules();
    written();
    delete chunk.json.shared;
    const { loadDemoCardDetails } = await import("./card-details");
    expect(await loadDemoCardDetails("played")).toBeNull();
    written();
    expect(await loadDemoCardDetails("played")).not.toBeNull();
  });

  it("with no step, reads every chunk at once, for a frame that holds one set of details", async () => {
    vi.resetModules();
    written();
    const { loadDemoCardDetails } = await import("./card-details");
    expect(Object.keys((await loadDemoCardDetails())!.cardDetails).sort()).toEqual(["x", "y"]);
  });

  it("does not keep a failed load: the next press tries again", async () => {
    vi.resetModules();
    written();
    const { loadDemoCardDetails } = await import("./card-details");
    chunk.fail = true;
    await expect(loadDemoCardDetails("played")).rejects.toThrow("chunk failed to load");
    chunk.fail = false;
    expect(await loadDemoCardDetails("played")).not.toBeNull();
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
