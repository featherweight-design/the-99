// A commander the user has already built shouldn't be offered as something to
// build. The bug was a missing join, so the property worth pinning is the
// wiring — recommendCommanders reading the decks table at all — which a test of
// the filter in isolation would not have caught.
import { describe, expect, it, vi } from "vitest";

const pool = [
  { oracleId: "korvold", name: "Korvold, Fae-Cursed King" },
  { oracleId: "atraxa", name: "Atraxa, Praetors' Voice" },
].map((c) => ({
  ...c,
  typeLine: "Legendary Creature — Dragon",
  oracleText: null,
  keywords: [],
  colorIdentity: ["B", "R", "G"],
  commanderLegal: true,
  imageUri: null,
  manaCost: "{2}{B}{R}{G}",
}));

const builtCommanderIds: string[] = [];

vi.mock("../../db", () => ({
  db: {
    // loadCollectionPool
    selectDistinctOn: () => ({
      from: () => ({
        innerJoin: () => ({ where: () => ({ orderBy: async () => pool }) }),
      }),
    }),
    // the decks lookup under test
    select: () => ({
      from: () => ({ where: async () => builtCommanderIds.map((oracleId) => ({ oracleId })) }),
    }),
  },
}));
vi.mock("../edhrec/client", () => ({
  getEdhrecData: vi.fn(),
  readEdhrecCache: vi.fn(async () => new Map()),
  resolveEdhrecData: vi.fn(async () => ({ data: null, unreachable: false })),
}));

const { recommendCommanders } = await import("./recommend");

describe("recommendCommanders — already-built commanders", () => {
  it("recommends every candidate when the user has no decks", async () => {
    builtCommanderIds.length = 0;
    const { results } = await recommendCommanders("user-1");
    expect(results.map((r) => r.oracleId).sort()).toEqual(["atraxa", "korvold"]);
  });

  it("drops a commander the user has already built a deck around", async () => {
    builtCommanderIds.length = 0;
    builtCommanderIds.push("korvold");
    const { results, candidateCount } = await recommendCommanders("user-1");
    expect(results.map((r) => r.oracleId)).toEqual(["atraxa"]);
    // The count under the list is "N candidates", so it has to shrink with the
    // list — otherwise the page claims a recommendation it isn't showing.
    expect(candidateCount).toBe(1);
  });
});
