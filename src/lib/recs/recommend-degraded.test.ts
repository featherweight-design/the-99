// The banner's flag, and the one rule that decides it.
//
// `recommendCommanders` returns a result-wide `degraded`, and `loadScores`
// derives the same idea from persisted rows (`store.ts:243` — rows whose
// `synergyState` is "degraded"). Those two must agree, because the cold response
// and the warm one describe the same list to the same reader.
//
// Before Ruling D the flag was set on any unreachable live fetch, which was
// right while an outage cost a commander its synergy. It no longer does: the
// figure comes from the stored index. A cold load during an outage would have
// raised the banner — "receipts are hidden, this score is out of 40" — over rows
// that scored out of 100 and carry receipts, and the banner would then have
// vanished once the set persisted.
import { beforeEach, describe, expect, it, vi } from "vitest";

const pool = vi.hoisted(() => ({ collection: [] as unknown[] }));
vi.mock("../../db", () => ({
  db: {
    selectDistinctOn: () => ({
      from: () => ({
        innerJoin: () => ({ where: () => ({ orderBy: () => Promise.resolve(pool.collection) }) }),
      }),
    }),
  },
}));

vi.mock("../decks/built", async (orig) => ({ ...(await orig<object>()), loadBuiltCommanderIds: async () => [] }));

const live = vi.hoisted(() => ({ unreachable: false }));
vi.mock("../edhrec/client", () => ({
  readEdhrecCache: async () => new Map(),
  resolveEdhrecData: async () => ({
    data: live.unreachable ? null : { topCards: ["Sol Ring"], inclusionByName: {} },
    unreachable: live.unreachable,
  }),
}));

const support = vi.hoisted(() => ({
  lists: new Map<string, { total: number | null; oracleIds: string[] }>(),
}));
// The role-target read is its own module and not what these tests are about: every commander
// answers the flat targets, as one with nothing measured does.
// Flat by default. `measured` switches every commander to targets of 0, which meet every role,
// so a case can see the loaded figure reach the score rather than the flat constants.
const roleTargetMock = vi.hoisted(() => ({ measured: false }));
vi.mock("../profile/role-targets", async () => {
  const { ROLE_TARGETS } = await vi.importActual<typeof import("./roles")>("./roles");
  return {
    loadRoleTargetsForCommanders: async (cs: { oracleId: string }[]) =>
      new Map(cs.map((c) => [c.oracleId, roleTargetMock.measured
        ? { of: "commander", targets: { ramp: 0, draw: 0, removal: 0, wipes: 0 } }
        : { of: "flat", targets: { ...ROLE_TARGETS } }])),
  };
});
vi.mock("../edhrec/support-read", () => ({ loadSupportLists: async () => support.lists }));

const { recommendCommanders } = await import("./recommend");

const commander = {
  oracleId: "cmd",
  name: "Commander",
  typeLine: "Legendary Creature — Human",
  oracleText: "",
  keywords: [],
  colorIdentity: ["W"],
  imageUri: null,
  artCropUri: null,
  manaCost: null,
  commanderLegal: true,
};
const sol = {
  ...commander,
  oracleId: "sol",
  name: "Sol Ring",
  typeLine: "Artifact",
  oracleText: "{T}: Add {C}{C}.",
  colorIdentity: [],
};

beforeEach(() => {
  pool.collection = [commander, sol];
  live.unreachable = false;
  support.lists = new Map();
});

describe("recommendCommanders — the degraded flag", () => {
  // The case that made the old rule wrong. An outage, and an index that has the
  // commander: the score is whole, so nothing is degraded.
  it("is false during an outage when the index supplied the figure", async () => {
    live.unreachable = true;
    support.lists = new Map([["cmd", { total: 4, oracleIds: ["sol"] }]]);

    const { results, degraded } = await recommendCommanders("u1");
    expect(results).toHaveLength(1);
    expect(results[0].fitSynergy).not.toBeNull();
    expect(results[0].synergyState).toBe("ok");
    expect(degraded).toBe(false);
  });

  // An outage AND no index row: now there really is nothing to score with, the
  // row says so, and the banner agrees.
  it("is true during an outage when the index had no figure either", async () => {
    live.unreachable = true;
    const { results, degraded } = await recommendCommanders("u2");
    expect(results[0].fitSynergy).toBeNull();
    expect(results[0].synergyState).toBe("degraded");
    expect(degraded).toBe(true);
  });

  // No index row and a healthy live read is a settled absence, not an outage.
  it("is false when there is no figure and the live read was healthy", async () => {
    const { results, degraded } = await recommendCommanders("u3");
    expect(results[0].synergyState).toBe("absent");
    expect(degraded).toBe(false);
  });

  // The property the two paths need: the flag is exactly "some row is
  // degraded", which is the rule `loadScores` applies to persisted rows.
  it("equals whether any row is degraded, which is loadScores' own rule", async () => {
    for (const unreachable of [false, true]) {
      for (const indexed of [false, true]) {
        live.unreachable = unreachable;
        support.lists = indexed
          ? new Map([["cmd", { total: 4, oracleIds: ["sol"] }]])
          : new Map();
        const { results, degraded } = await recommendCommanders("u4");
        expect(degraded).toBe(results.some((r) => r.synergyState === "degraded"));
      }
    }
  });
});

// The owned list's half of How it works §5.4a: every ranked row grades its roles against the
// targets loaded for it, never the flat constants.
describe("recommendCommanders — the role targets", () => {
  it("scores each commander against the targets the reader loaded", async () => {
    const flat = await recommendCommanders("u-targets-flat");
    roleTargetMock.measured = true;
    try {
      const measured = await recommendCommanders("u-targets-measured");
      expect(measured.results[0].fitRoles).toBeGreaterThan(flat.results[0].fitRoles);
    } finally {
      roleTargetMock.measured = false;
    }
  });
});
