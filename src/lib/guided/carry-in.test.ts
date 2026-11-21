import { describe, expect, it } from "vitest";

import { carryIn, NO_CARRY, type CarryAnswers } from "./carry-in";

const offered = [{ key: "dragons", label: "Dragons" }, { key: "treasure", label: "Treasure" }];
const answers = (o: Partial<CarryAnswers> = {}): CarryAnswers => ({ themes: [], pool: "any", card: null, budgetDollars: null, bracket: null, ...o });

describe("carryIn", () => {
  it("pre-picks nothing without answers", () => {
    expect(carryIn(null, offered)).toEqual(NO_CARRY);
  });

  it("picks the first answered theme the offer backs, by slug or by label", () => {
    expect(carryIn(answers({ themes: [{ slug: "lifegain", label: "Lifegain" }, { slug: "x", label: "treasure" }] }), offered).strategyKey).toBe("treasure");
    expect(carryIn(answers({ themes: [{ slug: "dragons", label: "Dragons" }] }), offered).strategyKey).toBe("dragons");
    expect(carryIn(answers({ themes: [{ slug: "lifegain", label: "Lifegain" }] }), offered).strategyKey).toBeNull();
  });

  it("offers only brackets 2 to 4", () => {
    expect(carryIn(answers({ bracket: 3 }), offered).bracket).toBe(3);
    expect(carryIn(answers({ bracket: 1 }), offered).bracket).toBeNull();
    expect(carryIn(answers({ bracket: 5 }), offered).bracket).toBeNull();
  });

  it("maps the pool and budget, and keeps the build-around card", () => {
    expect(carryIn(answers({ pool: "own", budgetDollars: 50 }), offered)).toMatchObject({ poolMode: "owned", budgetCents: null });
    expect(carryIn(answers({ budgetDollars: 12.5 }), offered)).toMatchObject({ poolMode: "budget", budgetCents: 1250 });
    expect(carryIn(answers(), offered).poolMode).toBeNull();
    for (const bad of [0, -5, Number.NaN, Number.POSITIVE_INFINITY, 6000]) expect(carryIn(answers({ budgetDollars: bad }), offered)).toMatchObject({ poolMode: null, budgetCents: null });
    expect(carryIn(answers({ card: { oracleId: "c1" } }), offered).kept).toEqual(["c1"]);
  });
});
