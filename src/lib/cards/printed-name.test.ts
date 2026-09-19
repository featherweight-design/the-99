import { describe, expect, it } from "vitest";
import { commanderDisplayName } from "./printed-name";

describe("commanderDisplayName", () => {
  // The whole point of the helper: the art beside this name is the owned printing's, so a
  // renamed copy has to be captioned with the name printed on it.
  it("takes the name printed on the copy the player owns", () => {
    expect(commanderDisplayName({
      name: "Iroas, God of Victory",
      printedName: "Freya, Queen of the Valkyries",
    })).toBe("Freya, Queen of the Valkyries");
  });

  it("falls back to the oracle name when the copy prints it", () => {
    expect(commanderDisplayName({ name: "Atraxa, Praetors' Voice", printedName: null }))
      .toBe("Atraxa, Praetors' Voice");
  });

  // ABSENT is a state, not a gap: every commander fixture in the suite omits the field, and
  // so does any payload built before it existed. It has to read as the oracle name rather
  // than as `undefined` on screen.
  it("reads an absent printed name as the oracle name", () => {
    expect(commanderDisplayName({ name: "Muldrotha, the Gravetide" }))
      .toBe("Muldrotha, the Gravetide");
  });
});
