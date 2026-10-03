import { beforeEach, describe, expect, it, vi } from "vitest";

// The cache is bypassed outright: this is the state a list over the data cache's per-entry ceiling
// is in, rebuilt on every request and never stored, which is where a version stamped at build time
// made every fields batch read as stale.
const stub = vi.hoisted(() => ({ cards: [] as unknown[] }));
vi.mock("../cache/user-lists", () => ({
  cacheForUser: (_user: string, _key: string[], fn: () => Promise<unknown>) => fn(),
}));
vi.mock("./browse", () => ({ loadBrowseCards: async () => stub.cards }));

import { loadCollectionList } from "./payload";
import type { BrowseListCard } from "./browse";

const card = (oracleId: string, imageUri = `https://cards.example/${oracleId}.jpg`): BrowseListCard => ({
  oracleId, name: oracleId, typeLine: "Instant", manaCost: "{U}", rarity: "rare", colorIdentity: ["U"],
  imageUri, printedName: null, quantity: 1, setCounts: [["RTR", 1]], primarySetCode: "RTR",
} as BrowseListCard);
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  stub.cards = [card(A), card(B)];
});

describe("loadCollectionList's version", () => {
  it("is the same for an unchanged list read twice with no cache entry between them", async () => {
    const first = await loadCollectionList("user_1");
    await new Promise((r) => setTimeout(r, 5));
    const second = await loadCollectionList("user_1");
    expect(second.version).toBe(first.version);
  });

  it("does not move with the order the database returned the rows in", async () => {
    const first = await loadCollectionList("user_1");
    stub.cards = [card(B), card(A)];
    expect((await loadCollectionList("user_1")).version).toBe(first.version);
  });

  it("does not move with the order a card's printings were read in", async () => {
    stub.cards = [{ ...card(A), setCounts: [["RTR", 1], ["M10", 2]] } as BrowseListCard, card(B)];
    const first = await loadCollectionList("user_1");
    stub.cards = [{ ...card(A), setCounts: [["M10", 2], ["RTR", 1]] } as BrowseListCard, card(B)];
    expect((await loadCollectionList("user_1")).version).toBe(first.version);
  });

  // A printing picked on another device keeps the oracle id and moves the art: the list holds the
  // same ids and is not the same list.
  it("moves when a card's fields move under the same id", async () => {
    const first = await loadCollectionList("user_1");
    stub.cards = [card(A, "https://cards.example/other.jpg"), card(B)];
    expect((await loadCollectionList("user_1")).version).not.toBe(first.version);
  });
});
