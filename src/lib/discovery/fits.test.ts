import { beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({
  decks: [] as unknown[],
  rows: [] as { deckId: string; oracleId: string; quantity: number }[],
  limits: [] as { id: string; limit: number | null; commander: string; partner: string | null }[],
  prices: new Map<string, unknown>(),
  spares: [] as { oracleId: string; spare: number }[],
  played: [] as { deckId: string }[],
  calls: [] as string[],
}));

vi.mock("../../db", () => ({
  db: {
    select: () => ({ from: () => ({ where: async () => stub.limits }) }),
    selectDistinct: () => ({ from: () => ({ innerJoin: () => ({ where: async () => { stub.calls.push("opponents"); return stub.played; } }) }) }),
  },
}));
vi.mock("../decks/read", () => ({ listDecksWithStats: async () => stub.decks }));
vi.mock("../decks/availability-query", () => ({
  loadDeckBuyRows: async () => { stub.calls.push("buyRows"); return stub.rows; },
}));
vi.mock("../decks/shopping-rollup", () => ({
  readBuyRowPrices: async () => { stub.calls.push("prices"); return { prices: stub.prices, newestAsOf: new Date("2026-10-16") }; },
}));
vi.mock("../decks/price-query", () => ({
  priceFor: (read: { prices: Map<string, unknown> }, deckId: string, oracleId: string) => read.prices.get(`${deckId}:${oracleId}`) ?? null,
}));
vi.mock("../social/spares", () => ({
  loadFriendSpares: async (_: string, ids: string[]) => { stub.calls.push(`spares:${ids.length}`); return stub.spares; },
}));

import { fitsOf, loadToolFits, type DeckFacts } from "./fits";

const facts = (id: string, over: Partial<DeckFacts> = {}): DeckFacts => ({
  id, name: id, built: 99, size: 99, overLimit: false, friendSpare: false, gameWithOpponents: false, ...over,
});
const ids = (fit: { decks: { id: string }[] } | undefined) => fit?.decks.map((d) => d.id);

describe("fitsOf", () => {
  it("judges each deck against its own body size, so a partner deck at 98 is full", () => {
    const decks = [facts("under", { built: 87 }), facts("pair", { built: 98, size: 98 }), facts("over", { built: 101 }), facts("full")];
    const fit = fitsOf(decks, ["top-off", "proposed-cuts", "suggested-changes", "mana-balance"]);
    expect(ids(fit["top-off"])).toEqual(["under"]);
    expect(ids(fit["proposed-cuts"])).toEqual(["over"]);
    expect(ids(fit["suggested-changes"])).toEqual(["pair", "full"]);
    expect(ids(fit["mana-balance"])).toEqual(["pair", "full"]);
  });

  it("keeps the order it is given and answers only the tools asked, with an empty list where none fits", () => {
    const fit = fitsOf([facts("b", { overLimit: true }), facts("a", { overLimit: true })], ["stand-ins", "matchups"]);
    expect(ids(fit["stand-ins"])).toEqual(["b", "a"]);
    expect(fit.matchups).toEqual({ decks: [] });
    expect(fit["top-off"]).toBeUndefined();
  });
});

const listed = (id: string, touched: string, over: Record<string, unknown> = {}) => ({
  id, name: id, built: 99, partnerName: null,
  lastEditedAt: new Date(touched), lastCommittedAt: null, lastPlayedAt: null, ...over,
});

beforeEach(() => {
  stub.decks = [];
  stub.rows = [];
  stub.limits = [];
  stub.prices = new Map();
  stub.spares = [];
  stub.played = [];
  stub.calls = [];
});

describe("loadToolFits", () => {
  const env = {} as NodeJS.ProcessEnv;

  it("orders the fitting decks most recently touched first", async () => {
    stub.decks = [listed("old", "2026-10-01", { built: 80 }), listed("new", "2026-10-15", { built: 80 })];
    expect(ids((await loadToolFits("u", env, ["top-off"]))["top-off"])).toEqual(["new", "old"]);
  });

  it("sizes a partner deck's body at 98, so 98 cards is full, not one short", async () => {
    stub.decks = [listed("pair", "2026-10-02", { built: 98, partnerName: "Tymna" })];
    const fit = await loadToolFits("u", env, ["top-off", "suggested-changes"]);
    expect(ids(fit["top-off"])).toEqual([]);
    expect(ids(fit["suggested-changes"])).toEqual(["pair"]);
  });

  it("reads no buy rows, prices, spares or games for tools nobody asked about", async () => {
    stub.decks = [listed("a", "2026-10-01")];
    await loadToolFits("u", env, ["top-off", "suggested-changes"]);
    expect(stub.calls).toEqual([]);
  });

  it("fits Cheaper stand-ins to a deck with a buy row over its own limit, never counting its commander", async () => {
    stub.decks = [listed("cheap", "2026-10-02"), listed("pricey", "2026-10-03"), listed("cmdr", "2026-10-04")];
    stub.rows = [
      { deckId: "cheap", oracleId: "c1", quantity: 1 },
      { deckId: "pricey", oracleId: "c2", quantity: 1 },
      { deckId: "cmdr", oracleId: "boss", quantity: 1 },
    ];
    stub.limits = [
      { id: "cheap", limit: 2500, commander: "x", partner: null },
      { id: "pricey", limit: null, commander: "y", partner: null },
      { id: "cmdr", limit: null, commander: "boss", partner: null },
    ];
    const asOf = new Date("2026-10-16");
    const at = (cents: number) => ({ cents, foilCents: null, etchedCents: null, asOf });
    stub.prices = new Map([["cheap:c1", at(2000)], ["pricey:c2", at(1500)], ["cmdr:boss", at(9900)]]);
    expect(ids((await loadToolFits("u", env, ["stand-ins"]))["stand-ins"])).toEqual(["pricey"]);
  });

  it("asks for spares once over every deck's missing cards, with no cap, and fits the decks missing a spared card", async () => {
    stub.decks = [listed("a", "2026-10-02"), listed("b", "2026-10-03")];
    stub.rows = [
      ...Array.from({ length: 250 }, (_, i) => ({ deckId: "a", oracleId: `a${i}`, quantity: 1 })),
      { deckId: "b", oracleId: "shared", quantity: 1 },
      { deckId: "a", oracleId: "shared", quantity: 1 },
    ];
    stub.spares = [{ oracleId: "a249", spare: 1 }];
    const fit = await loadToolFits("u", env, ["friend-spares"]);
    expect(stub.calls).toContain("spares:251");
    expect(ids(fit["friend-spares"])).toEqual(["a"]);
  });

  it("fits Matchups to a deck with a game that recorded an opponent", async () => {
    stub.decks = [listed("a", "2026-10-02"), listed("b", "2026-10-03")];
    stub.played = [{ deckId: "a" }];
    expect(ids((await loadToolFits("u", env, ["matchups"])).matchups)).toEqual(["a"]);
  });

  it("asks nothing with no tools", async () => {
    expect(await loadToolFits("u", env, [])).toEqual({});
  });
});
