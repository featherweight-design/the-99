// The compute scores EVERY commander candidate, built ones included, because its
// result is what `persistScores` writes and that write deletes every row it does
// not name. The "already built" exclusion is the read's alone — see
// `ranked-list.test.ts`, which pins the other half of the same rule.
//
// Filtering here as well is what shipped, and it evicted a commander from
// `commander_scores` the moment a deck was built around it: a warm store
// short-circuits the recompute, so deleting that deck never brought it back.
import { describe, expect, it, vi } from "vitest";
import { ENV_VIEW } from "@/test/env-view";

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
    // Any deck read this function might make. It should make none.
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

// Ruling D: the score's synergy comes from the stored index. Mocked at the
// loader rather than through the `db` chain above, which ends at `.where` and
// would have to grow an `.orderBy` — and the ordering is this module's own
// concern, covered in `support-overlap.test.ts`. An empty map is no synergy
// reading, which is what these cases already assumed from a null live payload.
vi.mock("../edhrec/support-read", () => ({
  loadSupportLists: vi.fn(async () => new Map()),
}));

const { recommendCommanders } = await import("./recommend");

describe("recommendCommanders — what the persisted store is written from", () => {
  it("scores every candidate when the user has no decks", async () => {
    builtCommanderIds.length = 0;
    const { results } = await recommendCommanders("user-1", ENV_VIEW);
    expect(results.map((r) => r.oracleId).sort()).toEqual(["atraxa", "korvold"]);
  });

  it("keeps a commander the user has already built a deck around", async () => {
    builtCommanderIds.length = 0;
    builtCommanderIds.push("korvold");
    const { results, candidateCount } = await recommendCommanders("user-1", ENV_VIEW);
    expect(results.map((r) => r.oracleId).sort()).toEqual(["atraxa", "korvold"]);
    // The figure the page prints is `getRankedList`'s, counted after the read's
    // exclusion. This one counts what was scored, which is what the store holds.
    expect(candidateCount).toBe(2);
  });
});
