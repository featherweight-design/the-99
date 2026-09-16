import { describe, expect, it } from "vitest";

import { computeFit, POOL_FULL_AT, ROLES_WEIGHT, SYNERGY_WEIGHT } from "./score";
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
    const fit = computeFit({ poolSize: 0, roleCounts: noRoles, ownedSupport: 0, edhrecTotal });

    expect(fit.fitSynergy).toBeNull();
    expect(fit.measurableTotal).toBe(100 - SYNERGY_WEIGHT);
  });

  // A POSITIVE total with no overlap is the case that must NOT collapse into the
  // above: the reading exists and is zero, so the denominator stays 100.
  it("scores out of 100 when the total is positive and the overlap is empty", () => {
    const fit = computeFit({ poolSize: 0, roleCounts: noRoles, ownedSupport: 0, edhrecTotal: 400 });

    expect(fit.fitSynergy).toBe(0);
    expect(fit.measurableTotal).toBe(100);
  });

  // `rankScore` divides by `measurableTotal`, so the null branch must not reach
  // it as a 0 — that would be a division by zero printed as NaN.
  it("keeps rankScore finite on the unmeasurable branch", () => {
    const fit = computeFit({ poolSize: 400, roleCounts: full, ownedSupport: 9, edhrecTotal: null });

    expect(Number.isFinite(fit.rankScore)).toBe(true);
    expect(fit.rankScore).toBe(100);
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
    const fit = computeFit({
      poolSize: POOL_FULL_AT, roleCounts: full, ownedSupport: 11, edhrecTotal: 10,
    });

    expect(fit.fitSynergy).toBeGreaterThan(SYNERGY_WEIGHT);
    expect(fit.score).toBeGreaterThan(fit.measurableTotal);
  });

  it("still sums its own parts when it does", () => {
    const fit = computeFit({
      poolSize: 400, roleCounts: full, ownedSupport: 11, edhrecTotal: 10,
    });

    expect(fit.score).toBe(fit.fitPool + fit.fitRoles + (fit.fitSynergy ?? 0));
  });
});

describe("computeFit · the pool factor", () => {
  // The extraction dropped a `collection.length ? … : 0` guard as a second
  // spelling of `0 / 200`. This pins the claim at the boundary it was about.
  it("is zero for an empty pool and caps at the full mark", () => {
    const empty = computeFit({ poolSize: 0, roleCounts: noRoles, ownedSupport: 0, edhrecTotal: 1 });
    const over = computeFit({
      poolSize: POOL_FULL_AT * 3, roleCounts: noRoles, ownedSupport: 0, edhrecTotal: 1,
    });
    const at = computeFit({
      poolSize: POOL_FULL_AT, roleCounts: noRoles, ownedSupport: 0, edhrecTotal: 1,
    });

    expect(empty.fitPool).toBe(0);
    expect(over.fitPool).toBe(at.fitPool);
  });

  it("gives full role credit at the targets and none at zero", () => {
    const met = computeFit({ poolSize: 0, roleCounts: full, ownedSupport: 0, edhrecTotal: 1 });
    const none = computeFit({ poolSize: 0, roleCounts: noRoles, ownedSupport: 0, edhrecTotal: 1 });

    expect(met.fitRoles).toBe(ROLES_WEIGHT);
    expect(none.fitRoles).toBe(0);
  });
});
