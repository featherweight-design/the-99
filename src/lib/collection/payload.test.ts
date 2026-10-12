import { beforeEach, describe, expect, it, vi } from "vitest";

// `cacheForUser` stood in by what `unstable_cache` does: store what a load returns, store nothing
// for a throw. The catalog generation that a price refresh moves is part of the real key.
const store = new Map<string, unknown>();
let generation = "g1";
vi.mock("../cache/user-lists", () => ({
  cacheForUser: async (userId: string, key: string[], load: () => Promise<unknown>) => {
    const k = [userId, generation, ...key].join("|");
    if (store.has(k)) return store.get(k);
    const value = await load();
    store.set(k, value);
    return value;
  },
}));
const loadBrowseCards = vi.fn();
vi.mock("./browse", () => ({ loadBrowseCards: (...args: unknown[]) => loadBrowseCards(...args) }));

const { loadCollectionList } = await import("./payload");

beforeEach(() => {
  store.clear();
  generation = "g1";
  loadBrowseCards.mockReset();
});

describe("loadCollectionList", () => {
  it("serves a list whose price read failed, says so, and stores nothing", async () => {
    loadBrowseCards.mockResolvedValueOnce({ cards: [{ oracleId: "a" }], pricesFailed: true });
    expect(await loadCollectionList("u")).toEqual({ cards: [{ oracleId: "a" }], pricesFailed: true });
    loadBrowseCards.mockResolvedValueOnce({ cards: [{ oracleId: "a", price: 80 }], pricesFailed: false });
    expect(await loadCollectionList("u")).toEqual({ cards: [{ oracleId: "a", price: 80 }], pricesFailed: false });
    expect(loadBrowseCards).toHaveBeenCalledTimes(2);
  });

  // What this pins is that the list is cached and that its key is the generation the cache layer
  // hands it. That the real key carries `catalogGeneration()` is pinned in `user-lists.test.ts`, and
  // that a price refresh moves it in `seed-prices.test.ts`.
  it("caches a priced list, and misses once the catalog generation moves", async () => {
    loadBrowseCards.mockResolvedValue({ cards: [{ oracleId: "a", price: 80 }], pricesFailed: false });
    await loadCollectionList("u");
    await loadCollectionList("u");
    expect(loadBrowseCards).toHaveBeenCalledTimes(1);
    generation = "g2";
    await loadCollectionList("u");
    expect(loadBrowseCards).toHaveBeenCalledTimes(2);
  });

  it("rethrows any other failure", async () => {
    loadBrowseCards.mockRejectedValueOnce(new Error("db down"));
    await expect(loadCollectionList("u")).rejects.toThrow("db down");
  });
});
