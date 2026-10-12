import { describe, expect, it } from "vitest";
import { basicCutFair, type LandCut } from "./basic-cut";

const cut = (over: Partial<LandCut> = {}): LandCut => ({ lands: 37, landTarget: 36, replacedByLand: false, colors: [{ sourcesAfter: 20, needed: 19 }], ...over });

describe("basicCutFair", () => {
  it("lets a land go when the deck is over its land target and its color stays at or above Needed", () => {
    expect(basicCutFair(cut())).toBe(true);
    expect(basicCutFair(cut({ colors: [{ sourcesAfter: 19, needed: 19 }] }))).toBe(true);
  });

  it("refuses at the land target and under it, when nothing replaces the land", () => {
    expect(basicCutFair(cut({ lands: 36 }))).toBe(false);
    expect(basicCutFair(cut({ lands: 34 }))).toBe(false);
  });

  it("does not hold a land-for-land trade to the land target: the count does not move", () => {
    expect(basicCutFair(cut({ lands: 34, replacedByLand: true }))).toBe(true);
  });

  it("refuses when any color the land makes ends under its Needed, replaced or not", () => {
    expect(basicCutFair(cut({ colors: [{ sourcesAfter: 18, needed: 19 }] }))).toBe(false);
    expect(basicCutFair(cut({ replacedByLand: true, colors: [{ sourcesAfter: 30, needed: 0 }, { sourcesAfter: 18, needed: 19 }] }))).toBe(false);
  });

  it("lets a land that makes no color go on the land count alone", () => {
    expect(basicCutFair(cut({ colors: [] }))).toBe(true);
    expect(basicCutFair(cut({ colors: [], lands: 36 }))).toBe(false);
  });
});
