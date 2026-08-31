import { describe, it, expect } from "vitest";
import { carryCanonicalSlugs, freePool } from "./free-ranking";
import type { PoolCard } from "./score";

const card = (oracleId: string): PoolCard => ({
  oracleId,
  name: oracleId,
  typeLine: "Instant",
  oracleText: null,
  keywords: [],
  colorIdentity: [],
  imageUri: null,
  manaCost: null,
});

const avail = (owned: number, hard: number) => ({
  owned,
  hard,
  soft: 0,
  free: owned - hard,
  hardDeckNames: [],
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
