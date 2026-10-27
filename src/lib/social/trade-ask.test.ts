// What a page reads to open a trade match in place (product call 8): one card per oracle id, nothing read when no trade
// match is drawn, and a price read that fails leaves the sheet's bare tag rather than failing the page.
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ loadPrices: vi.fn() }));
vi.mock("../decks/price-query", () => ({ loadPrices: m.loadPrices }));

import { distinctCards, loadTradeAsk } from "./trade-ask";

const A = { oracleId: "a", name: "Ghalta, Primal Hunger", imageUri: null };
const B = { oracleId: "b", name: "Rhystic Study", imageUri: "https://img/b" };
beforeEach(() => {
  m.loadPrices.mockReset();
});

describe("distinctCards", () => {
  it("keeps the first of each oracle id, in order", () => {
    expect(distinctCards([A, B, { ...A, name: "again" }])).toEqual([A, B]);
  });
});

describe("loadTradeAsk", () => {
  it("reads nothing and returns null with no trade match", async () => {
    expect(await loadTradeAsk([])).toBeNull();
    expect(m.loadPrices).not.toHaveBeenCalled();
  });

  it("prices each card once, a card with no price as null", async () => {
    const asOf = new Date("2026-10-26T00:00:00Z");
    m.loadPrices.mockResolvedValue({ prices: new Map([["a", { cents: 72, foilCents: null, etchedCents: null, asOf }]]), newestAsOf: asOf });
    const out = await loadTradeAsk([A, B, A]);
    expect(m.loadPrices).toHaveBeenCalledWith(["a", "b"]);
    expect(out).toEqual({ cards: [A, B], prices: { a: { cents: 72, foilCents: null, etchedCents: null, asOf }, b: null }, newestAsOf: asOf });
  });

  it("keeps the cards with no prices when the price read fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    m.loadPrices.mockImplementation(async () => { throw new Error("down"); });
    expect(await loadTradeAsk([A])).toEqual({ cards: [A], prices: {}, newestAsOf: null });
  });
});
