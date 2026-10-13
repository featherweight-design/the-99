import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENV_VIEW } from "@/test/env-view";

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
const chainArt = vi.fn();
vi.mock("../cards/chain-art", () => ({ chainArt: (...args: unknown[]) => chainArt(...args) }));
const readBuyRowPrices = vi.fn();
vi.mock("./shopping-rollup", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./shopping-rollup")>()),
  readBuyRowPrices: (...args: unknown[]) => readBuyRowPrices(...args),
}));

const { loadCart } = await import("./cart-read");

beforeEach(() => {
  selects.length = 0;
  selects.push(
    // The reader's deck count, for `7 of 21 decks are missing cards`.
    [{ total: 21 }],
    [
      { id: "gishath", name: "HD - Gishath", commanderOracleId: "g", partnerOracleId: null, brew: true },
      { id: "kratos", name: "HD - Kratos", commanderOracleId: "k", partnerOracleId: null, brew: true },
    ],
    [{ oracleId: "sol", name: "Sol Ring", imageUri: "catalog-sol.jpg" }],
  );
  readBuyRowPrices.mockReset();
  chainArt.mockReset();
  chainArt.mockResolvedValue(new Map());
});

describe("loadCart", () => {
  it("keeps its rows when the price read fails (T2), drawing no figure", async () => {
    readBuyRowPrices.mockRejectedValue(new Error("price read failed"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const cart = await loadCart("user", ENV_VIEW);
    spy.mockRestore();
    expect(cart.priced).toBe(false);
    expect(cart.newestAsOf).toBeNull();
    expect(cart.totalDecks).toBe(21);
    expect(cart.lines).toEqual([
      expect.objectContaining({
        name: "Sol Ring",
        rows: [
          { deckId: "gishath", quantity: 1, cents: null, state: null, commander: false, held: 0, finish: null, printing: null },
          { deckId: "kratos", quantity: 1, cents: null, state: null, commander: false, held: 0, finish: null, printing: null },
        ],
      }),
    ]);
    expect(cart.decks.map((d) => [d.name, d.copies, d.cents])).toEqual([["HD - Gishath", 1, 0], ["HD - Kratos", 1, 0]]);
  });

  it("starts the other reads without waiting on the price read", async () => {
    let settle: (v: null) => void = () => {};
    readBuyRowPrices.mockReturnValue(new Promise((resolve) => { settle = resolve; }));
    const pending = loadCart("user", ENV_VIEW);
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
    const cart = await loadCart("user", ENV_VIEW);
    expect(cart.priced).toBe(true);
    expect(cart.decks.map((d) => d.cents)).toEqual([150, 150]);
  });

  it("previews a line with the printing the player owns, and with the catalog's when they own none", async () => {
    readBuyRowPrices.mockRejectedValue(new Error("price read failed"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    chainArt.mockResolvedValue(new Map([["sol", "owned-sol.jpg"]]));
    expect((await loadCart("user", ENV_VIEW)).lines[0].imageUri).toBe("owned-sol.jpg");
    // The first three arguments only: the fourth is the env, which a test never compares or prints.
    expect(chainArt.mock.calls[0].slice(0, 3)).toEqual(["user", null, ["sol"]]);
    selects.length = 0;
    selects.push(
      [{ total: 21 }],
      [
        { id: "gishath", name: "HD - Gishath", commanderOracleId: "g", partnerOracleId: null, brew: true },
        { id: "kratos", name: "HD - Kratos", commanderOracleId: "k", partnerOracleId: null, brew: true },
      ],
      [{ oracleId: "sol", name: "Sol Ring", imageUri: "catalog-sol.jpg" }],
    );
    chainArt.mockResolvedValue(new Map());
    expect((await loadCart("user", ENV_VIEW)).lines[0].imageUri).toBe("catalog-sol.jpg");
    spy.mockRestore();
  });
});

// Admin adoption 6e: the cart is a cached page's load, keyed on the reader's resolved switches, and
// every read it starts decides from that env: the claim model's rows and holders, the printing picks
// behind the prices, and the art. An omitted env would fall back to the environment alone.
describe("loadCart threads the env it is handed", () => {
  it("hands the same env to every read it starts", async () => {
    const ENV = { NEVER_CUT_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
    const { loadDeckBuyRows, loadAvailability } = await import("./availability-query");
    vi.mocked(loadDeckBuyRows).mockClear();
    vi.mocked(loadAvailability).mockClear();
    readBuyRowPrices.mockResolvedValue(null);
    await loadCart("user", ENV);
    expect(vi.mocked(loadDeckBuyRows).mock.calls[0][3] === ENV).toBe(true);
    expect(vi.mocked(loadAvailability).mock.calls[0][1]?.env === ENV).toBe(true);
    expect(readBuyRowPrices.mock.calls[0][2] === ENV).toBe(true);
    expect(chainArt.mock.calls[0][3] === ENV).toBe(true);
  });
});
