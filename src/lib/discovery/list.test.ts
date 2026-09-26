import { describe, expect, it } from "vitest";
import { buildPoolRollup } from "../recs/pool-rollup";
import type { PoolCard } from "../recs/score";
import { assembleDiscovery, assembleDiscoveryWithIds, discoveryKey } from "./list";

// `collectionSupport` defaults to `ownedSupport` — the two are equal for every
// ranking except a free-pool one, so a test that says nothing about the pool gets
// the case where the distinction does not arise.
const candidate = (over: Partial<Parameters<typeof assembleDiscovery>[0]["candidates"][0]>) => {
  const merged = {
    oracleId: "a", name: "A",
    colorIdentity: ["G"], imageUri: null, artCropUri: null, releasedAt: null,
    edhrecTotal: 100, deckCount: 1209, tags: [], prose: null, ownedSupport: 50,
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
    priceOk: true,
  };

  // THE FOUR NEW FIELDS, ASSERTED BY VALUE. `probe:fit-parity` exercises
  // `loadCandidates`, not this assembly, so a wiring regression here — reading
  // `collectionSupport` for the numerator, handing `gapSlotFor` the wrong
  // played set, dropping the slot — passes every other check in the suite.
  // Found by the pre-open review.
  //
  // The rollup is REAL rather than empty for this one, because `fitPool` and
  // `fitRoles` come out of it and an empty rollup makes both 0, which would let
  // the numerator be wired to anything and still read 0/40/whatever.
  describe("the row's own fields", () => {
    const pool: PoolCard[] = [
      { oracleId: "ramp-1", name: "Sol Ring", colorIdentity: [], typeLine: "Artifact",
        oracleText: "Add {C}{C}.", manaCost: "{1}", keywords: [],
        imageUri: null, artCropUri: null },
      { oracleId: "draw-1", name: "Divination", colorIdentity: ["U"], typeLine: "Sorcery",
        oracleText: "Draw two cards.", manaCost: "{2}{U}", keywords: [],
        imageUri: null, artCropUri: null },
    ];

    const assembled = (over: Parameters<typeof candidate>[0] = {}) =>
      assembleDiscovery({
        ...base,
        rollup: buildPoolRollup(pool, new Map()),
        candidates: [candidate({ oracleId: "a", name: "A", edhrecTotal: 100, ownedSupport: 30,
                                 ...over })],
        sort: "fit",
      }).items[0];

    it("prints Fit from the identity-restricted overlap and the stored total", () => {
      const item = assembled();

      // DERIVED BY HAND, so the assertion is independent of the code under
      // test. Pool: 2 cards of the 200 full mark → round(0.01 × 15) = 0.
      // Roles: ramp 1 of 10 and draw 1 of 10, the other two empty, so coverage
      // is (0.1 + 0.1 + 0 + 0) / 4 = 0.05 → round(0.05 × 25) = 1.
      // Synergy: 30 of 100 → round(0.3 × 60) = 18. Total 19.
      //
      // The first version read `expect(score).toBe(18 + (score - 18))`, which is
      // algebraically true for every value and would have passed with Fit
      // omitted entirely. Found by review, and the second tautology of its kind
      // in this file.
      expect(item.measurableTotal).toBe(100);
      expect(item.score).toBe(19);
    });

    // The one case that separates "wired to the numerator" from "wired to
    // anything": two candidates identical but for the overlap must differ.
    it("moves Fit when the overlap moves and nothing else does", () => {
      const low = assembled({ ownedSupport: 0 });
      const high = assembled({ ownedSupport: 100 });

      expect(high.score - low.score).toBe(60);
      expect(low.measurableTotal).toBe(high.measurableTotal);
    });

    // FIT READS `ownedSupport`, NEVER `collectionSupport`, and the two are equal
    // in every other fixture here — the helper derives one from the other — so
    // swapping them passed every assertion above while changing what the row
    // prints. They differ only when the ranked pool is narrower than the
    // collection, which is the case this fixture builds by hand.
    //
    // `collectionSupport` is the FLOOR's numerator and `ownedSupport` is Fit's.
    // A row wired to the wrong one agrees with the detail page only while the
    // two pools are the same.
    it("takes Fit from ownedSupport rather than collectionSupport", () => {
      const item = assembleDiscovery({
        ...base,
        rollup: buildPoolRollup(pool, new Map()),
        candidates: [
          {
            ...candidate({ oracleId: "a", name: "A", edhrecTotal: 100, ownedSupport: 20 }),
            collectionSupport: 100,
          },
        ],
        sort: "fit",
      }).items[0];

      // A DIFFERENCE, not an absolute: `fitPool` and `fitRoles` come out of the
      // rollup and asserting their exact values here would pin this case to the
      // rollup's arithmetic instead of to the wiring. Wired to
      // `collectionSupport` both rows read the same score, so the delta is 0.
      const sameCollection = assembleDiscovery({
        ...base,
        rollup: buildPoolRollup(pool, new Map()),
        candidates: [
          {
            ...candidate({ oracleId: "a", name: "A", edhrecTotal: 100, ownedSupport: 100 }),
            collectionSupport: 100,
          },
        ],
        sort: "fit",
      }).items[0];

      // 20/100 against 100/100 is 48 of the 60-point weight.
      expect(sameCollection.score - item.score).toBe(48);
    });

    // A null total is no reading, so the row is scored out of 40 — the state
    // the handoff calls "the denominator it was given".
    it("scores out of 40 when the index carried no total", () => {
      const item = assembled({ edhrecTotal: null });

      expect(item.measurableTotal).toBe(40);
      expect(item.score).toBeLessThanOrEqual(40);
    });

    it("carries the stored sentence through, null included", () => {
      expect(assembled({ prose: "It grinds counters." }).prose).toBe("It grinds counters.");
      expect(assembled({ prose: null }).prose).toBeNull();
    });

    // All three gap states, decided from the candidate's own tags against the
    // fixture's one played deck (`blink`).
    it("draws the gap slot from the classifier, not from tags.length", () => {
      const unplayed = assembled({
        deckCount: 1000,
        // A LABEL FROM THE GENERATED ALLOWLIST, not an invented one: bare
        // "Counters" is not a mechanic there and classified as noMechanics,
        // which failed this case on a correct build.
        tags: [{ slug: "counters-matter", label: "Counters Matter", count: 500 }],
      });
      expect(unplayed.gapSlot).toEqual({ kind: "unplayed", labels: ["Counters Matter"] });

      const allPlayed = assembled({
        deckCount: 1000,
        tags: [{ slug: "blink", label: "Blink", count: 500 }],
      });
      expect(allPlayed.gapSlot).toEqual({
        kind: "allPlayed",
        labels: ["Blink"],
        capped: false,
      });

      // A CREATURE TYPE IS NOT A MECHANIC, so a commander whose every tag is one
      // draws `noMechanics` rather than `allPlayed` — the ruling that keeps the
      // row from asserting something about a commander with nothing on file.
      const tribal = assembled({
        deckCount: 1000,
        tags: [{ slug: "frogs", label: "Frogs", count: 500 }],
      });
      expect(tribal.gapSlot).toEqual({ kind: "noMechanics" });
    });
  });

  it("ranks every item it carries, so rank survives colour filtering", () => {
    const got = assembleDiscovery({ ...base, sort: "fit" });
    expect(got.items.map((i) => i.name)).toEqual(["C", "A", "B"]);
    expect(got.items.map((i) => i.rank)).toEqual([1, 2, 3]);
  });

  it("drops untagged commanders from the novelty sort only", () => {
    expect(assembleDiscovery({ ...base, sort: "fit" }).items.map((i) => i.name))
      .toContain("B");
    expect(assembleDiscovery({ ...base, sort: "new" }).items.map((i) => i.name))
      .not.toContain("B");
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
    expect(got.items.map((i) => i.name).sort()).toEqual(["A", "B", "C"]);
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

  // Each of these is spent during assembly and read by nothing downstream:
  // `oracleId` is the sorts' final tiebreak, `collectionSupport` is what the
  // floor decides on, `counts` and `imageUri` arrive from shapes the owned lane
  // shares. Together they were about a quarter of the shipped payload.
  it("ships none of the four fields only assembly reads", () => {
    const [first] = assembleDiscovery({ ...base, sort: "fit" }).items;
    for (const key of ["oracleId", "collectionSupport", "counts", "imageUri"]) {
      expect(first).not.toHaveProperty(key);
    }
  });
});

// A payload assembled by an earlier deployment is not invalidated by the tag —
// that only drops on the reader's own writes — so the key carries the version of
// the code that produced it. Without the bump, a cached page kept offering a
// commander the player had already built with as a partner.
describe("assembleDiscoveryWithIds", () => {
  // Printed in's index is aligned to the rows by POSITION, so the ids have to come out in the
  // order the rows do, which the sort decides, not the order the candidates arrived in.
  it("hands back each row's oracle id in row order", () => {
    const { list, oracleIds } = assembleDiscoveryWithIds({
      candidates: [
        candidate({ oracleId: "low", name: "Low", ownedSupport: 10 }),
        candidate({ oracleId: "high", name: "High", ownedSupport: 90 }),
      ],
      playedTags: [],
      prices: new Map(),
      rollup: buildPoolRollup([], new Map()),
      cardsRead: 2805,
      freePoolSize: 2805,
      availOk: true,
      priceOk: true,
      sort: "fit",
    });
    expect(list.items.map((i) => i.name)).toEqual(["High", "Low"]);
    expect(oracleIds).toEqual(["high", "low"]);
  });
});

describe("discoveryKey", () => {
  it("files a payload under its sort and its version", () => {
    expect(discoveryKey("fit")).toEqual(["discovery", "fit", "v9"]);
  });

  it("keeps two sorts apart", () => {
    expect(discoveryKey("new")).not.toEqual(discoveryKey("fit"));
  });
});
