// The labels basis of the role-target chain (labels-everywhere PR 2): the SAME chain and the SAME
// finite, all-or-nothing guard, read off `label_*` instead of `avg_*`, with its own flat fallback.
import { describe, expect, it } from "vitest";
import { LABEL_ROLE_TARGETS, ROLE_TARGETS } from "../recs/roles";
import { pickRoleTargets } from "./build";
import { labelRoleRow, roleTargetsFrom } from "./role-targets";

const none = { pair: null, commander: null, identity: null, count: null };
const four = (n: number) => ({ ramp: n, draw: n + 1, removal: n + 2, wipes: n + 3 });

describe("pickRoleTargets by basis", () => {
  it("falls to the classifier's asserted targets by default, unchanged", () => {
    expect(pickRoleTargets(none)).toEqual({ of: "flat", targets: ROLE_TARGETS });
    expect(pickRoleTargets(none, "classifier")).toEqual({ of: "flat", targets: ROLE_TARGETS });
  });

  it("falls to the label means on the labels basis", () => {
    expect(pickRoleTargets(none, "labels")).toEqual({ of: "flat", targets: LABEL_ROLE_TARGETS });
  });

  it("takes the first measured rung on either basis, never the flat set", () => {
    const roles = { ...none, commander: four(4), identity: four(9) };
    expect(pickRoleTargets(roles, "labels")).toEqual({ of: "commander", targets: four(4) });
  });

  it("returns a copy, so a caller cannot move the constant", () => {
    const got = pickRoleTargets(none, "labels");
    got.targets.ramp = 99;
    expect(LABEL_ROLE_TARGETS.ramp).toBe(12);
  });

  it("states the label means rounded: 12/8/6/1", () => {
    expect(LABEL_ROLE_TARGETS).toEqual({ ramp: 12, draw: 8, removal: 6, wipes: 1 });
  });
});

describe("labelRoleRow", () => {
  it("reads label_* through the classifier's own guard", () => {
    const row = labelRoleRow({ labelRamp: 11.6, labelDraw: 8.4, labelRemoval: 6.2, labelWipes: 1.5 });
    expect(roleTargetsFrom(row)).toEqual({ ramp: 11.6, draw: 8.4, removal: 6.2, wipes: 1.5 });
  });

  it("is all-or-nothing: one null label figure is no measurement", () => {
    expect(roleTargetsFrom(labelRoleRow({ labelRamp: 11, labelDraw: null, labelRemoval: 6, labelWipes: 1 }))).toBeNull();
  });

  it("is no measurement for a row that carries no label columns (the profile path's rows)", () => {
    expect(roleTargetsFrom(labelRoleRow({}))).toBeNull();
    expect(roleTargetsFrom(labelRoleRow(undefined))).toBeNull();
  });

  it("does not take avg_*'s denominator: a bucket with label figures but with_roles 0 is measured", () => {
    // The label columns are nullable, so nullity is their witness; `with_roles` counts avg_* only.
    expect(roleTargetsFrom(labelRoleRow({ labelRamp: 12, labelDraw: 8, labelRemoval: 6, labelWipes: 1 }))).not.toBeNull();
  });
});
