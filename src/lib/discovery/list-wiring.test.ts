// `assembleDiscovery` is covered in list.test.ts. This file covers the two
// exported async entry points, because their behaviour is all branching and
// none of it is visible from the assembly: which pool the candidate query is
// asked against, what a failed availability read leaves behind, and which
// collection size the subtitle reads.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Availability } from "../decks/availability";

const collection = [
  { oracleId: "sol-ring", colorIdentity: [] as string[] },
  { oracleId: "swords", colorIdentity: ["W"] },
].map((c) => ({
  ...c,
  name: c.oracleId,
  typeLine: "Artifact",
  oracleText: null,
  keywords: [] as string[],
  commanderLegal: false,
  imageUri: null,
  manaCost: "{1}",
}));

let availability: Map<string, Availability>;
let availabilityThrows = false;
const loadAvailability = vi.fn(async () => {
  if (availabilityThrows) throw new Error("deck read failed");
  return availability;
});
const loadCandidates = vi.fn(async () => [
  {
    oracleId: "korvold",
    name: "Korvold, Fae-Cursed King",
    colorIdentity: ["B", "R", "G"],
    imageUri: null,
    edhrecTotal: 100,
    tags: [],
    ownedSupport: 50,
  },
]);

vi.mock("../recs/recommend", () => ({
  loadCollectionPool: async () => ({ collection }),
}));
vi.mock("../decks/availability-query", () => ({
  loadAvailability: (...args: unknown[]) =>
    (loadAvailability as unknown as (...a: unknown[]) => unknown)(...args),
}));
vi.mock("./candidates", () => ({
  loadCandidates: (...args: unknown[]) =>
    (loadCandidates as unknown as (...a: unknown[]) => unknown)(...args),
}));
vi.mock("./price", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./price")>()),
  loadPrices: async () => new Map(),
}));
vi.mock("./novelty", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./novelty")>()),
  loadPlayedTags: async () => [],
}));

const { loadDiscovery, loadDiscoveryPool } = await import("./list");

/** One copy owned, claimed by a finished deck — nothing left free. */
const committed: Availability = { owned: 1, hard: 1, soft: 0, free: 0, hardDecks: [] };

describe("loadDiscovery — wiring", () => {
  beforeEach(() => {
    availability = new Map();
    availabilityThrows = false;
    loadAvailability.mockClear();
    loadCandidates.mockClear();
  });

  it("asks the candidate query for the free pool under avail: free", async () => {
    availability = new Map([["sol-ring", committed]]);
    await loadDiscovery("user-1", { sort: "fit", avail: "free" });
    const [, oracleIds] = loadCandidates.mock.calls[0] as unknown as [string, string[]];
    // The free ranking is the same question asked of a smaller pool, so the
    // committed card is not in the pool the candidates are scored against.
    expect(oracleIds).toEqual(["swords"]);
  });

  it("asks it for the whole collection under avail: all", async () => {
    availability = new Map([["sol-ring", committed]]);
    await loadDiscovery("user-1", { sort: "fit", avail: "all" });
    const [, oracleIds] = loadCandidates.mock.calls[0] as unknown as [string, string[]];
    expect(oracleIds).toEqual(["sol-ring", "swords"]);
  });

  // `freePool` keeps every id the map is missing, so a failed read returns the
  // whole collection while looking like a free pool. Without this flag the two
  // are indistinguishable downstream.
  it("reports availOk: false when the availability read fails", async () => {
    availabilityThrows = true;
    const got = await loadDiscovery("user-1", { sort: "fit", avail: "free" });
    expect(got.availOk).toBe(false);
    // The ranking survives — only the receipt counts are lost, and they are lost
    // as unknown rather than as zeros.
    expect(got.items).toHaveLength(1);
    expect(got.items[0].counts).toBeNull();
  });

  it("carries the receipt counts when the read succeeds", async () => {
    const got = await loadDiscovery("user-1", { sort: "fit", avail: "all" });
    expect(got.availOk).toBe(true);
    expect(got.items[0].counts).toEqual({ inUse: 0, wantedByBrew: 0 });
  });

  it("reads the subtitle's collection size off the whole collection, not the pool", async () => {
    availability = new Map([["sol-ring", committed]]);
    const got = await loadDiscovery("user-1", { sort: "fit", avail: "free" });
    // "read against N cards" names the collection. Scoping it to the free pool
    // would make the number move when a deck is built.
    expect(got.cardsRead).toBe(2);
  });

  it("scopes the availability read to the collection it will score", async () => {
    await loadDiscoveryPool("user-1", "free");
    const [userArg, opts] = loadAvailability.mock.calls[0] as unknown as [
      string,
      { oracleIds: string[] },
    ];
    expect(userArg).toBe("user-1");
    expect([...opts.oracleIds].sort()).toEqual(["sol-ring", "swords"]);
  });
});
