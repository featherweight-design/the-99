import { describe, expect, it } from "vitest";
import { computeRoleCounts, RECOMMENDED_MIX, roleCellState } from "./mix";

describe("RECOMMENDED_MIX", () => {
  it("locks the four role targets and the advisory land target", () => {
    expect(RECOMMENDED_MIX.ramp.target).toBe(10);
    expect(RECOMMENDED_MIX.draw.target).toBe(10);
    expect(RECOMMENDED_MIX.removal.target).toBe(8);
    expect(RECOMMENDED_MIX.wipes.target).toBe(3);
    expect(RECOMMENDED_MIX.land.target).toBe(37);
    expect(RECOMMENDED_MIX.land.advisory).toBe(true);
    for (const role of ["ramp", "draw", "removal", "wipes"] as const) {
      expect(RECOMMENDED_MIX[role].advisory).toBe(false);
    }
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
  // Design table E4/E5: the figure is the loudest thing in a short cell, not
  // the quietest. It read as body text until #184.
  it("below-rec is a brass figure over a brass-mid bar", () => {
    expect(roleCellState({ have: 4, target: 10 })).toEqual({
      figureColor: "var(--brass)", barColor: "var(--brass-mid)", pct: 40,
    });
  });
  it("met-rec turns green", () => {
    expect(roleCellState({ have: 10, target: 10 })).toEqual({
      figureColor: "var(--success)", barColor: "var(--success)", pct: 100,
    });
  });
  // The advisory Land target no longer buys a colour of its own. Holding it in
  // the short palette put a brass figure in a cell that had already dropped its
  // caption and its action, because the control keys on the number alone.
  it("colours an over-target advisory role exactly like any other met role", () => {
    expect(roleCellState({ have: 40, target: 37 })).toEqual({
      figureColor: "var(--success)", barColor: "var(--success)", pct: 100,
    });
  });
});
