import { describe, expect, it } from "vitest";
import { deckRowName } from "./row-name";

describe("deckRowName", () => {
  it("cuts an unrenamed two-faced card to its front face", () => {
    expect(deckRowName({ name: "Delver of Secrets // Insectile Aberration", layout: "transform" })).toBe("Delver of Secrets");
    expect(deckRowName({ name: "Reidane, God of the Worthy // Valkmira, Protector's Shield", layout: "modal_dfc" })).toBe("Reidane, God of the Worthy");
  });

  it("cuts a renamed two-faced printing to its printed front face", () => {
    expect(deckRowName({ name: "World at War", printedName: "Battle of Olympus // Aftermath", layout: "transform" })).toBe("Battle of Olympus");
  });

  it("keeps both halves of a one-faced card, and a card with no layout", () => {
    expect(deckRowName({ name: "Fire // Ice", layout: "split" })).toBe("Fire // Ice");
    expect(deckRowName({ name: "Delver of Secrets // Insectile Aberration" })).toBe("Delver of Secrets // Insectile Aberration");
  });
});
