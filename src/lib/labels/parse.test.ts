import { describe, expect, it } from "vitest";

import { faceResolver } from "./parse";

/**
 * Every case here is a shape the sample actually produced, or a shape that would have
 * corrupted a published figure if it had. The two models disagreed about how to name a
 * two-faced card, so neither behaviour can be assumed.
 */
describe("faceResolver", () => {
  const asked = ["Soulcipher Board // Cipherbound Spirit", "Runadi, Behemoth Caller"];

  it("passes through a name the batch asked for", () => {
    expect(faceResolver(asked)("Runadi, Behemoth Caller")).toBe("Runadi, Behemoth Caller");
  });

  it("keeps a joined name joined, which is how Haiku returned it", () => {
    expect(faceResolver(asked)("Soulcipher Board // Cipherbound Spirit"))
      .toBe("Soulcipher Board // Cipherbound Spirit");
  });

  it("resolves either FACE to the joined name, which is how Sonnet returned it", () => {
    const r = faceResolver(asked);
    expect(r("Soulcipher Board")).toBe("Soulcipher Board // Cipherbound Spirit");
    expect(r("Cipherbound Spirit")).toBe("Soulcipher Board // Cipherbound Spirit");
  });

  // The refusal is the load-bearing half. An invented name accepted here enters the label
  // set, and the agreement pass iterates one model's keys — so a hallucination returned by
  // BOTH models would count as an agreeing card and move the denominator.
  it("refuses a name that is neither asked for nor a face of one", () => {
    expect(faceResolver(asked)("Llanowar Elves")).toBeNull();
  });

  // Never a fuzzy match: a near-miss is a different card, not a typo to be helpful about.
  it("refuses a near-miss rather than guessing", () => {
    expect(faceResolver(asked)("Soulcipher Boards")).toBeNull();
    expect(faceResolver(asked)("Runadi")).toBeNull();
  });

  // An exact asked-for name wins over being some other card's face, or a label would move
  // silently from one card to another. The precedence lives in the LOOKUP — `exact` is
  // checked before `faceOf` — so this pins observable behaviour rather than a guard in the
  // map-building loop, which an earlier version claimed to pin and could not.
  it("prefers an exact name to treating it as another card's face", () => {
    const r = faceResolver(["Fire // Ice", "Fire"]);
    expect(r("Fire")).toBe("Fire");
    expect(r("Ice")).toBe("Fire // Ice");
  });
});
