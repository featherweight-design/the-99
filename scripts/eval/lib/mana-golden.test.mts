import { describe, expect, it } from "vitest";
import { diffGolden, type GoldenBalance, type GoldenColor } from "./mana-golden.mjs";

const color = (over: Partial<GoldenColor> = {}): GoldenColor => ({ demand: 10, target: 5, gap: -2, state: "met", lands: ["Forest", "Forest"], nonland: ["Sol Ring"], ...over });
const golden = (): GoldenBalance => ({
  state: "ok",
  sourceCards: 40,
  colorlessSupply: 3,
  unattributedNonland: 0,
  colors: { W: color(), U: color(), B: color(), R: color(), G: color() },
});

describe("diffGolden", () => {
  it("is empty for identical output", () => expect(diffGolden(golden(), golden())).toEqual([]));

  it("names a changed figure", () => {
    const a = golden();
    a.colors.G.gap = 4;
    a.colors.G.state = "short";
    expect(diffGolden(golden(), a)).toEqual(["G.gap: expected -2, got 4", "G.state: expected met, got short"]);
  });

  it("names the card that moved, one copy more or less included", () => {
    const a = golden();
    a.colors.R.lands = ["Forest", "Forest", "Forest"];
    a.colors.W.nonland = [];
    expect(diffGolden(golden(), a)).toEqual(["W.nonland: expected 1, got 0; missing Sol Ring", "R.lands: expected 2, got 3; extra Forest"]);
  });

  it("catches a swapped card at an unchanged count", () => {
    const a = golden();
    a.colors.U.nonland = ["Arcane Signet"];
    expect(diffGolden(golden(), a)).toEqual(["U.nonland: expected 1, got 1; missing Sol Ring; extra Arcane Signet"]);
  });

  it("names a swap between copies of cards the list already holds, at an unchanged count", () => {
    const e = golden();
    e.colors.G.lands = ["Forest", "Forest", "Island"];
    const a = golden();
    a.colors.G.lands = ["Forest", "Island", "Island"];
    expect(diffGolden(e, a)).toEqual(["G.lands: expected 3, got 3; missing Forest; extra Island"]);
  });

  it("catches a top-level difference", () => {
    const a = golden();
    a.sourceCards = 41;
    expect(diffGolden(golden(), a)).toEqual(["sourceCards: expected 40, got 41"]);
  });
});
