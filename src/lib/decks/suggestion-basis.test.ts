import { beforeEach, describe, expect, it, vi } from "vitest";

// The shelves' basis (labels-everywhere PR 6): the label sets and the mix's targets must come back
// as ONE basis. The reads are stubbed; what is under test is which basis each one is asked for.
const m = vi.hoisted(() => ({ basis: vi.fn(), skeleton: vi.fn() }));
vi.mock("../../db", () => ({ db: {} }));
vi.mock("../recs/pool-role-basis", () => ({ loadPoolRoleBasis: m.basis }));
vi.mock("../profile/load", async (importActual) => ({
  ...(await importActual<typeof import("../profile/load")>()),
  loadSkeletonForCommanders: m.skeleton,
}));

import { resolveSuggestionBasis } from "./suggestions-read";
import { ENV_VIEW } from "@/test/env-view";

const commander = { oracleId: "c", colorIdentity: ["G"] };
const targets = (n: number) => ({ ramp: n, draw: n, removal: n, wipes: n });
const skeleton = (n: number) => ({
  skeleton: { composition: null, roleTargets: { of: "commander", targets: targets(n) }, staples: [], thinCondition: false, condition: "G", commanderDeckCount: 1 },
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("resolveSuggestionBasis", () => {
  it("asks the skeleton for the label targets and returns the label sets when the basis is labels", async () => {
    const roleSets = new Map([["a", ["ramp" as const]]]);
    m.basis.mockResolvedValue({ basis: "labels", roleSets, fellBack: false });
    m.skeleton.mockResolvedValue(skeleton(12));
    const got = await resolveSuggestionBasis(commander, null, false, [{ oracleId: "a" }], ENV_VIEW);
    expect(m.skeleton.mock.calls[0][4]).toEqual({ roleBasis: "labels" });
    expect(got.roleSets).toBe(roleSets);
    expect(got.mix.cells.ramp.target).toBe(12);
  });

  it("asks for the classifier targets and returns no sets when the label read fell back", async () => {
    m.basis.mockResolvedValue({ basis: "classifier", roleSets: undefined, fellBack: true });
    m.skeleton.mockResolvedValue(skeleton(9));
    const got = await resolveSuggestionBasis(commander, null, false, [], ENV_VIEW);
    expect(m.skeleton.mock.calls[0][4]).toEqual({ roleBasis: "classifier" });
    expect(got.roleSets).toBeUndefined();
  });

  it("falls to the flat targets OF THE BASIS when the skeleton read throws", async () => {
    m.basis.mockResolvedValue({ basis: "labels", roleSets: new Map(), fellBack: false });
    m.skeleton.mockRejectedValue(new Error("down"));
    const got = await resolveSuggestionBasis(commander, null, false, [], ENV_VIEW);
    // The label flat targets (12/8/6/1), not the classifier's 10/10/8/3.
    expect(got.mix.cells.ramp.target).toBe(12);
  });
});
