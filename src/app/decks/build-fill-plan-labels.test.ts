import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// buildFillPlan's WIRING of the label basis (labels-everywhere PR 4): which skeleton basis it asks
// for, which label map reaches the plan, and the one invariant that matters, that a plan never
// counts by one basis and builds to the other's bars. The plan and every read are stubbed flat.
const m = vi.hoisted(() => ({
  loadSkeleton: vi.fn(),
  readLabels: vi.fn(),
  planFill: vi.fn(),
  loadFillGate: vi.fn(),
}));

vi.mock("../../db", () => ({ db: {} }));
vi.mock("../../lib/auth", () => ({ requireUserId: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn(), unstable_cache: (f: unknown) => f }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("../../lib/profile/load", async (importActual) => ({
  ...(await importActual<typeof import("../../lib/profile/load")>()),
  loadSkeletonForCommanders: m.loadSkeleton,
}));
vi.mock("../../lib/labels/read", async (importActual) => ({
  ...(await importActual<typeof import("../../lib/labels/read")>()),
  readLabelRoleSets: m.readLabels,
}));
vi.mock("../../lib/decks/suggestions-read", () => ({
  ownedColorLegalPool: vi.fn(async () => [
    { oracleId: "pool-1", name: "Rock", typeLine: "Artifact", oracleText: "{T}: Add {C}.", keywords: [], manaCost: null, layout: "normal", ownedQuantity: 1 },
  ]),
  unownedTopCards: vi.fn(async () => []),
}));
vi.mock("../../lib/edhrec/client", () => ({ getEdhrecData: vi.fn(async () => ({ data: null })) }));
vi.mock("../../lib/staples/fill-staples", () => ({ gatherFillStaples: vi.fn(async () => []) }));
vi.mock("../../lib/decks/catalog-basics", () => ({ loadCatalogBasics: vi.fn(async () => []) }));
vi.mock("../commanders/[slug]/synergy-read", () => ({ readSynergyCards: vi.fn(async () => []) }));
vi.mock("../../lib/intake/fill-facts", () => ({ loadFillGate: m.loadFillGate }));
vi.mock("../../lib/decks/fill", async (importActual) => ({
  ...(await importActual<typeof import("../../lib/decks/fill")>()),
  planFill: m.planFill,
}));

import { buildFillPlan } from "../../lib/decks/fill-plan";

const commanders = [{ oracleId: "cmd", name: "C", colorIdentity: ["G"], manaCost: "{G}" }];
const skeleton = (of: string) => ({ roleTargets: { of, targets: {} }, composition: null, staples: [] });
const call = () => buildFillPlan("u", commanders, new Set(), { selected: [], env: process.env });
const labels = new Map([["pool-1", ["draw"]]]);

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  m.planFill.mockReturnValue({ rows: [] });
  m.loadSkeleton.mockImplementation(async (_c, _p, _i, _pre, opts) => ({ skeleton: skeleton(opts?.roleBasis ?? "classifier") }));
  m.readLabels.mockResolvedValue(labels);
});

const planArgs = () => m.planFill.mock.calls[0][1];
const basisOf = (callIndex: number) => m.loadSkeleton.mock.calls[callIndex][4]?.roleBasis ?? "classifier";

describe("buildFillPlan by label", () => {
  it("with the switch off reads no labels and plans on the classifier", async () => {
    vi.stubEnv("LABEL_ROLE_COUNTS_ENABLED", "");
    await call();
    expect(m.readLabels).not.toHaveBeenCalled();
    expect(basisOf(0)).toBe("classifier");
    expect(planArgs().labelRoles).toBeUndefined();
  });

  it("with the switch on asks for the label targets and hands the plan the label sets", async () => {
    vi.stubEnv("LABEL_ROLE_COUNTS_ENABLED", "true");
    await call();
    expect(m.loadSkeleton).toHaveBeenCalledTimes(1);
    expect(basisOf(0)).toBe("labels");
    expect(planArgs().labelRoles).toBe(labels);
    expect(m.readLabels).toHaveBeenCalledWith(expect.arrayContaining(["pool-1"]));
  });

  it("falls to the classifier on BOTH sides when the label read rejects: the skeleton is reloaded, no labels reach the plan", async () => {
    vi.stubEnv("LABEL_ROLE_COUNTS_ENABLED", "true");
    m.readLabels.mockRejectedValue(new Error("down"));
    await call();
    expect(m.loadSkeleton).toHaveBeenCalledTimes(2);
    expect(basisOf(0)).toBe("labels");
    expect(basisOf(1)).toBe("classifier");
    expect(planArgs().skeleton.roleTargets.of).toBe("classifier");
    expect(planArgs().labelRoles).toBeUndefined();
  });

  it("reads no labels when the skeleton read throws: the plan builds to the asserted classifier bars", async () => {
    vi.stubEnv("LABEL_ROLE_COUNTS_ENABLED", "true");
    m.loadSkeleton.mockRejectedValue(new Error("no skeleton"));
    await call();
    expect(m.readLabels).not.toHaveBeenCalled();
    expect(planArgs().skeleton).toBeNull();
    expect(planArgs().labelRoles).toBeUndefined();
  });
});

// Admin PR 6f-1: the fill's budget gate asks the claim model which owned cards are free, and that model
// reads NEVER_CUT_ENABLED and CHANGE_COMMANDER_ENABLED from the env it is handed. `loadFillGate` takes the
// environment when none is passed, so the plan's env must reach it: the reader's env and the environment
// hold opposite values here, and the handed env is checked by identity, as a boolean.
describe("buildFillPlan's budget gate", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is handed the reader's resolved switches, not the environment", async () => {
    vi.stubEnv("NEVER_CUT_ENABLED", "false");
    vi.stubEnv("CHANGE_COMMANDER_ENABLED", "false");
    const READER = { NEVER_CUT_ENABLED: "true", CHANGE_COMMANDER_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
    await buildFillPlan("u", commanders, new Set(), {
      selected: [], env: READER, answers: { budgetCents: 5_000, bracket: null, cardOracleId: null },
    });
    expect(m.loadFillGate).toHaveBeenCalledTimes(1);
    expect(m.loadFillGate.mock.calls[0][0].env === READER).toBe(true);
  });
});
