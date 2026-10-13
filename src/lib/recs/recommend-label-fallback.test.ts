// A ranked list counted by the classifier only because the label read FAILED (switch on) is
// served and flagged, so neither writer persists it: `commander_scores` records no basis
// (labels-everywhere PR 5).
import { beforeEach, describe, expect, it, vi } from "vitest";

const pool = vi.hoisted(() => ({ collection: [] as unknown[], basis: { basis: "classifier", roleSets: undefined, fellBack: false } as unknown }));
vi.mock("../../db", () => ({
  db: {
    selectDistinctOn: () => ({
      from: () => ({ innerJoin: () => ({ where: () => ({ orderBy: () => Promise.resolve(pool.collection) }) }) }),
    }),
  },
}));
vi.mock("../decks/built", async (orig) => ({ ...(await orig<object>()), loadBuiltCommanderIds: async () => [] }));
vi.mock("../edhrec/client", () => ({
  readEdhrecCache: async () => new Map(),
  resolveEdhrecData: async () => ({ data: { topCards: [], inclusionByName: {} }, unreachable: false }),
}));
vi.mock("../edhrec/support-read", () => ({ loadSupportLists: async () => new Map() }));
vi.mock("../profile/role-targets", async () => {
  const { ROLE_TARGETS } = await vi.importActual<typeof import("./roles")>("./roles");
  return {
    loadRoleTargetsForCommanders: async (cs: { oracleId: string }[]) =>
      new Map(cs.map((c) => [c.oracleId, { of: "flat", targets: { ...ROLE_TARGETS } }])),
  };
});
vi.mock("./pool-role-basis", () => ({ loadPoolRoleBasis: async () => pool.basis }));

const { recommendCommanders } = await import("./recommend");

const commander = {
  oracleId: "cmd", name: "Commander", typeLine: "Legendary Creature — Human", oracleText: "", keywords: [],
  colorIdentity: ["W"], imageUri: null, artCropUri: null, manaCost: null, commanderLegal: true,
};

beforeEach(() => {
  pool.collection = [commander];
});

describe("recommendCommanders — the label fallback flag", () => {
  it("is set when the label read fell back to the classifier", async () => {
    pool.basis = { basis: "classifier", roleSets: undefined, fellBack: true };
    expect((await recommendCommanders("u1")).labelFallback).toBe(true);
  });

  it("is absent on a classifier list by configuration and on a label list", async () => {
    pool.basis = { basis: "classifier", roleSets: undefined, fellBack: false };
    expect((await recommendCommanders("u1")).labelFallback).toBeUndefined();
    pool.basis = { basis: "labels", roleSets: new Map(), fellBack: false };
    expect((await recommendCommanders("u1")).labelFallback).toBeUndefined();
  });
});
