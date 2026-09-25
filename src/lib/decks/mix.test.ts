import { describe, expect, it } from "vitest";
import { computeRoleCounts, mixSourceLine, recommendedMix, roleCellState } from "./mix";
import type { ProfileSkeleton } from "../profile/types";

const skel = (over: {
  land?: number; ramp?: number; draw?: number; removal?: number; wipes?: number;
  of?: "commander" | "pair" | "flat";
  composition?: boolean;
} = {}): ProfileSkeleton => ({
  composition: over.composition === false ? null : {
    of: "commander",
    targets: {
      land: over.land ?? 34, basic: 18, nonbasic: 16, creature: 30, instant: 7,
      sorcery: 6, artifact: 5, enchantment: 4, planeswalker: 1, battle: 0,
    },
    averageCurve: null,
  },
  roleTargets: {
    of: over.of ?? "commander",
    targets: {
      ramp: over.ramp ?? 9, draw: over.draw ?? 11,
      removal: over.removal ?? 7, wipes: over.wipes ?? 2,
    },
  },
  condition: "G", thinCondition: false, staples: [], commanderDeckCount: 1000,
});

describe("recommendedMix", () => {
  it("takes the measured targets over the asserted ones", () => {
    const m = recommendedMix(skel(), false);
    expect(m.cells.ramp.target).toBe(9);
    expect(m.cells.draw.target).toBe(11);
    expect(m.cells.removal.target).toBe(7);
    expect(m.cells.wipes.target).toBe(2);
    expect(m.cells.land.target).toBe(34);
    expect(m.measured).toBe(true);
  });

  // A bucket's mean is a `real` and a strip cannot draw 8.4 of a card.
  it("rounds to whole cards, half-up", () => {
    expect(recommendedMix(skel({ ramp: 8.4, draw: 8.5 }), false).cells.ramp.target).toBe(8);
    expect(recommendedMix(skel({ ramp: 8.4, draw: 8.5 }), false).cells.draw.target).toBe(9);
  });

  // 390 commanders measure exactly 0 wipes on front-face text. A fallback treating 0 as "no
  // answer" would replace the figure the index is most certain about with an asserted 3.
  it("keeps a measured zero at zero", () => {
    expect(recommendedMix(skel({ wipes: 0 }), false).cells.wipes.target).toBe(0);
  });

  it("falls back to the asserted baseline, and says so", () => {
    const m = recommendedMix(null, false);
    expect(m.cells.ramp.target).toBe(10);
    expect(m.cells.land.target).toBe(37);
    expect(m.measured).toBe(false);
  });

  // The two chains resolve independently, so a skeleton can carry one and not the other — and
  // a line claiming EDHREC over four asserted constants is the provenance failure this whole
  // sub-project exists to end.
  it("does not claim measured when only the land count is", () => {
    const m = recommendedMix(skel({ of: "flat" }), false);
    expect(m.cells.land.target).toBe(34);
    expect(m.cells.ramp.target).toBe(10);
    expect(m.measured).toBe(false);
    // Each half is reported on its own, for a reader that names one role's need.
    expect(m.rolesUsable).toBe(false);
    expect(m.landMeasured).toBe(true);
  });

  it("reports both halves measured when the skeleton carries both", () => {
    const m = recommendedMix(skel(), false);
    expect(m.rolesUsable).toBe(true);
    expect(m.landMeasured).toBe(true);
    const bare = recommendedMix(null, false);
    expect(bare.rolesUsable).toBe(false);
    expect(bare.landMeasured).toBe(false);
  });

  it("keeps land advisory and the four roles not", () => {
    const m = recommendedMix(skel(), false);
    expect(m.cells.land.advisory).toBe(true);
    for (const role of ["ramp", "draw", "removal", "wipes"] as const) {
      expect(m.cells[role].advisory).toBe(false);
    }
  });
});

describe("mixSourceLine", () => {
  it("names EDHREC only when the numbers came from there", () => {
    expect(mixSourceLine(recommendedMix(skel(), false))).toBe("EDHREC averages");
    expect(mixSourceLine(recommendedMix(null, false))).not.toBe("EDHREC averages");
  });
});

describe("computeRoleCounts", () => {
  it("counts from card.role, not typeLine — a creature with role:draw is counted as draw", () => {
    // A creature card: typeLine alone would classify it as nothing (no oracle text keywords),
    // but the server set role:"draw" from real oracleText. We must count it as draw.
    const cards = [
      {
        role: "draw" as const,
        quantity: 2,
        // typeLine is a creature — classifyRoles({ typeLine, oracleText: null }) returns []
        // so any old code using classifyRoles would miss this card entirely.
      },
      { role: "ramp" as const, quantity: 3 },
      { role: "land" as const, quantity: 37 },
      { role: "other" as const, quantity: 5 }, // "other" must not inflate any MixRole
    ];
    const counts = computeRoleCounts(cards);
    expect(counts.draw).toBe(2);
    expect(counts.ramp).toBe(3);
    expect(counts.land).toBe(37);
    expect(counts.removal).toBe(0);
    expect(counts.wipes).toBe(0);
  });

  it("weights by quantity", () => {
    const cards = [
      { role: "removal" as const, quantity: 4 },
      { role: "removal" as const, quantity: 2 },
    ];
    expect(computeRoleCounts(cards).removal).toBe(6);
  });
});

describe("roleCellState", () => {
  // A MEASURED TARGET OF ZERO. 390 commanders measure no wipes at all, and 0/0 is NaN —
  // which reached the cell as `width: NaN%`, a declaration the browser drops, leaving the
  // fill at auto width: a full bar drawn by accident. Nothing covered a zero target, because
  // until the targets were measured none could be zero.
  it("reports 100 for a zero target rather than NaN", () => {
    const zero = roleCellState({ have: 0, target: 0 });
    expect(Number.isNaN(zero.pct)).toBe(false);
    expect(zero.pct).toBe(100);
    expect(zero.figureColor).toBe("var(--success)");
  });

  it("does not overflow when a zero target is exceeded", () => {
    expect(roleCellState({ have: 3, target: 0 }).pct).toBe(100);
  });

  // Design table E4/E5: the figure is the loudest thing in a short cell, not
  // the quietest. It read as body text until #184.
  it("below-rec is an accent figure over an accent-mid bar", () => {
    expect(roleCellState({ have: 4, target: 10 })).toEqual({
      figureColor: "var(--accent)", barColor: "var(--accent-mid)", pct: 40,
    });
  });
  it("met-rec turns green", () => {
    expect(roleCellState({ have: 10, target: 10 })).toEqual({
      figureColor: "var(--success)", barColor: "var(--success)", pct: 100,
    });
  });
  // The advisory Land target no longer buys a colour of its own. Holding it in
  // the short palette put an accent figure in a cell that had already dropped its
  // caption and its action, because the control keys on the number alone.
  it("colours an over-target advisory role exactly like any other met role", () => {
    expect(roleCellState({ have: 40, target: 37 })).toEqual({
      figureColor: "var(--success)", barColor: "var(--success)", pct: 100,
    });
  });
});
