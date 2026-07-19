import { describe, expect, it } from "vitest";
import { commanderSlug } from "./slug";

describe("commanderSlug", () => {
  it("lowercases and hyphenates", () => {
    expect(commanderSlug("Muldrotha, the Gravetide")).toBe("muldrotha-the-gravetide");
  });
  it("strips apostrophes and diacritics", () => {
    expect(commanderSlug("K'rrik, Son of Yawgmoth")).toBe("krrik-son-of-yawgmoth");
    expect(commanderSlug("Dandân")).toBe("dandan");
  });
  it("uses only the front face of a DFC name", () => {
    expect(commanderSlug("Esika, God of the Tree // The Prismatic Bridge")).toBe("esika-god-of-the-tree");
  });
});
