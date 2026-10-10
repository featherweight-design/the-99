import { describe, expect, it } from "vitest";

import { planFill, rolesWithLabels, type FillCandidate, type FillPlan } from "./fill";
import type { LabelTargetRole } from "../labels/role-sets";
import type { ProfileSkeleton } from "../profile/types";

const c = (over: Partial<FillCandidate> & { oracleId: string }): FillCandidate => ({
  name: over.oracleId, typeLine: "Artifact", oracleText: "{T}: Add {C}.",
  keywords: [], manaCost: null, layout: "normal", owned: true, ownedQuantity: 1,
  inclusionPct: null, ...over,
});

const skeleton = (ramp: number, draw = 0): ProfileSkeleton => ({
  composition: null,
  roleTargets: { of: "commander", targets: { ramp, draw, removal: 0, wipes: 0 } },
  condition: "G", thinCondition: false, staples: [], commanderDeckCount: 1000,
});

const roleCount = (plan: FillPlan, role: string) =>
  plan.rows.filter((r) => r.role === role).reduce((n, r) => n + r.quantity, 0);

const labels = (entries: Record<string, LabelTargetRole[]>) => new Map(Object.entries(entries));

describe("rolesWithLabels", () => {
  const rock = c({ oracleId: "rock" }); // text reads as ramp

  it("is the classifier without labels", () => {
    expect(rolesWithLabels(rock, undefined)).toEqual(["ramp"]);
  });

  it("counts a labeled card by its label, over the text", () => {
    expect(rolesWithLabels(rock, labels({ rock: ["draw"] }))).toEqual(["draw"]);
    expect(rolesWithLabels(rock, labels({ rock: [] }))).toEqual([]);
  });

  it("falls back to the classifier for a card with no label, never skipping it", () => {
    expect(rolesWithLabels(rock, labels({ other: ["draw"] }))).toEqual(["ramp"]);
  });

  it("leaves a land to the classifier whatever its label says", () => {
    const land = c({ oracleId: "land", typeLine: "Land", oracleText: "{T}: Add {G}." });
    expect(rolesWithLabels(land, labels({ land: ["ramp"] }))).toEqual(["land"]);
  });
});

describe("planFill by label", () => {
  const pool = [
    c({ oracleId: "a", inclusionPct: 90 }), // text: ramp
    c({ oracleId: "b", inclusionPct: 80 }), // text: ramp
    c({ oracleId: "d", inclusionPct: 70, typeLine: "Sorcery", oracleText: "Draw a card." }),
  ];
  const base = { hasPartner: false, skeleton: skeleton(2, 1), slots: 3 } as const;

  it("fills to the label basis: a card the label calls draw closes the draw floor, not ramp", () => {
    const plan = planFill(pool, { ...base, labelRoles: labels({ a: ["draw"], b: ["ramp"], d: ["ramp"] }) });
    expect(roleCount(plan, "ramp")).toBe(2);
    expect(roleCount(plan, "draw")).toBe(1);
    expect(plan.rows.find((r) => r.oracleId === "a")?.role).toBe("draw");
  });

  it("places an unlabeled card by its text", () => {
    const plan = planFill(pool, { ...base, labelRoles: labels({}) });
    expect(plan.rows.map((r) => r.oracleId).sort()).toEqual(["a", "b", "d"]);
    expect(roleCount(plan, "ramp")).toBe(2);
    expect(roleCount(plan, "draw")).toBe(1);
  });

  it("is unchanged with no labels", () => {
    const withMap = planFill(pool, { ...base, labelRoles: undefined });
    expect(withMap.rows.map((r) => `${r.oracleId}:${r.role}`)).toEqual(["a:ramp", "b:ramp", "d:draw"]);
  });

  it("credits a held card by its label when it carries an id", () => {
    const held = [{ oracleId: "h", typeLine: "Artifact", oracleText: "{T}: Add {C}.", keywords: [], layout: "normal", manaCost: null, quantity: 1 }];
    // By text the held rock closes one ramp floor; by label it is draw and closes the draw floor.
    const plan = planFill(pool, { ...base, slots: 2, held, labelRoles: labels({ h: ["draw"] }) });
    expect(roleCount(plan, "draw")).toBe(0);
    expect(roleCount(plan, "ramp")).toBe(2);
  });
});
