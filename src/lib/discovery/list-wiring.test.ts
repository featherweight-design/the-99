// `assembleDiscovery` is covered in list.test.ts. This file covers the two
// exported async entry points, because their behaviour is all branching and
// none of it is visible from the assembly: which pool the candidate query is
// asked against, what a failed availability read leaves behind, and which
// collection size the subtitle reads.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ENV_VIEW } from "@/test/env-view";
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
const roleTargetMock = vi.hoisted(() => ({ measured: false, basisSeen: [] as string[] }));
vi.mock("../profile/role-targets", async () => {
  const { ROLE_TARGETS } = await vi.importActual<typeof import("../recs/roles")>("../recs/roles");
  return {
    loadRoleTargetsForCommanders: async (cs: { oracleId: string }[], basis?: string) =>
      (roleTargetMock.basisSeen.push(basis ?? "classifier"), new Map(cs.map((c) => [c.oracleId, roleTargetMock.measured
        ? { of: "commander", targets: { ramp: 0, draw: 0, removal: 0, wipes: 0 } }
        : { of: "flat", targets: { ...ROLE_TARGETS } }]))),
  };
});
// The label read, answered here (PR 7): which basis and sets the loader forwards is under test.
const basisMock = vi.hoisted(() => ({
  value: { basis: "classifier", roleSets: undefined, fellBack: false } as {
    basis: string; roleSets: Map<string, string[]> | undefined; fellBack: boolean;
  },
  enabledSeen: [] as boolean[],
}));
vi.mock("../recs/pool-role-basis", () => ({
  loadSharedPoolRoleBasis: async (_user: unknown, _cards: unknown, enabled: boolean) => (basisMock.enabledSeen.push(enabled), basisMock.value),
}));
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

const { loadDiscovery, loadDiscoveryPool, loadDiscoveryWithIds } = await import("./list");

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
    await loadDiscovery("user-1", { sort: "fit" }, ENV_VIEW);
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
    expect((await loadDiscovery("user-1", { sort: "fit" }, ENV_VIEW)).availOk).toBe(true);

    availabilityThrows = true;
    const got = await loadDiscovery("user-1", { sort: "fit" }, ENV_VIEW);
    expect(got.availOk).toBe(false);
    // The ranking survives a failed read: only the receipt was ever at stake.
    expect(got.items).toHaveLength(1);
  });

  // The fit score reads the commander's loaded targets, not the flat constants. Swapping the
  // loaded map for anything else passes the pure assembly test, which injects its own.
  it("scores against the targets the reader loaded", async () => {
    const flat = await loadDiscovery("user-1", { sort: "fit" }, ENV_VIEW);
    roleTargetMock.measured = true;
    try {
      const measured = await loadDiscovery("user-1", { sort: "fit" }, ENV_VIEW);
      expect(measured.items.length).toBeGreaterThan(0);
      const roles = (l: typeof flat) => l.items.map((i) => i.fitRoles).reduce((a, b) => a + b, 0);
      expect(roles(measured)).toBeGreaterThan(roles(flat));
    } finally {
      roleTargetMock.measured = false;
    }
  });

  // PR 7. The basis must reach the target read, and the SAME sets must reach the rollup: removing
  // either forwarding leaves every pure test green. Korvold's pool holds only sol-ring (the
  // other card is white); by text it is no role, and the label below calls it ramp.
  it("forwards the label basis to the targets and the label sets to the rollup", async () => {
    roleTargetMock.basisSeen.length = 0;
    const roles = (l: { items: { fitRoles: number }[] }) => l.items.reduce((a, i) => a + i.fitRoles, 0);
    const byText = await loadDiscovery("user-1", { sort: "fit" }, ENV_VIEW);
    expect(roleTargetMock.basisSeen).toEqual(["classifier"]);

    roleTargetMock.basisSeen.length = 0;
    basisMock.value = { basis: "labels", roleSets: new Map([["sol-ring", ["ramp"]]]), fellBack: false };
    try {
      const byLabel = await loadDiscovery("user-1", { sort: "fit" }, ENV_VIEW);
      expect(roleTargetMock.basisSeen).toEqual(["labels"]);
      expect(roles(byLabel)).toBeGreaterThan(roles(byText));
      // And an UNLABELLED card counts toward no role: an empty map scores below the labelled one.
      basisMock.value = { basis: "labels", roleSets: new Map(), fellBack: false };
      expect(roles(await loadDiscovery("user-1", { sort: "fit" }, ENV_VIEW))).toBeLessThan(roles(byLabel));
    } finally {
      basisMock.value = { basis: "classifier", roleSets: undefined, fellBack: false };
    }
  });

  // Admin PR 6d-2: the switch is decided from the env the reader resolved, never the environment
  // alone. The environment has it off and the resolved env on, so a loader reading `process.env`
  // asks for the classifier and one reading its env asks for the labels.
  it("asks for the label read by the reader's resolved env, not the environment", async () => {
    vi.stubEnv("LABEL_ROLE_COUNTS_ENABLED", "false");
    try {
      basisMock.enabledSeen.length = 0;
      await loadDiscovery("user-1", { sort: "fit" }, { LABEL_ROLE_COUNTS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv);
      expect(basisMock.enabledSeen).toEqual([true]);
      basisMock.enabledSeen.length = 0;
      await loadDiscovery("user-1", { sort: "fit" }, { LABEL_ROLE_COUNTS_ENABLED: "false" } as unknown as NodeJS.ProcessEnv);
      expect(basisMock.enabledSeen).toEqual([false]);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  // Admin PR 6d-2 (Copilot round 5): the list reports the basis it was COUNTED by, which is not the
  // requested one when the label read failed. The page hands the view this basis, and the payload
  // refuses to file a fallback under the labels key.
  it("reports the basis the list was counted by, and a fallback as one", async () => {
    const on = { LABEL_ROLE_COUNTS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
    try {
      basisMock.value = { basis: "classifier", roleSets: undefined, fellBack: true };
      const fell = await loadDiscoveryWithIds("user-1", { sort: "fit" }, on);
      expect([fell.basis, fell.fellBack]).toEqual(["classifier", true]);
      basisMock.value = { basis: "labels", roleSets: new Map(), fellBack: false };
      const read = await loadDiscoveryWithIds("user-1", { sort: "fit" }, on);
      expect([read.basis, read.fellBack]).toEqual(["labels", false]);
    } finally {
      basisMock.value = { basis: "classifier", roleSets: undefined, fellBack: false };
    }
  });

  it("reads the subtitle's collection size off the whole collection", async () => {
    availability = new Map([["sol-ring", committed]]);
    const got = await loadDiscovery("user-1", { sort: "fit" }, ENV_VIEW);
    // "read against N cards" names the collection, and building a deck out of a
    // card does not make the player own fewer of them.
    expect(got.cardsRead).toBe(2);
  });

  // Admin PR 6f-1: the claim model decides NEVER_CUT_ENABLED and CHANGE_COMMANDER_ENABLED from the env it
  // is handed, and the pool requires its env: the list must hand it the reader's.
  // The environment says the opposite; identity is checked as a boolean.
  it("runs the availability read under the reader's resolved switches, not the environment", async () => {
    vi.stubEnv("NEVER_CUT_ENABLED", "false");
    vi.stubEnv("CHANGE_COMMANDER_ENABLED", "false");
    const READER = { NEVER_CUT_ENABLED: "true", CHANGE_COMMANDER_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
    try {
      loadAvailability.mockClear();
      await loadDiscoveryWithIds("user-1", { sort: "fit" }, READER);
      expect(loadAvailability).toHaveBeenCalledTimes(1);
      const [, opts] = loadAvailability.mock.calls[0] as unknown as [string, { env?: unknown }];
      expect(opts.env === READER).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("scopes the availability read to the collection it will score", async () => {
    await loadDiscoveryPool("user-1", ENV_VIEW);
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

    const list = await loadDiscovery("user_1", { sort: "fit" }, ENV_VIEW);

    expect(list.priceOk).toBe(false);
  });

  it("carries a healthy one, so the field is not a constant", async () => {
    const list = await loadDiscovery("user_1", { sort: "fit" }, ENV_VIEW);

    expect(list.priceOk).toBe(true);
  });
});
