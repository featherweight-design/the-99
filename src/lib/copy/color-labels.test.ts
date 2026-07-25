import { describe, expect, it } from "vitest";
import { colorWords, guildLabel } from "./color-labels";

describe("guildLabel", () => {
  it("names a two-color pair by its guild", () => {
    expect(guildLabel(["W", "R"])).toBe("Boros");
  });
  it("is order-independent", () => {
    expect(guildLabel(["R", "W"])).toBe("Boros");
  });
  it("names a mono color", () => {
    expect(guildLabel(["R"])).toBe("Red");
  });
  it("falls back when nothing is selected", () => {
    expect(guildLabel([])).toBe("this filter");
  });
});

describe("colorWords", () => {
  it("hyphenates a two-color pair in WUBRG order", () => {
    expect(colorWords(["W", "R"])).toBe("white-red");
  });
  it("is order-independent", () => {
    expect(colorWords(["R", "W"])).toBe("white-red");
  });
  it("returns a single color word for mono", () => {
    expect(colorWords(["G"])).toBe("green");
  });
  it("hyphenates three colors in WUBRG order", () => {
    expect(colorWords(["G", "W", "B"])).toBe("white-black-green");
  });
  it("hyphenates four colors in WUBRG order", () => {
    expect(colorWords(["G", "U", "R", "W"])).toBe("white-blue-red-green");
  });
  it("hyphenates all five colors in WUBRG order", () => {
    expect(colorWords(["G", "R", "B", "U", "W"])).toBe(
      "white-blue-black-red-green",
    );
  });
  it("returns an empty string for empty input", () => {
    expect(colorWords([])).toBe("");
  });
});
