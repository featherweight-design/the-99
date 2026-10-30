import { describe, expect, it } from "vitest";

import { checkedSynopsis } from "../../components/decks/__fixtures__/synopsis";
import { bySeverity, landFigure, markedCards, splitSeverity, usesStagesShape } from "./stages-view";

describe("landFigure", () => {
  it("reads the one number the line states", () => {
    expect(landFigure("4 lands suit a curve where 9 spells cost five or more.")).toBe(4);
    expect(landFigure("Keep three lands with a two-drop.")).toBe(3);
  });
  it("draws none for a range, two numbers, a deck total or no number", () => {
    expect(landFigure("3 or 4 lands suit this curve.")).toBeNull();
    expect(landFigure("Keep 3 lands, send back 5 lands.")).toBeNull();
    expect(landFigure("It plays 37 lands, so the curve is easy.")).toBeNull();
    expect(landFigure("A low curve keeps hands light.")).toBeNull();
  });
  it("ignores a number inside a card mark", () => {
    expect(landFigure("[[Tropical Island 4 lands]] and 3 lands.")).toBe(3);
  });
});

describe("splitSeverity", () => {
  it("splits Critical, Moderate and Minor, and nothing else", () => {
    expect(splitSeverity("Critical: Loses to a loop.")).toEqual({ tier: "Critical", rest: "Loses to a loop." });
    expect(splitSeverity("Moderate: A wipe resets it.")).toEqual({ tier: "Moderate", rest: "A wipe resets it." });
    expect(splitSeverity("Minor: Few draws.")).toEqual({ tier: "Minor", rest: "Few draws." });
    expect(splitSeverity("Severe: Loses to a loop.")).toBeNull();
    expect(splitSeverity("Folds to a wipe.")).toBeNull();
    expect(splitSeverity("Moderate:")).toBeNull();
  });
});

describe("bySeverity", () => {
  it("puts Critical first, then Moderate, then Minor, keeping the model's order within a tier", () => {
    expect(bySeverity(["Minor: a", "Moderate: b", "Critical: c", "Moderate: d", "Plain e", "Critical: f"]))
      .toEqual(["Critical: c", "Critical: f", "Moderate: b", "Moderate: d", "Minor: a", "Plain e"]);
  });
});

describe("markedCards", () => {
  const cards = { "sol ring": { oracleId: "sol", name: "Sol Ring" }, "arcane signet": { oracleId: "sig", name: "Arcane Signet" } };
  it("lists resolved marks in order, once each, up to the limit", () => {
    expect(markedCards("[[Arcane Signet]], [[Sol Ring]], [[Arcane Signet]], [[Nope]]", cards).map((c) => c.oracleId)).toEqual(["sig", "sol"]);
    expect(markedCards("[[Arcane Signet]] [[Sol Ring]]", cards, 1).map((c) => c.oracleId)).toEqual(["sig"]);
  });
});

describe("usesStagesShape", () => {
  const three = checkedSynopsis();
  three.primer!.strategy = ["a", "b", "c"];
  three.primer!.tips = [three.primer!.tips[0], three.primer!.tips[0]];
  it("needs contract 13 or later and the shape's three stages and two tips", () => {
    expect(usesStagesShape(13, three)).toBe(true);
    expect(usesStagesShape(14, three)).toBe(true);
    expect(usesStagesShape(12, three)).toBe(false);
    expect(usesStagesShape(undefined, three)).toBe(false);
    expect(usesStagesShape(13, checkedSynopsis())).toBe(false);
  });
});
