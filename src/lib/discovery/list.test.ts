import { describe, expect, it } from "vitest";
import { buildPoolRollup } from "../recs/pool-rollup";
import { assembleDiscovery } from "./list";

const candidate = (over: Partial<Parameters<typeof assembleDiscovery>[0]["candidates"][0]>) => ({
  oracleId: "a", name: "A",
  colorIdentity: ["G"], imageUri: null, edhrecTotal: 100, tags: [], ownedSupport: 50,
  ...over,
});

describe("assembleDiscovery", () => {
  const base = {
    candidates: [
      candidate({ oracleId: "a", name: "A", ownedSupport: 50,
                  tags: [{ slug: "counters", label: "Counters", count: 3 }] }),
      candidate({ oracleId: "b", name: "B", ownedSupport: 10, tags: [] }),
      candidate({ oracleId: "c", name: "C", ownedSupport: 90,
                  tags: [{ slug: "blink", label: "Blink", count: 2 }] }),
    ],
    ownedOracleIds: new Set(["a"]),
    playedTags: [{ deckName: "Zur", colorIdentity: ["W", "U", "B"], slugs: new Set(["blink"]) }],
    prices: new Map(),
    // A real rollup, empty: this suite is about assembly, and Phase 2's own test
    // is what proves the rollup correct. `undefined` here throws in `rollupFor`.
    rollup: buildPoolRollup([], new Map()),
    cardsRead: 2805,
  };

  it("ranks every item it carries, so rank survives colour filtering", () => {
    const got = assembleDiscovery({ ...base, sort: "fit" });
    expect(got.items.map((i) => i.oracleId)).toEqual(["c", "a", "b"]);
    expect(got.items.map((i) => i.rank)).toEqual([1, 2, 3]);
  });

  it("drops untagged commanders from the novelty sort only", () => {
    expect(assembleDiscovery({ ...base, sort: "fit" }).items.map((i) => i.oracleId))
      .toContain("b");
    expect(assembleDiscovery({ ...base, sort: "new" }).items.map((i) => i.oracleId))
      .not.toContain("b");
  });

  it("excludes a commander below the floor and reports the nearest miss", () => {
    const low = { ...base, candidates: [candidate({ ownedSupport: 20,
      tags: [{ slug: "counters", label: "Counters", count: 1 }] })] };
    const got = assembleDiscovery({ ...low, sort: "new" });
    expect(got.items).toEqual([]);
    expect(got.bestPct).toBe(20);
    expect(got.floorExcluded).toBe(1);
  });

  it("counts the population before the floor, so the subtitle is not the sort's count", () => {
    expect(assembleDiscovery({ ...base, sort: "new" }).candidateCount).toBe(3);
  });

  it("marks a candidate the player owns", () => {
    const got = assembleDiscovery({ ...base, sort: "fit" });
    expect(got.items.find((i) => i.oracleId === "a")!.owned).toBe(true);
    expect(got.items.find((i) => i.oracleId === "c")!.owned).toBe(false);
  });
});
