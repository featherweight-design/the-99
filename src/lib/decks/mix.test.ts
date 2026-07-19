import { describe, expect, it } from "vitest";
import { RECOMMENDED_MIX, roleCellState } from "./mix";

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

describe("roleCellState", () => {
  it("below-rec non-advisory is neutral figure + brass bar", () => {
    expect(roleCellState({ have: 4, target: 10, advisory: false })).toEqual({
      figureColor: "var(--fg-body)", barColor: "var(--brass)", pct: 40,
    });
  });
  it("met-rec non-advisory turns green", () => {
    expect(roleCellState({ have: 10, target: 10, advisory: false })).toEqual({
      figureColor: "var(--success)", barColor: "var(--success)", pct: 100,
    });
  });
  it("advisory (lands) stays brass even when over-target", () => {
    expect(roleCellState({ have: 40, target: 37, advisory: true })).toEqual({
      figureColor: "var(--fg-body)", barColor: "var(--brass)", pct: 100,
    });
  });
});
