// getRankedList has two paths to the same list — the persisted scores and a
// full recompute — and only one of them touches the database on a warm cache.
// These tests pin the deck exclusion to the read, so a cache hit cannot
// reintroduce a commander the player has already built.
import { beforeEach, describe, expect, it, vi } from "vitest";

const loadScores = vi.fn<(userId: string) => Promise<unknown>>();
const persistScores = vi.fn<(userId: string, ranked: unknown[], gen: number | null, indexGen?: number | null) => Promise<void>>(
  async () => {},
);
const collectionGeneration = vi.fn<(userId: string) => Promise<number>>(async () => 1);
// The commander-index fingerprint, alongside the collection's: `persistScores`
// drops a write whose index moved mid-compute, and `getRankedList` captures
// both before the read they describe.
const indexGeneration = vi.fn<() => Promise<string>>(async () => "42");
const recommendCommanders = vi.fn<(userId: string) => Promise<unknown>>();
const getCollectionStats = vi.fn<(userId: string) => Promise<{ uniqueCards: number }>>(async () => ({
  uniqueCards: 10,
}));
const loadBuiltCommanderIds = vi.fn<(userId: string) => Promise<Set<string>>>(
  async () => new Set<string>(),
);

vi.mock("./store", () => ({ loadScores, persistScores, collectionGeneration, indexGeneration }));
vi.mock("./recommend", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./recommend")>()),
  recommendCommanders,
}));
vi.mock("../home/summary", () => ({ getCollectionStats }));
vi.mock("../decks/built", () => ({ loadBuiltCommanderIds }));

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
  // Admin PR 6d-2: the stored set is read, the list computed and the set stored under the reader's
  // resolved switches. The environment has the label basis off; the env handed in has it on, and it
  // must reach all three, or a set counted by label is stored under the classifier's version.
  it("reads, computes and stores under the env it is handed, not the environment", async () => {
    vi.stubEnv("LABEL_ROLE_COUNTS_ENABLED", "false");
    try {
      const env = { LABEL_ROLE_COUNTS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
      loadScores.mockResolvedValue({ items: [], degradedOracleIds: [] });
      recommendCommanders.mockResolvedValue({ results: [item("a", 90)], degraded: false, uniqueCardsRead: 10, candidateCount: 1 });

      await getRankedList("user_1", env);

      expect((loadScores.mock.calls[0] as unknown[])[1]).toBe(env);
      expect((recommendCommanders.mock.calls[0] as unknown[])[1]).toBe(env);
      expect((persistScores.mock.calls[0] as unknown[])[5]).toBe(env);
    } finally {
      vi.unstubAllEnvs();
    }
  });

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

  it("serves a list counted by the classifier only because the label read failed, and does not store it", async () => {
    loadScores.mockResolvedValue({ items: [], degradedOracleIds: [] });
    recommendCommanders.mockResolvedValue({
      results: [item("kept", 90)],
      degraded: false,
      uniqueCardsRead: 10,
      candidateCount: 1,
      labelFallback: true,
    });
    loadBuiltCommanderIds.mockResolvedValue(new Set());

    const list = await getRankedList("user_1");

    expect(list.items).toHaveLength(1);
    expect(persistScores).not.toHaveBeenCalled();
  });

  // Both fingerprints have to REACH the write, and neither is visible in its
  // result: `persistScores` drops a stale write silently, so threading either
  // one wrong looks exactly like nothing being wrong.
  it("hands both the collection and index fingerprints to the write", async () => {
    loadScores.mockResolvedValue({ items: [], degradedOracleIds: [] });
    recommendCommanders.mockResolvedValue({
      results: [item("a", 90)],
      degraded: false,
      uniqueCardsRead: 10,
      candidateCount: 1,
    });
    loadBuiltCommanderIds.mockResolvedValue(new Set());

    await getRankedList("user_1");

    const call = persistScores.mock.calls[0];
    expect(call?.[2]).toBe(1); // collectionGeneration's value
    expect(call?.[3]).toBe("42"); // indexGeneration's value
  });

  // And both are captured BEFORE the compute reads what they fingerprint. Taken
  // after, each would describe the state the compute finished in and match
  // itself however much moved underneath — the guard would be inert and look
  // healthy. Order is the whole property, so order is what is asserted.
  it("captures both fingerprints before the compute reads anything", async () => {
    const order: string[] = [];
    collectionGeneration.mockImplementation(async () => { order.push("collection"); return 1; });
    indexGeneration.mockImplementation(async () => { order.push("index"); return "42"; });
    loadScores.mockResolvedValue({ items: [], degradedOracleIds: [] });
    recommendCommanders.mockImplementation(async () => {
      order.push("compute");
      return { results: [item("a", 90)], degraded: false, uniqueCardsRead: 1, candidateCount: 1 };
    });
    loadBuiltCommanderIds.mockResolvedValue(new Set());

    await getRankedList("user_1");

    // THE FULL SEQUENCE, not two `indexOf` comparisons. An absent entry yields
    // -1, and `compute` at index 0 is greater than -1 — so both comparisons
    // PASSED with either fingerprint call removed, which is the one thing this
    // case exists to catch. Asserting the whole order also fixes what a pair of
    // "before" checks cannot see: a third read slipping between them.
    expect(order).toEqual(["collection", "index", "compute"]);
  });

  // A degraded row the list does not show is a row nobody is looking at. Left in
  // the set, a built commander EDHREC does not index would put every request into
  // the recompute branch — which is the EDHREC fanout — for a row that is then
  // filtered out of the answer.
  it("ignores a built commander's degradation rather than recomputing for it", async () => {
    loadScores.mockResolvedValue({
      items: [item("kept", 90), item("built", 95)],
      degradedOracleIds: ["built"],
    });
    loadBuiltCommanderIds.mockResolvedValue(new Set(["built"]));

    const list = await getRankedList("user_1");

    expect(recommendCommanders).not.toHaveBeenCalled();
    expect(list.items.map((i) => i.oracleId)).toEqual(["kept"]);
  });

  // And it repairs the moment something reads it: deleting the deck takes the
  // commander out of `built`, which stops the filter removing it AND stops this
  // one ignoring its degradation.
  it("recomputes for that same row once its deck is gone", async () => {
    loadScores.mockResolvedValue({
      items: [item("kept", 90), item("was-built", 95)],
      degradedOracleIds: ["was-built"],
    });
    loadBuiltCommanderIds.mockResolvedValue(new Set<string>());
    recommendCommanders.mockResolvedValue({
      results: [item("kept", 90), item("was-built", 95)],
      degraded: false,
      uniqueCardsRead: 10,
      candidateCount: 2,
    });

    await getRankedList("user_1");

    expect(recommendCommanders).toHaveBeenCalled();
  });

  it("still recomputes when a VISIBLE row is degraded", async () => {
    loadScores.mockResolvedValue({
      items: [item("kept", 90), item("built", 95)],
      degradedOracleIds: ["kept"],
    });
    loadBuiltCommanderIds.mockResolvedValue(new Set(["built"]));
    recommendCommanders.mockResolvedValue({
      results: [item("kept", 90), item("built", 95)],
      degraded: false,
      uniqueCardsRead: 10,
      candidateCount: 2,
    });

    await getRankedList("user_1");

    expect(recommendCommanders).toHaveBeenCalled();
  });

  // The banner over the list is a claim about the rows in the list. A recompute
  // reports degradation across everything it scored, which now includes built
  // commanders, so the flag is read back off the visible rows.
  it("does not raise the outage banner for a built commander's outage", async () => {
    loadScores.mockResolvedValue({ items: [], degradedOracleIds: [] });
    recommendCommanders.mockResolvedValue({
      results: [
        { ...item("kept", 90), synergyState: "ok" },
        { ...item("built", 95), synergyState: "degraded" },
      ],
      degraded: true,
      uniqueCardsRead: 10,
      candidateCount: 2,
    });
    loadBuiltCommanderIds.mockResolvedValue(new Set(["built"]));

    const list = await getRankedList("user_1");

    expect(list.items.map((i) => i.oracleId)).toEqual(["kept"]);
    expect(list.degraded).toBe(false);
  });

  it("still raises it when a visible row is the degraded one", async () => {
    loadScores.mockResolvedValue({ items: [], degradedOracleIds: [] });
    recommendCommanders.mockResolvedValue({
      results: [
        { ...item("kept", 90), synergyState: "degraded" },
        { ...item("built", 95), synergyState: "ok" },
      ],
      degraded: true,
      uniqueCardsRead: 10,
      candidateCount: 2,
    });
    loadBuiltCommanderIds.mockResolvedValue(new Set(["built"]));

    expect((await getRankedList("user_1")).degraded).toBe(true);
  });

  it("skips the deck read entirely for an empty collection", async () => {
    getCollectionStats.mockResolvedValue({ uniqueCards: 0 });
    loadScores.mockResolvedValue({ items: [], degradedOracleIds: [] });

    const list = await getRankedList("user_1");

    expect(list).toEqual({ items: [], degraded: false, uniqueCardsRead: 0, candidateCount: 0 });
    expect(loadBuiltCommanderIds).not.toHaveBeenCalled();
  });
});
