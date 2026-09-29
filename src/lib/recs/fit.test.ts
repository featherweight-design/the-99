import { describe, expect, it } from "vitest";

import { computeFit, POOL_FULL_AT, POOL_WEIGHT, ROLES_WEIGHT, SYNERGY_WEIGHT } from "./score";
import { ROLE_TARGETS } from "./roles";

// THE TWO CONTRACTS THIS FUNCTION DOCUMENTS ARE UNREACHABLE FROM ITS OTHER
// CALLERS' TESTS, which is why they are exercised here against the function
// itself. Found by the pre-open review.
//
// `scoreCommander` filters a non-positive total to null before calling, so
// `score.test.ts` can never reach the no-reading branch. `assembleDiscovery`
// DOES call `computeFit` directly (`discovery/list.ts`) and passes
// `edhrecTotal` through unfiltered — so that path can reach it, but its tests
// assert the assembled row rather than the arithmetic, and neither the overfull
// ratio nor a negative total is among their fixtures.
//
// An earlier version of this comment said `computeFit` is only reached through
// `scoreCommander`, which was false and named by review — the direct call is one
// I added in the same PR.

const full = Object.fromEntries(
  Object.entries(ROLE_TARGETS).map(([role, target]) => [role, target]),
) as Record<keyof typeof ROLE_TARGETS, number>;
const noRoles = Object.fromEntries(
  Object.keys(ROLE_TARGETS).map((role) => [role, 0]),
) as Record<keyof typeof ROLE_TARGETS, number>;

describe("computeFit · a non-positive total is NO READING, not a zero ratio", () => {
  // The distinction is invisible in `score` — both give synergy no points — and
  // decides `measurableTotal`, so an empty support list is scored out of 40
  // rather than told it managed 0 of 60.
  it.each([null, 0, -1])("scores out of 40 when the total is %s", (edhrecTotal) => {
    const fit = computeFit({ roleTargets: ROLE_TARGETS, poolSize: 0, roleCounts: noRoles, ownedSupport: 0, edhrecTotal });

    expect(fit.fitSynergy).toBeNull();
    expect(fit.measurableTotal).toBe(100 - SYNERGY_WEIGHT);
  });

  // A POSITIVE total with no overlap is the case that must NOT collapse into the
  // above: the reading exists and is zero, so the denominator stays 100.
  it("scores out of 100 when the total is positive and the overlap is empty", () => {
    const fit = computeFit({ roleTargets: ROLE_TARGETS, poolSize: 0, roleCounts: noRoles, ownedSupport: 0, edhrecTotal: 400 });

    expect(fit.fitSynergy).toBe(0);
    expect(fit.measurableTotal).toBe(100);
  });

  // AN UNTRACKED COMMANDER TOPS OUT AT 40 AND DOES NOT TAKE THE TOP OF THE LIST.
  //
  // This case used to assert `rankScore` was 100 here, on the reasoning that the
  // rescale must not divide by zero. #702 removed the rescale outright while this
  // branch was in review: the weights are 15 + 25 + 60, so rescaling a 40 back to
  // 100 touched untracked commanders alone and multiplied them by 2.5, and one
  // nobody has written a page about took rank 1 with a perfect 40/40 beside a
  // note reading "fit comes from pool and roles alone".
  //
  // So the property is no longer about finiteness — there is no division left —
  // and asserting 100 would now assert the defect. It is the ORDER that matters:
  // the rank is the printed figure, and pool and roles alone are worth 40.
  it("ranks an unmeasurable commander on the figure it prints, not a rescale", () => {
    const fit = computeFit({ roleTargets: ROLE_TARGETS, poolSize: 400, roleCounts: full, ownedSupport: 9, edhrecTotal: null });

    expect(fit.score).toBe(POOL_WEIGHT + ROLES_WEIGHT);
    expect(fit.rankScore).toBe(fit.score);
  });

  // The mirror, so the case above is not passing on a constant: a tracked
  // commander scoring above 40 must out-rank it.
  it("lets a tracked commander above 40 out-rank an untracked one", () => {
    const untracked = computeFit({ roleTargets: ROLE_TARGETS,
      poolSize: 400, roleCounts: full, ownedSupport: 9, edhrecTotal: null,
    });
    const tracked = computeFit({ roleTargets: ROLE_TARGETS,
      poolSize: 400, roleCounts: full, ownedSupport: 50, edhrecTotal: 100,
    });

    expect(tracked.rankScore).toBeGreaterThan(untracked.rankScore);
  });
});

describe("computeFit · the ratio is deliberately unclamped", () => {
  // `edhrec_total` and the child-row count disagree by 1 on 2 of 3,342
  // commanders, so owning every support card can read over 60. Asserted as a
  // CONTRACT rather than tolerated: `scoreCommander` has the same exposure
  // through the same data, and clamping here alone would make the row and the
  // detail page differ on exactly those rows.
  // FULL POOL AND ROLES, because the two halves of this need different
  // fixtures and the first version conflated them: with an empty pool and no
  // roles the synergy component alone is 66, which is over its own 60 weight
  // and still under the 100 total, so `score > measurableTotal` failed on a
  // correct build. The component overflowing and the headline overflowing are
  // separate claims.
  it("lets an overfull overlap exceed the synergy weight, and the total with it", () => {
    const fit = computeFit({ roleTargets: ROLE_TARGETS,
      poolSize: POOL_FULL_AT, roleCounts: full, ownedSupport: 11, edhrecTotal: 10,
    });

    expect(fit.fitSynergy).toBeGreaterThan(SYNERGY_WEIGHT);
    expect(fit.score).toBeGreaterThan(fit.measurableTotal);
  });

  it("still sums its own parts when it does", () => {
    const fit = computeFit({ roleTargets: ROLE_TARGETS,
      poolSize: 400, roleCounts: full, ownedSupport: 11, edhrecTotal: 10,
    });

    expect(fit.score).toBe(fit.fitPool + fit.fitRoles + (fit.fitSynergy ?? 0));
  });
});

describe("computeFit · the pool factor", () => {
  // The extraction dropped a `collection.length ? … : 0` guard as a second
  // spelling of `0 / 200`. This pins the claim at the boundary it was about.
  it("is zero for an empty pool and caps at the full mark", () => {
    const empty = computeFit({ roleTargets: ROLE_TARGETS, poolSize: 0, roleCounts: noRoles, ownedSupport: 0, edhrecTotal: 1 });
    const over = computeFit({ roleTargets: ROLE_TARGETS,
      poolSize: POOL_FULL_AT * 3, roleCounts: noRoles, ownedSupport: 0, edhrecTotal: 1,
    });
    const at = computeFit({ roleTargets: ROLE_TARGETS,
      poolSize: POOL_FULL_AT, roleCounts: noRoles, ownedSupport: 0, edhrecTotal: 1,
    });

    expect(empty.fitPool).toBe(0);
    expect(over.fitPool).toBe(at.fitPool);
  });

  it("gives full role credit at the targets and none at zero", () => {
    const met = computeFit({ roleTargets: ROLE_TARGETS, poolSize: 0, roleCounts: full, ownedSupport: 0, edhrecTotal: 1 });
    const none = computeFit({ roleTargets: ROLE_TARGETS, poolSize: 0, roleCounts: noRoles, ownedSupport: 0, edhrecTotal: 1 });

    expect(met.fitRoles).toBe(ROLES_WEIGHT);
    expect(none.fitRoles).toBe(0);
  });
});

// Brief 2026-09-28 §5.4: the Roles part is graded against the targets the caller hands in,
// `pickRoleTargets`' answer, never the flat constants behind its back.
describe("computeFit · the Roles part reads the targets it is given", () => {
  const at = (roleCounts: Record<keyof typeof ROLE_TARGETS, number>, roleTargets: Record<keyof typeof ROLE_TARGETS, number>) =>
    computeFit({ roleTargets, poolSize: 0, roleCounts, ownedSupport: 0, edhrecTotal: null }).fitRoles;

  it("is full when every count meets its MEASURED target, though short of the flat ones", () => {
    const measured = { ramp: 6, draw: 5, removal: 4, wipes: 1 };
    expect(at(measured, measured)).toBe(ROLES_WEIGHT);
    expect(at(measured, ROLE_TARGETS)).toBeLessThan(ROLES_WEIGHT);
  });

  it("is short when a measured target sits ABOVE the flat one the counts meet", () => {
    expect(at(full, { ...ROLE_TARGETS, ramp: ROLE_TARGETS.ramp * 2 })).toBeLessThan(ROLES_WEIGHT);
  });

  // A mean is fractional and whole cards meet it the way the fill builds: 8.4 is met at 8.
  it("rounds a measured mean the way the fill rounds its floors", () => {
    const counts = { ramp: 8, draw: 8, removal: 8, wipes: 3 };
    expect(at(counts, { ramp: 8.4, draw: 8.4, removal: 8.4, wipes: 3.4 })).toBe(ROLES_WEIGHT);
    expect(at(counts, { ramp: 8.6, draw: 8, removal: 8, wipes: 3 })).toBeLessThan(ROLES_WEIGHT);
  });

  // A role whose decks average under half a card asks for nothing. Dividing by the rounded 0
  // would make the whole score NaN, which sorts nowhere and prints as nothing.
  it("counts a target that rounds to 0 as met rather than dividing by it", () => {
    const fit = computeFit({ roleTargets: { ...ROLE_TARGETS, wipes: 0.3 }, poolSize: 0, roleCounts: { ...full, wipes: 0 }, ownedSupport: 0, edhrecTotal: null });
    expect(Number.isFinite(fit.score)).toBe(true);
    expect(fit.fitRoles).toBe(ROLES_WEIGHT);
  });
});
