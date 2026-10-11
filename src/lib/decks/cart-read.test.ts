import { beforeEach, describe, expect, it, vi } from "vitest";

// `loadCart` through its own boundary: the rows, decks and card names resolve, and the price read
// REJECTS. T2 says the cart still draws its rows, with no figure (audit finding 8).
const selects: unknown[][] = [];
vi.mock("../../db", () => ({
  db: {
    select: () => ({ from: () => ({ where: async () => selects.shift() ?? [] }) }),
  },
}));
vi.mock("./availability-query", () => ({
  loadDeckBuyRows: vi.fn(async () => [
    { deckId: "gishath", oracleId: "sol", quantity: 1 },
    { deckId: "kratos", oracleId: "sol", quantity: 1 },
  ]),
  loadAvailability: vi.fn(async () => new Map()),
}));
const readBuyRowPrices = vi.fn();
vi.mock("./shopping-rollup", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./shopping-rollup")>()),
  readBuyRowPrices: (...args: unknown[]) => readBuyRowPrices(...args),
}));

const { loadCart } = await import("./cart-read");

beforeEach(() => {
  selects.length = 0;
  selects.push(
    [
      { id: "gishath", name: "HD - Gishath", commanderOracleId: "g", partnerOracleId: null, brew: true },
      { id: "kratos", name: "HD - Kratos", commanderOracleId: "k", partnerOracleId: null, brew: true },
    ],
    [{ oracleId: "sol", name: "Sol Ring" }],
  );
  readBuyRowPrices.mockReset();
});

describe("loadCart", () => {
  it("keeps its rows when the price read fails (T2), drawing no figure", async () => {
    readBuyRowPrices.mockRejectedValue(new Error("price read failed"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const cart = await loadCart("user");
    spy.mockRestore();
    expect(cart.priced).toBe(false);
    expect(cart.newestAsOf).toBeNull();
    expect(cart.lines).toEqual([
      expect.objectContaining({
        name: "Sol Ring",
        rows: [
          { deckId: "gishath", quantity: 1, cents: null, state: null },
          { deckId: "kratos", quantity: 1, cents: null, state: null },
        ],
      }),
    ]);
    expect(cart.decks.map((d) => [d.name, d.copies, d.cents])).toEqual([["HD - Gishath", 1, 0], ["HD - Kratos", 1, 0]]);
  });

  it("starts the other reads without waiting on the price read", async () => {
    let settle: (v: null) => void = () => {};
    readBuyRowPrices.mockReturnValue(new Promise((resolve) => { settle = resolve; }));
    const pending = loadCart("user");
    await new Promise((r) => setTimeout(r, 0));
    // Both metadata selects were consumed while the price read is still in flight.
    expect(selects).toHaveLength(0);
    settle(null);
    await pending;
  });

  it("prices the rows when the read succeeds", async () => {
    const now = new Date("2026-10-11T00:00:00Z");
    readBuyRowPrices.mockResolvedValue({
      prices: new Map([["sol", { cents: 150, foilCents: null, etchedCents: null, asOf: now }]]),
      newestAsOf: now,
    });
    const cart = await loadCart("user");
    expect(cart.priced).toBe(true);
    expect(cart.decks.map((d) => d.cents)).toEqual([150, 150]);
  });
});
