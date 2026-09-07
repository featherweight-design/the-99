// getRankedList has two paths to the same list — the persisted scores and a
// full recompute — and only one of them touches the database on a warm cache.
// These tests pin the deck exclusion to the read, so a cache hit cannot
// reintroduce a commander the player has already built.
import { beforeEach, describe, expect, it, vi } from "vitest";

const loadScores = vi.fn<(userId: string) => Promise<unknown>>();
const persistScores = vi.fn<(userId: string, ranked: unknown[], gen: number | null) => Promise<void>>(
  async () => {},
);
const collectionGeneration = vi.fn<(userId: string) => Promise<number>>(async () => 1);
const recommendCommanders = vi.fn<(userId: string) => Promise<unknown>>();
const getCollectionStats = vi.fn<(userId: string) => Promise<{ uniqueCards: number }>>(async () => ({
  uniqueCards: 10,
}));
const loadBuiltCommanderIds = vi.fn<(userId: string) => Promise<Set<string>>>(
  async () => new Set<string>(),
);

vi.mock("./store", () => ({ loadScores, persistScores, collectionGeneration }));
vi.mock("./recommend", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./recommend")>()),
  recommendCommanders,
}));
vi.mock("../home/summary", () => ({ getCollectionStats }));
vi.mock("../discovery/candidates", () => ({ loadBuiltCommanderIds }));

const { getRankedList } = await import("./ranked-list");

/**
 * Only the fields these tests read, plus `overlapOwned` — the recompute path
 * runs the row through `toListItem`, which formats that array.
 */
function item(oracleId: string, score: number) {
  return { oracleId, score, overlapOwned: [] as string[] } as unknown as ReturnType<
    typeof import("./recommend").toListItem
  >;
}

beforeEach(() => {
  loadScores.mockReset();
  recommendCommanders.mockReset();
  loadBuiltCommanderIds.mockReset().mockResolvedValue(new Set<string>());
  persistScores.mockClear();
  getCollectionStats.mockReset().mockResolvedValue({ uniqueCards: 10 });
});

describe("getRankedList", () => {
  it("drops commanders that already helm a deck, on the cached path", async () => {
    loadScores.mockResolvedValue({
      items: [item("kept", 90), item("built", 95)],
      degradedOracleIds: [],
    });
    loadBuiltCommanderIds.mockResolvedValue(new Set(["built"]));

    const list = await getRankedList("user_1");

    expect(list.items.map((i) => i.oracleId)).toEqual(["kept"]);
    expect(recommendCommanders).not.toHaveBeenCalled();
  });

  it("drops them on the recompute path too", async () => {
    loadScores.mockResolvedValue({ items: [], degradedOracleIds: [] });
    recommendCommanders.mockResolvedValue({
      results: [item("kept", 90), item("built", 95)],
      degraded: false,
      uniqueCardsRead: 10,
      candidateCount: 2,
    });
    loadBuiltCommanderIds.mockResolvedValue(new Set(["built"]));

    const list = await getRankedList("user_1");

    expect(list.items.map((i) => i.oracleId)).toEqual(["kept"]);
  });

  it("reports the candidate count after exclusion, so the result line adds up", async () => {
    loadScores.mockResolvedValue({
      items: [item("kept", 90), item("built", 95)],
      degradedOracleIds: [],
    });
    loadBuiltCommanderIds.mockResolvedValue(new Set(["built"]));

    const list = await getRankedList("user_1");

    expect(list.candidateCount).toBe(1);
  });

  it("persists the whole computed set, so building a deck does not invalidate the cache", async () => {
    loadScores.mockResolvedValue({ items: [], degradedOracleIds: [] });
    recommendCommanders.mockResolvedValue({
      results: [item("kept", 90), item("built", 95)],
      degraded: false,
      uniqueCardsRead: 10,
      candidateCount: 2,
    });
    loadBuiltCommanderIds.mockResolvedValue(new Set(["built"]));

    await getRankedList("user_1");

    expect(persistScores.mock.calls[0]?.[1]).toHaveLength(2);
  });

  it("skips the deck read entirely for an empty collection", async () => {
    getCollectionStats.mockResolvedValue({ uniqueCards: 0 });
    loadScores.mockResolvedValue({ items: [], degradedOracleIds: [] });

    const list = await getRankedList("user_1");

    expect(list).toEqual({ items: [], degraded: false, uniqueCardsRead: 0, candidateCount: 0 });
    expect(loadBuiltCommanderIds).not.toHaveBeenCalled();
  });
});
