import { describe, expect, it } from "vitest";

import { askFor, cutPlanFor, dropAcross, isCount, keepUpTo, MAX_COUNT, replyCeilingFor, schemaCapFor } from "./count";

describe("the v2 count", () => {
  it("runs from 1 to 20 (Hugh, Q6)", () => {
    expect(isCount(1)).toBe(true);
    expect(isCount(MAX_COUNT)).toBe(true);
    for (const bad of [0, 21, 2.5, -1, Number.NaN, "3", null]) expect(isCount(bad)).toBe(false);
  });

  it("asks ceil(1.5N) per list with a loose cap at twice the ask", () => {
    expect([1, 3, 10, 20].map(askFor)).toEqual([2, 5, 15, 30]);
    expect(schemaCapFor(askFor(20))).toBe(60);
  });

  it("sizes the cut call from the additions kept, and skips it with none", () => {
    expect(cutPlanFor(10, 15)).toEqual({ ask: 15, target: 10 });
    expect(cutPlanFor(10, 7)).toEqual({ ask: 11, target: 7 });
    expect(cutPlanFor(10, 0)).toEqual({ ask: 0, target: 0 });
  });

  it("keeps the first ask-many lines in the model's order", () => {
    expect(keepUpTo(["a", "b", "c", "d"], 3)).toEqual(["a", "b", "c"]);
    expect(keepUpTo(["a"], 3)).toEqual(["a"]);
  });

  it("drops a refill line naming a card already kept, or named twice in the refill", () => {
    const refill = [{ id: "x" }, { id: "y" }, { id: "x" }, { id: "z" }];
    expect(dropAcross(refill, new Set(["y"]), (l) => l.id)).toEqual([{ id: "x" }, { id: "z" }]);
  });
});

describe("replyCeilingFor", () => {
  it("is 8,000 for a small ask and 600 a line plus 4,000 above it: 22,000 at N=20's ask of 30", () => {
    expect(replyCeilingFor(askFor(3))).toBe(8_000);
    expect(replyCeilingFor(askFor(20))).toBe(22_000);
  });
});
