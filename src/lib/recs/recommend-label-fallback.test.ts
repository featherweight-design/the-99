// A ranked list counted by the classifier only because the label read FAILED (switch on) is
// served and flagged, so neither writer persists it: `commander_scores` records no basis
// (labels-everywhere PR 5).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENV_VIEW } from "@/test/env-view";

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
vi.mock("./pool-role-basis", () => ({ loadSharedPoolRoleBasis: async () => pool.basis }));
vi.mock("../decks/committed", async (orig) => ({ ...(await orig<object>()), readCommittedDecks: async () => [] }));

const { recommendCommanders, scoreOneCommander } = await import("./recommend");

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
    expect((await recommendCommanders("u1", ENV_VIEW)).labelFallback).toBe(true);
  });

  it("is absent on a classifier list by configuration and on a label list", async () => {
    pool.basis = { basis: "classifier", roleSets: undefined, fellBack: false };
    expect((await recommendCommanders("u1", ENV_VIEW)).labelFallback).toBeUndefined();
    pool.basis = { basis: "labels", roleSets: new Map(), fellBack: false };
    expect((await recommendCommanders("u1", ENV_VIEW)).labelFallback).toBeUndefined();
  });
});

// Admin PR 6d-2 (Copilot round 5): the detail score says which basis it was COUNTED by, which the
// page hands its coverage retry. A labels request whose label read failed was counted by the
// classifier, and says so.
describe("scoreOneCommander — the basis it was counted by", () => {
  const on = { LABEL_ROLE_COUNTS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
  it("is the classifier when the label read fell back, and labels when it was read", async () => {
    pool.basis = { basis: "classifier", roleSets: undefined, fellBack: true };
    expect((await scoreOneCommander("u1", "cmd", "commander", undefined, on))?.roleBasis).toBe("classifier");
    pool.basis = { basis: "labels", roleSets: new Map(), fellBack: false };
    expect((await scoreOneCommander("u1", "cmd", "commander", undefined, on))?.roleBasis).toBe("labels");
  });
});
