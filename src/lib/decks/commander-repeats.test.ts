import { describe, expect, it } from "vitest";
import { commanderRepeats } from "./commander-repeats";

describe("commanderRepeats", () => {
  it("is the whole name or the part before the comma, folding case and punctuation", () => {
    expect(commanderRepeats("Ghalta, Primal Hunger", "Ghalta, Primal Hunger", null)).toBe(true);
    expect(commanderRepeats("Giada", "Giada, Font of Hope", null)).toBe(true);
    expect(commanderRepeats("ghalta primal hunger!", "Ghalta, Primal Hunger", null)).toBe(true);
    expect(commanderRepeats("Éowyn", "Eowyn, Fearless Knight", null)).toBe(true);
    // A two-faced commander is its front face, as every short name in the app is.
    expect(commanderRepeats("Esika, God of the Tree", "Esika, God of the Tree // The Prismatic Bridge", null)).toBe(true);
    expect(commanderRepeats("Esika", "Esika, God of the Tree // The Prismatic Bridge", null)).toBe(true);
  });

  it("is not a deck named for something else, nor any pair", () => {
    expect(commanderRepeats("Thopter Factory", "Sai, Master Thopterist", null)).toBe(false);
    expect(commanderRepeats("Sai Thopters", "Sai, Master Thopterist", null)).toBe(false);
    expect(commanderRepeats("Tymna the Weaver", "Tymna the Weaver", "Thrasios, Triton Hero")).toBe(false);
    expect(commanderRepeats("", "Sai", null)).toBe(false);
  });
});
