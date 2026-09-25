import { describe, expect, it } from "vitest";
import { fitBody, fitCount } from "./fit";

describe("fitBody", () => {
  it("drops basics and universal staples, and counts a card once", () => {
    const body = fitBody(
      [
        { oracleId: "sol", basic: false },
        { oracleId: "forest", basic: true },
        { oracleId: "ring", basic: false },
        { oracleId: "ring", basic: false },
        { oracleId: "tutor", basic: false },
      ],
      new Set(["sol"]),
    );
    expect(body.sort()).toEqual(["ring", "tutor"]);
  });
});

describe("fitCount", () => {
  it("counts the body's cards the support list carries, over the body's size", () => {
    expect(fitCount(new Set(["a", "c", "z"]), ["a", "b", "c"])).toEqual({ n: 2, of: 3 });
  });

  it("is zero of zero for an empty body", () => {
    expect(fitCount(new Set(["a"]), [])).toEqual({ n: 0, of: 0 });
  });
});
