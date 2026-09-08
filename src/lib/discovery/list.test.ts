import { describe, expect, it } from "vitest";
import { buildPoolRollup } from "../recs/pool-rollup";
import { assembleDiscovery } from "./list";

// `collectionSupport` defaults to `ownedSupport` — the two are equal for every
// ranking except a free-pool one, so a test that says nothing about the pool gets
// the case where the distinction does not arise.
const candidate = (over: Partial<Parameters<typeof assembleDiscovery>[0]["candidates"][0]>) => {
  const merged = {
    oracleId: "a", name: "A",
    colorIdentity: ["G"], imageUri: null, releasedAt: null,
    edhrecTotal: 100, deckCount: 1209, tags: [], ownedSupport: 50,
    ...over,
  };
  return { collectionSupport: merged.ownedSupport, ...merged };
};

describe("assembleDiscovery", () => {
  const base = {
    candidates: [
      candidate({ oracleId: "a", name: "A", ownedSupport: 50,
                  tags: [{ slug: "counters", label: "Counters", count: 3 }] }),
      candidate({ oracleId: "b", name: "B", ownedSupport: 10, tags: [] }),
      candidate({ oracleId: "c", name: "C", ownedSupport: 90,
                  tags: [{ slug: "blink", label: "Blink", count: 2 }] }),
    ],
    playedTags: [{ deckName: "Zur", colorIdentity: ["W", "U", "B"], slugs: new Set(["blink"]) }],
    prices: new Map(),
    // A real rollup, empty: this suite is about assembly, and Phase 2's own test
    // is what proves the rollup correct. `undefined` here throws in `rollupFor`.
    rollup: buildPoolRollup([], new Map()),
    cardsRead: 2805,
    freePoolSize: 2805,
    availOk: true,
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

  // The parser yields tags from a page whose card list can be missing, so a
  // tagged commander with no denominator is real. It has no distance to measure,
  // which is the untagged failure and not the floor's.
  it("does not count an unmeasurable floor as a floor exclusion", () => {
    const noDenominator = { ...base, candidates: [candidate({ edhrecTotal: null,
      tags: [{ slug: "counters", label: "Counters", count: 1 }] })] };
    const got = assembleDiscovery({ ...noDenominator, sort: "new" });
    expect(got.items).toEqual([]);
    expect(got.floorExcluded).toBe(0);
    expect(got.bestPct).toBeNull();
  });

  it("counts the population before the floor, so the subtitle is not the sort's count", () => {
    expect(assembleDiscovery({ ...base, sort: "new" }).candidateCount).toBe(3);
  });

  // `freePool` keeps ids the availability map is missing, so a failed read under
  // `avail: "free"` ranks the whole collection and looks like a fully free pool.
  // This flag is the only thing that tells the two apart.
  it("carries the availability read's outcome through to the list", () => {
    expect(assembleDiscovery({ ...base, sort: "fit" }).availOk).toBe(true);
    expect(assembleDiscovery({ ...base, sort: "fit", availOk: false }).availOk).toBe(false);
  });

  // Was "marks a candidate the player owns". Assembly no longer decides
  // ownership at all — the query hands it only commanders the player does not
  // own, which `candidates.test.ts` pins — so what is left to hold here is that
  // assembly asks the collection nothing: every candidate it is given lands in
  // the list.
  it("keeps every candidate it is handed, ownership being the query's call", () => {
    const got = assembleDiscovery({ ...base, sort: "fit" });
    expect(got.items.map((i) => i.oracleId).sort()).toEqual(["a", "b", "c"]);
    expect(got.candidateCount).toBe(3);
  });

  // The exclusion line's whole claim is that the figures it prints add up. Every
  // candidate is ranked, floor-excluded, or unmeasurable, and never two of them.
  it("partitions every candidate into exactly one of the three groups", () => {
    const got = assembleDiscovery({ ...base, sort: "new" });
    expect(got.items.length + got.floorExcluded + got.unmeasured).toBe(got.candidateCount);
    expect(got.unmeasured).toBe(1);
  });

  it("excludes nothing under the fit sort, so both exclusion counts are zero", () => {
    const got = assembleDiscovery({ ...base, sort: "fit" });
    expect(got.floorExcluded).toBe(0);
    expect(got.unmeasured).toBe(0);
    expect(got.poolExcluded).toBe(0);
  });

  // The defect this replaced: the floor read whichever pool was being scored, so
  // narrowing the pool silently removed rows from a list the control only claims
  // to reorder. 20 of 100 in the free pool, 60 of 100 in the collection — the
  // floor reads the second, so the row is ranked either way.
  it("decides the floor on the collection, so a narrowed pool removes nothing", () => {
    const pool = { ...base, candidates: [candidate({
      ownedSupport: 20, collectionSupport: 60,
      tags: [{ slug: "counters", label: "Counters", count: 1 }] })] };
    const got = assembleDiscovery({ ...pool, sort: "new" });
    expect(got.items).toHaveLength(1);
    expect(got.floorExcluded).toBe(0);
    expect(got.poolExcluded).toBe(0);
  });

  it("excludes a row the collection itself misses, and blames no pool for it", () => {
    const short = { ...base, candidates: [candidate({
      ownedSupport: 20, collectionSupport: 25,
      tags: [{ slug: "counters", label: "Counters", count: 1 }] })] };
    const got = assembleDiscovery({ ...short, sort: "new" });
    expect(got.items).toEqual([]);
    expect(got.floorExcluded).toBe(1);
    expect(got.poolExcluded).toBe(0);
  });

  // Both pools run through `clearsFloor`, so the floor is inclusive on both and
  // a row exactly on it is ranked rather than excluded. A SQL-side predicate for
  // the second pool would have had to restate this, and restating it is how the
  // sentence and the list come to disagree.
  it("clears a row sitting exactly on the floor, on either pool", () => {
    const onFloor = { ...base, candidates: [candidate({
      edhrecTotal: 70, ownedSupport: 21, collectionSupport: 21,
      tags: [{ slug: "counters", label: "Counters", count: 1 }] })] };
    const got = assembleDiscovery({ ...onFloor, sort: "new" });
    expect(got.items).toHaveLength(1);
    expect(got.floorExcluded).toBe(0);
    expect(got.poolExcluded).toBe(0);
  });

  // A zero denominator is unmeasurable, not cleared. SQL would have said
  // `0 >= 0.3 * 0` and called it a pool exclusion; a null denominator would have
  // yielded NULL into a boolean. `clearsFloor` guards both.
  it("treats a zero or null denominator as unmeasurable on the collection too", () => {
    for (const edhrecTotal of [0, null]) {
      const bad = { ...base, candidates: [candidate({
        edhrecTotal, ownedSupport: 0, collectionSupport: 0,
        tags: [{ slug: "counters", label: "Counters", count: 1 }] })] };
      const got = assembleDiscovery({ ...bad, sort: "new" });
      expect(got.items).toEqual([]);
      expect(got.floorExcluded).toBe(0);
      expect(got.poolExcluded).toBe(0);
      expect(got.unmeasured).toBe(1);
    }
  });

  it("carries the ranked pool's size, which is not the collection's", () => {
    expect(assembleDiscovery({ ...base, sort: "fit", freePoolSize: 1190 }).freePoolSize)
      .toBe(1190);
  });

  // It ships now, because the floor is applied over these rows and the floor
  // reads it. The figure the item carries has to be the figure the floor used,
  // or the two can disagree about why a row is missing.
  it("carries the collection-support count the floor was decided on", () => {
    const got = assembleDiscovery({ ...base, sort: "fit" });
    expect(got.items[0].collectionSupport).toBe(90);
  });
});
