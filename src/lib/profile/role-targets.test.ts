// `loadRoleTargetsForCommanders`: the ranked lists' batched read of the role chain (brief
// 2026-09-28 §5.4). The selection itself is `pickRoleTargets`, pinned in build.test.ts; what this
// pins is that the loader hands it EVERY rung it can reach for a single commander, from the right
// rows. A loader that dropped a rung (passed no identity bucket, or read the count bucket under
// the identity key) would grade a commander against flat targets its deck is never built to, and
// every figure it produced would still look plausible.
import { beforeEach, describe, expect, it, vi } from "vitest";

const rows = vi.hoisted(() => ({
  own: [] as Record<string, unknown>[],
  buckets: [] as Record<string, unknown>[],
}));

vi.mock("../../db", async () => {
  const schema = await vi.importActual<typeof import("../../db/schema")>("../../db/schema");
  return {
    db: {
      select: () => ({
        from: (table: unknown) => ({
          where: async () => (table === schema.commanderSupport ? rows.own : rows.buckets),
        }),
      }),
    },
  };
});

import { ROLE_TARGETS } from "../recs/roles";
import { countCondition, identityCondition } from "../staples/condition";
import { loadRoleTargetsForCommanders } from "./role-targets";

const measured = (n: number) => ({ avgRamp: n, avgDraw: n + 1, avgRemoval: n + 2, avgWipes: n + 3 });
const four = (n: number) => ({ ramp: n, draw: n + 1, removal: n + 2, wipes: n + 3 });

beforeEach(() => {
  rows.own = [];
  rows.buckets = [];
});

describe("loadRoleTargetsForCommanders", () => {
  const golgari = { oracleId: "g", colorIdentity: ["B", "G"] };

  it("takes the commander's own measured targets first", async () => {
    rows.own = [{ oracleId: "g", ...measured(9) }];
    rows.buckets = [{ condition: identityCondition(["B", "G"]), ...measured(5), withRoles: 40 }];
    const got = (await loadRoleTargetsForCommanders([golgari])).get("g");
    expect(got).toEqual({ of: "commander", targets: four(9) });
  });

  it("falls to the commander's exact identity bucket when it has none of its own", async () => {
    rows.buckets = [
      { condition: identityCondition(["B", "G"]), ...measured(5), withRoles: 40 },
      { condition: countCondition(2), ...measured(3), withRoles: 400 },
    ];
    const got = (await loadRoleTargetsForCommanders([golgari])).get("g");
    expect(got).toEqual({ of: "identity", targets: four(5) });
  });

  // `withRoles = 0` is the bucket derived before the role pass: four honest-looking zeroes that
  // are not a measurement, and the chain must fall through them rather than stop.
  it("falls to the colour-count bucket past an identity bucket carrying no roles", async () => {
    rows.buckets = [
      { condition: identityCondition(["B", "G"]), ...measured(0), withRoles: 0 },
      { condition: countCondition(2), ...measured(3), withRoles: 400 },
    ];
    const got = (await loadRoleTargetsForCommanders([golgari])).get("g");
    expect(got).toEqual({ of: "count", targets: four(3) });
  });

  it("answers the flat targets when nothing was measured", async () => {
    const got = (await loadRoleTargetsForCommanders([golgari])).get("g");
    expect(got).toEqual({ of: "flat", targets: { ...ROLE_TARGETS } });
  });

  // A NaN out of a bad cast is not a wrong target but no target: every `have < target` against
  // it is false. All-or-nothing, the same guard the skeleton's reader applies.
  it("refuses a non-finite own row and falls through", async () => {
    rows.own = [{ oracleId: "g", ...measured(9), avgWipes: Number.NaN }];
    rows.buckets = [{ condition: identityCondition(["B", "G"]), ...measured(5), withRoles: 40 }];
    const got = (await loadRoleTargetsForCommanders([golgari])).get("g");
    expect(got?.of).toBe("identity");
  });

  it("answers every commander asked about, each against its own buckets", async () => {
    rows.buckets = [
      { condition: identityCondition(["B", "G"]), ...measured(5), withRoles: 40 },
      { condition: identityCondition(["U"]), ...measured(7), withRoles: 40 },
    ];
    const got = await loadRoleTargetsForCommanders([golgari, { oracleId: "u", colorIdentity: ["U"] }]);
    expect(got.get("g")?.targets).toEqual(four(5));
    expect(got.get("u")?.targets).toEqual(four(7));
  });

  describe("on the labels basis", () => {
    const labelled = (n: number) => ({ labelRamp: n, labelDraw: n + 1, labelRemoval: n + 2, labelWipes: n + 3 });

    it("reads the label_* figures, not avg_*, down the same chain", async () => {
      rows.own = [{ oracleId: "g", ...measured(1), ...labelled(9) }];
      const got = (await loadRoleTargetsForCommanders([golgari], "labels")).get("g");
      expect(got).toEqual({ of: "commander", targets: four(9) });
    });

    it("falls past a commander with no label figures to its bucket's", async () => {
      rows.own = [{ oracleId: "g", ...measured(1), labelRamp: null, labelDraw: null, labelRemoval: null, labelWipes: null }];
      rows.buckets = [{ condition: identityCondition(["B", "G"]), ...measured(2), ...labelled(5), withRoles: 40 }];
      const got = (await loadRoleTargetsForCommanders([golgari], "labels")).get("g");
      expect(got).toEqual({ of: "identity", targets: four(5) });
    });

    it("ends at the label flat targets, 12/8/6/1, when no rung carries a label figure", async () => {
      rows.own = [{ oracleId: "g", ...measured(9) }];
      const got = (await loadRoleTargetsForCommanders([golgari], "labels")).get("g");
      expect(got).toEqual({ of: "flat", targets: { ramp: 12, draw: 8, removal: 6, wipes: 1 } });
    });

    it("leaves the classifier basis reading avg_*, with label_* present", async () => {
      rows.own = [{ oracleId: "g", ...measured(9), ...labelled(1) }];
      const got = (await loadRoleTargetsForCommanders([golgari])).get("g");
      expect(got).toEqual({ of: "commander", targets: four(9) });
    });
  });
});
