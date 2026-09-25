import { describe, expect, it } from "vitest";
import { changeCommanderCopy as copy } from "./change-commander";

describe("changeCommanderCopy", () => {
  it("says its for a single and their for a pair", () => {
    expect(copy.sheet.figure(41, 62, false)).toBe("41 of 62 are in its decks");
    expect(copy.sheet.figure(41, 62, true)).toBe("41 of 62 are in their decks");
  });

  it("compares mana value in both directions and at equality", () => {
    expect(copy.sheet.manaValueRel(3, 5, "Korvold")).toBe("(2 less than Korvold)");
    expect(copy.sheet.manaValueRel(6, 5, "Korvold")).toBe("(1 more than Korvold)");
    expect(copy.sheet.manaValueRel(5, 5, "Korvold")).toBe("(same as Korvold)");
  });

  it("carries no string for a candidate with no deck data (H2 hides it)", () => {
    expect("noData" in copy.sheet).toBe(false);
  });
});
