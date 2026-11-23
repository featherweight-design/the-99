import { describe, expect, it } from "vitest";
import { pasteListText } from "./info";

describe("pasteListText", () => {
  it("lists a two-faced or split card by its front face, the quantity first", () => {
    expect(
      pasteListText([
        { name: "Sol Ring", quantity: 1 },
        { name: "Delver of Secrets // Insectile Aberration", quantity: 1 },
        { name: "Fire // Ice", quantity: 2 },
        { name: "Island", quantity: 12 },
      ]),
    ).toBe("1 Sol Ring\n1 Delver of Secrets\n2 Fire\n12 Island");
  });

  it("is empty for no lines", () => {
    expect(pasteListText([])).toBe("");
  });
});
