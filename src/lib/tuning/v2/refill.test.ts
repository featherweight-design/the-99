import { describe, expect, it } from "vitest";

import { deckTuningCopy } from "../../copy/deck-tuning";
import { reasonFor, refillShortfall } from "./refill";

describe("the v2 refill", () => {
  it("asks for exactly the shortfall, once", () => {
    expect(refillShortfall(7, 10, false)).toBe(3);
    expect(refillShortfall(12, 10, false)).toBe(0);
    expect(refillShortfall(7, 10, true)).toBe(0);
  });

  it("tells the model why each line fell, in the rule's own words", () => {
    expect(reasonFor({ rule: "colourIdentity" })).toBe("it is outside the commander's colors");
    // The player's bracket choice is named as such, so the refill steers away from another bracket-moving card.
    expect(reasonFor({ rule: "bracketAim" })).toBe("it would move the deck away from the bracket the player chose");
    expect(reasonFor({ rule: "citation", cite: { kind: "games" } })).toBe("its games citation is not supported by the evidence");
    expect(reasonFor({ rule: "noResultClaim" })).toBe(`it broke the rule: ${deckTuningCopy.suggestionRules.noResultClaim}`);
  });
});
