// `assembleDiscovery` is covered in list.test.ts. This file covers the two
// exported async entry points, because their behaviour is all branching and
// none of it is visible from the assembly: which pool the candidate query is
// asked against, what a failed availability read leaves behind, and which
// collection size the subtitle reads.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
// The role-target read is its own module and not what these tests are about: every commander
// answers the flat targets, as one with nothing measured does.
// Flat by default. `measured` switches every commander to targets of 0, which meet every role,
// so a case can see the loaded figure reach the score rather than the flat constants.
const roleTargetMock = vi.hoisted(() => ({ measured: false }));
vi.mock("../profile/role-targets", async () => {
  const { ROLE_TARGETS } = await vi.importActual<typeof import("../recs/roles")>("../recs/roles");
  return {
    loadRoleTargetsForCommanders: async (cs: { oracleId: string }[]) =>
      new Map(cs.map((c) => [c.oracleId, roleTargetMock.measured
        ? { of: "commander", targets: { ramp: 0, draw: 0, removal: 0, wipes: 0 } }
        : { of: "flat", targets: { ...ROLE_TARGETS } }])),
  };
});
vi.mock("./candidates", () => ({
  loadCandidates: (...args: unknown[]) =>
    (loadCandidates as unknown as (...a: unknown[]) => unknown)(...args),
}));
// `readPrices`, NOT `loadPrices`. The route calls the wrapper, and the
// wrapper closes over `loadPrices` inside its own module scope — so overriding
// that export left the real database-backed read in place, and the wrapper's
// catch then swallowed the failure into an empty map. The test passed while
// reaching for a database and unable to control what prices came back. Named by
// review, on the same PR that introduced the wrapper.
// Mutable, so one case can fail the read. `readPrices`, NOT `loadPrices`: the
// route calls the wrapper, and the wrapper closes over `loadPrices` inside its
// own module scope — so overriding that export left the real database-backed
// read in place, and the wrapper then swallowed the failure into an empty map.
// The test passed while reaching for a database and unable to control what came
// back. Named by review, on the PR that introduced the wrapper.
let priceRead = { prices: new Map(), ok: true };
vi.mock("./price", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./price")>()),
  readPrices: async () => priceRead,
}));
vi.mock("./novelty", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./novelty")>()),
  loadPlayedTags: async () => [],
}));

const { loadDiscovery, loadDiscoveryPool } = await import("./list");

/** One copy owned, claimed by a committed deck — nothing left free. */
const committed: Availability = { owned: 1, hard: 1, soft: 0, free: 0, claims: [] };

describe("loadDiscovery — wiring", () => {
  beforeEach(() => {
    availability = new Map();
    availabilityThrows = false;
    loadAvailability.mockClear();
    loadCandidates.mockClear();
  });

  // Was two tests, one per `avail`. The lane has no availability control, so
  // there is one pool to pin: a committed card still scores, and no second
  // oracle-id set is passed because there is no wider collection to compare to.
  it("asks the candidate query for the whole collection, committed cards and all", async () => {
    availability = new Map([["sol-ring", committed]]);
    await loadDiscovery("user-1", { sort: "fit" });
    const [, oracleIds, collectionOracleIds] = loadCandidates.mock.calls[0] as unknown as [
      string,
      string[],
      string[] | undefined,
    ];
    expect(oracleIds).toEqual(["sol-ring", "swords"]);
    expect(collectionOracleIds).toBeUndefined();
  });

  // An empty availability map counts every owned card as uncommitted, which is a
  // claim nothing can make on a failed read. The list carries no per-item receipt
  // counts, so this flag is the only thing that tells the two reads apart.
  it("reports the availability read's outcome either way", async () => {
    expect((await loadDiscovery("user-1", { sort: "fit" })).availOk).toBe(true);

    availabilityThrows = true;
    const got = await loadDiscovery("user-1", { sort: "fit" });
    expect(got.availOk).toBe(false);
    // The ranking survives a failed read: only the receipt was ever at stake.
    expect(got.items).toHaveLength(1);
  });

  // The fit score reads the commander's loaded targets, not the flat constants. Swapping the
  // loaded map for anything else passes the pure assembly test, which injects its own.
  it("scores against the targets the reader loaded", async () => {
    const flat = await loadDiscovery("user-1", { sort: "fit" });
    roleTargetMock.measured = true;
    try {
      const measured = await loadDiscovery("user-1", { sort: "fit" });
      expect(measured.items.length).toBeGreaterThan(0);
      const roles = (l: typeof flat) => l.items.map((i) => i.fitRoles).reduce((a, b) => a + b, 0);
      expect(roles(measured)).toBeGreaterThan(roles(flat));
    } finally {
      roleTargetMock.measured = false;
    }
  });

  it("reads the subtitle's collection size off the whole collection", async () => {
    availability = new Map([["sol-ring", committed]]);
    const got = await loadDiscovery("user-1", { sort: "fit" });
    // "read against N cards" names the collection, and building a deck out of a
    // card does not make the player own fewer of them.
    expect(got.cardsRead).toBe(2);
  });

  it("scopes the availability read to the collection it will score", async () => {
    await loadDiscoveryPool("user-1");
    const [userArg, opts] = loadAvailability.mock.calls[0] as unknown as [
      string,
      { oracleIds: string[] },
    ];
    expect(userArg).toBe("user-1");
    expect([...opts.oracleIds].sort()).toEqual(["sol-ring", "swords"]);
  });
});

// THE FLAG HAS TO SURVIVE THE LOADER, not just the assembly. The assembly tests
// assert whatever `priceOk` their fixture supplies, so a regression that dropped
// `priceRead.ok` on the way through `loadDiscovery` would leave both green while
// the cached payload lost the one signal distinguishing a failed read from a
// genuinely unstocked printing.
describe("loadDiscovery · the price read's status", () => {
  afterEach(() => { priceRead = { prices: new Map(), ok: true }; });

  it("carries a failed price read through to the payload", async () => {
    priceRead = { prices: new Map(), ok: false };

    const list = await loadDiscovery("user_1", { sort: "fit" });

    expect(list.priceOk).toBe(false);
  });

  it("carries a healthy one, so the field is not a constant", async () => {
    const list = await loadDiscovery("user_1", { sort: "fit" });

    expect(list.priceOk).toBe(true);
  });
});
