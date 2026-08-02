import { describe, it, expect } from "vitest";
import { colorLabel } from "./format";

describe("colorLabel", () => {
  it("names the single colours", () => {
    expect(["W", "U", "B", "R", "G"].map((c) => colorLabel([c]))).toEqual([
      "White", "Blue", "Black", "Red", "Green",
    ]);
  });

  it("names colourless and five-colour", () => {
    expect(colorLabel([])).toBe("Colorless");
    expect(colorLabel(["W", "U", "B", "R", "G"])).toBe("5-color");
  });

  it("names all ten guilds regardless of the order the colours arrive in", () => {
    expect(colorLabel(["W", "U"])).toBe("Azorius");
    expect(colorLabel(["U", "W"])).toBe("Azorius");
    expect(colorLabel(["B", "G"])).toBe("Golgari");
    expect(colorLabel(["R", "W"])).toBe("Boros");
  });

  it("names shards and wedges instead of falling back to Multi", () => {
    expect(colorLabel(["G", "U", "W"])).toBe("Bant");
    expect(colorLabel(["W", "U", "B"])).toBe("Esper");
    expect(colorLabel(["B", "R", "G"])).toBe("Jund");
    expect(colorLabel(["B", "G", "W"])).toBe("Abzan");
    expect(colorLabel(["G", "R", "U"])).toBe("Temur");
  });

  it("names a four-colour identity by the colour it is missing", () => {
    expect(colorLabel(["W", "U", "B", "R"])).toBe("Non-green");
    expect(colorLabel(["U", "B", "R", "G"])).toBe("Non-white");
    expect(colorLabel(["W", "B", "R", "G"])).toBe("Non-blue");
  });

  it("falls back to the raw letter for an unknown colour code", () => {
    expect(colorLabel(["X"])).toBe("X");
  });
});
