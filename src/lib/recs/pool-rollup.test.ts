import { describe, expect, it } from "vitest";
import { buildPoolRollup, identityMask, rollupFor } from "./pool-rollup";
import { commanderPool, scoreCommander, type PoolCard, type RoleName } from "./score";
import { classifyRoles } from "./roles";
import { receiptCountsByCommander } from "../commanders/in-use";
import type { Availability } from "../decks/availability";

describe("identityMask", () => {
  it("maps WUBRG to fixed bits", () => {
    expect(identityMask([])).toBe(0);
    expect(identityMask(["W"])).toBe(1);
    expect(identityMask(["U"])).toBe(2);
    expect(identityMask(["B"])).toBe(4);
    expect(identityMask(["R"])).toBe(8);
    expect(identityMask(["G"])).toBe(16);
  });

  it("is order-insensitive", () => {
    expect(identityMask(["G", "W"])).toBe(identityMask(["W", "G"]));
  });

  it("subset test matches fitsIdentity", () => {
    const card = identityMask(["W", "U"]);
    const commander = identityMask(["W", "U", "B"]);
    expect((card & ~commander) === 0).toBe(true);
    expect((commander & ~card) === 0).toBe(false);
  });
});

const card = (over: Partial<PoolCard> & { oracleId: string }): PoolCard => ({
  name: over.oracleId, typeLine: "Creature — Human", oracleText: null,
  keywords: [], colorIdentity: [], imageUri: null, artCropUri: null, manaCost: null, ...over,
});

const collection: PoolCard[] = [
  card({ oracleId: "a", colorIdentity: ["W"], typeLine: "Sorcery",
         oracleText: "Draw two cards." }),
  card({ oracleId: "b", colorIdentity: ["U", "B"], typeLine: "Instant",
         oracleText: "Destroy target creature." }),
  card({ oracleId: "c", colorIdentity: [], typeLine: "Artifact",
         oracleText: "{T}: Add {C}." }),
  card({ oracleId: "d", colorIdentity: ["G"], typeLine: "Land",
         oracleText: "{T}: Add {G}." }),
  card({ oracleId: "e", colorIdentity: ["W", "U"], typeLine: "Sorcery",
         oracleText: "Destroy all creatures." }),
];

const avail = new Map<string, Availability>([
  ["a", { owned: 1, hard: 1, soft: 0, free: 0, claims: [] }],
  ["b", { owned: 2, hard: 0, soft: 1, free: 1, claims: [] }],
]);

const commanders = [
  { oracleId: "z", colorIdentity: ["W", "U", "B"] },
  { oracleId: "a", colorIdentity: ["W"] },      // a commander that is in the collection
  { oracleId: "y", colorIdentity: [] },
  { oracleId: "x", colorIdentity: ["W", "U", "B", "R", "G"] },
];

describe("pool rollup", () => {
  const rollup = buildPoolRollup(collection, avail);
  const shippedCounts = receiptCountsByCommander(commanders, collection, avail);

  for (const commander of commanders) {
    it(`agrees with the shipped walk for ${commander.oracleId}`, () => {
      const got = rollupFor(rollup, commander);
      const pool = commanderPool(commander, collection);

      expect(got.colorPoolSize).toBe(pool.length);

      const expected = { ramp: 0, draw: 0, removal: 0, wipes: 0 };
      for (const c of pool) {
        for (const role of classifyRoles(c)) {
          if (role !== "land") expected[role as RoleName]++;
        }
      }
      expect(got.roleCounts).toEqual(expected);
      expect(got.counts).toEqual(shippedCounts.get(commander.oracleId));
    });
  }
});

describe("pool rollup by label", () => {
  // Text reads `a` as draw, `b` as removal and `e` as wipes; the labels disagree on all three,
  // and `c` has no fresh label at all.
  const roleSets = new Map<string, readonly RoleName[]>([
    ["a", ["ramp"]],
    ["b", ["removal", "wipes"]],
    ["e", []],
  ]);
  const rollup = buildPoolRollup(collection, avail, roleSets);

  it("counts a labeled card by its label and an unlabeled card by the classifier", () => {
    expect(rollupFor(rollup, { oracleId: "x", colorIdentity: ["W", "U", "B", "R", "G"] }).roleCounts)
      .toEqual({ ramp: 2, draw: 0, removal: 1, wipes: 1 }); // c: no label, ramp by text
  });

  it("agrees with scoreCommander on the same sets, for every commander", () => {
    for (const commander of commanders) {
      const scored = scoreCommander({
        commander: card({ oracleId: commander.oracleId, colorIdentity: commander.colorIdentity }),
        collection,
        roleTargets: { ramp: 1, draw: 1, removal: 1, wipes: 1 },
        roleSets,
        support: null,
        inclusionByName: null,
      });
      expect(rollupFor(rollup, commander).roleCounts).toEqual(scored.roleCounts);
    }
  });

  it("is the classifier's count without sets", () => {
    const plain = rollupFor(buildPoolRollup(collection, avail), { oracleId: "x", colorIdentity: ["W", "U", "B", "R", "G"] });
    expect(plain.roleCounts).toEqual({ ramp: 1, draw: 1, removal: 1, wipes: 1 });
  });
});
