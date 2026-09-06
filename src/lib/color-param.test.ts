import { describe, expect, it } from "vitest";
import { parseColors } from "./color-param";

describe("parseColors", () => {
  it("reads the letters in the order the param gives them", () => {
    expect(parseColors("BG")).toEqual(["B", "G"]);
    expect(parseColors("bg")).toEqual(["B", "G"]);
  });

  it("drops what is not a colour and collapses repeats", () => {
    expect(parseColors("BxG B")).toEqual(["B", "G"]);
  });

  it("reads an absent or empty param as no filter", () => {
    expect(parseColors(null)).toEqual([]);
    expect(parseColors("")).toEqual([]);
  });
});
