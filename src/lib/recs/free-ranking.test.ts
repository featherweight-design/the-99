import { describe, it, expect, vi } from "vitest";
import { carryCanonicalSlugs, freePool, loadFreePool, rankFree } from "./free-ranking";
import type { CommanderListItem } from "./recommend";
import type { PoolCard } from "./score";

const loadCollectionPool = vi.hoisted(() => vi.fn());
const loadAvailability = vi.hoisted(() => vi.fn());
vi.mock("./recommend", async (orig) => ({
  ...(await orig<typeof import("./recommend")>()),
  loadCollectionPool,
}));
vi.mock("../decks/availability-query", () => ({ loadAvailability }));
vi.mock("../edhrec/client", () => ({ readEdhrecCache: async () => new Map() }));

const card = (oracleId: string): PoolCard => ({
  oracleId,
  name: oracleId,
  typeLine: "Instant",
  oracleText: null,
  keywords: [],
  colorIdentity: [],
  imageUri: null,
  artCropUri: null,
  manaCost: null,
});

// The free ranking scores the collection pool, which is read from off every
// decklist, so `free` really is `owned − hard` here. Fixtures for a deck's own
// list must set `free` explicitly instead.
const avail = (owned: number, hard: number) => ({
  owned,
  hard,
  soft: 0,
  free: owned - hard,
  claims: [],
});

describe("freePool", () => {
  it("drops a card with no free copies", () => {
    const pool = freePool([card("a"), card("b")], new Map([["a", avail(1, 1)]]));
    expect(pool.map((c) => c.oracleId)).toEqual(["b"]);
  });

  it("keeps a card that still has a spare copy", () => {
    const pool = freePool([card("a")], new Map([["a", avail(4, 3)]]));
    expect(pool.map((c) => c.oracleId)).toEqual(["a"]);
  });

  // Soft claims are brews, and a brew is not sleeved. They must NOT reduce the pool.
  it("keeps a card an unfinished brew wants", () => {
    const pool = freePool([card("a")], new Map([["a", { ...avail(1, 0), soft: 1 }]]));
    expect(pool.map((c) => c.oracleId)).toEqual(["a"]);
  });

  it("drops an over-committed card", () => {
    const pool = freePool([card("a")], new Map([["a", avail(1, 3)]]));
    expect(pool).toEqual([]);
  });

  // A card absent from the map has no claim on it at all.
  it("keeps a card with no availability row", () => {
    const pool = freePool([card("a")], new Map());
    expect(pool.map((c) => c.oracleId)).toEqual(["a"]);
  });
});

describe("carryCanonicalSlugs", () => {
  // Two commanders whose names produce the same slug base. finalizeRecommendations
  // would hand `kykar` to whichever ranks first and `kykar-2` to the other — so a
  // re-rank swaps their slugs, breaking every detail link and desynchronising the
  // two rank maps in the commanders list. Slugs must follow oracleId, not rank.
  const canonical = [
    { oracleId: "id-1", slug: "kykar" },
    { oracleId: "id-2", slug: "kykar-2" },
  ];

  it("keeps each commander's slug when the free ranking reverses their order", () => {
    const scored = [{ oracleId: "id-2" }, { oracleId: "id-1" }];
    expect(carryCanonicalSlugs(scored, canonical)).toEqual([
      { oracleId: "id-2", slug: "kykar-2" },
      { oracleId: "id-1", slug: "kykar" },
    ]);
  });

  it("drops a commander the canonical list has never seen, rather than inventing a slug", () => {
    const scored = [{ oracleId: "id-1" }, { oracleId: "id-unknown" }];
    expect(carryCanonicalSlugs(scored, canonical)).toEqual([{ oracleId: "id-1", slug: "kykar" }]);
  });
});

describe("rankFree with preloaded reads", () => {
  const item = (oracleId: string): CommanderListItem => ({
    oracleId,
    slug: oracleId,
    name: oracleId,
    colorIdentity: [],
    colorPoolSize: 1,
    roleCounts: { ramp: 0, draw: 0, removal: 0, wipes: 0 },
    edhrecOwnedCount: 0,
    edhrecTotal: 0,
    receipts: "",
    fitPool: 0,
    fitRoles: 0,
    fitSynergy: null,
    synergyState: "absent",
    score: 10,
    rankScore: 25,
    measurableTotal: 40,
    imageUri: null,
    artCropUri: null,
  });

  // The point of the parameter: `/commanders` has already made both reads for
  // the receipt clause, so the free path must not pay for them a second time.
  it("makes no reads of its own", async () => {
    const commander = { ...card("a"), typeLine: "Legendary Creature" };
    const out = await rankFree("user", [item("a")], {
      collection: [commander, card("b")],
      availability: new Map([["b", avail(1, 1)]]),
    });

    expect(out.ok).toBe(true);
    expect(out.items.map((i) => i.oracleId)).toEqual(["a"]);
    expect(loadCollectionPool).not.toHaveBeenCalled();
    expect(loadAvailability).not.toHaveBeenCalled();
  });
});

describe("loadFreePool", () => {
  it("returns the free slice of the collection", async () => {
    loadCollectionPool.mockResolvedValue({ collection: [card("a"), card("b")] });
    loadAvailability.mockResolvedValue(new Map([["a", avail(1, 1)]]));
    const pool = await loadFreePool("user-free-pool");
    expect(pool!.map((c) => c.oracleId)).toEqual(["b"]);
  });

  // Null, not a throw and not the whole collection: the detail page reads this
  // to decide whether free mode is available at all, and a silent fallback to
  // the canonical pool would pair a canonical score with a free rank.
  it("returns null when the availability rollup will not read", async () => {
    loadCollectionPool.mockResolvedValue({ collection: [card("a")] });
    loadAvailability.mockRejectedValue(new Error("rollup down"));
    expect(await loadFreePool("user-rollup-down")).toBeNull();
  });
});
