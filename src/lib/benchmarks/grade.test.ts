import { describe, expect, it } from "vitest";
import { step } from "./grade";

describe("step", () => {
  it("is 1 plus each cut met", () => {
    const cuts = [2, 4, 6, 8] as const;
    expect([0, 2, 3.9, 6, 100].map((v) => step(v, cuts))).toEqual([1, 2, 2, 4, 5]);
  });
});
