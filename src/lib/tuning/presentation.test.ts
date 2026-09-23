import { describe, expect, it } from "vitest";

import { presentationFailures } from "./presentation";

const notes = ["flooded out on turn six"];

describe("presentationFailures", () => {
  it("passes a line that carries its denominator", () => {
    expect(presentationFailures("Mana hurt in 3 of 5 games.", notes)).toEqual([]);
  });

  it("catches a percentage, and a win rate", () => {
    expect(presentationFailures("Mana hurt in 60% of games.", notes)).toContain("noPercentage");
    expect(presentationFailures("Your win rate is low.", notes)).toContain("noPercentage");
  });

  it("catches a bare count with no denominator", () => {
    expect(presentationFailures("Mana hurt in 3 games.", notes)).toContain("denominator");
  });

  it("does not ask a card count for a denominator", () => {
    expect(presentationFailures("The deck runs 34 lands against a target of 37.", notes)).toEqual([]);
  });

  it("catches a net figure, spelled or signed", () => {
    expect(presentationFailures("Mana is net negative across the log.", notes)).toContain("noNet");
    expect(presentationFailures("Mana sits at -2 across the log.", notes)).toContain("noNet");
  });

  it("does not read a card's counter notation as a signed figure", () => {
    expect(presentationFailures("Adds another +1/+1 counter payoff.", notes)).toEqual([]);
    expect(presentationFailures("Shrinks their team with -1/-1 counters.", notes)).toEqual([]);
  });

  it("accepts a quotation of anything the player wrote, the intent included", () => {
    expect(presentationFailures('For a deck meant to "go wide with tokens", this fits.', [...notes, "go wide with tokens"])).toEqual([]);
  });

  it("does not read a hyphenated word as a sign", () => {
    expect(presentationFailures("A two-mana ramp spell fits the curve.", notes)).toEqual([]);
  });

  it("passes a note quoted verbatim and catches one that is not", () => {
    expect(presentationFailures('You wrote "flooded out on turn six".', notes)).toEqual([]);
    expect(presentationFailures("You wrote “flooded out on turn six”.", notes)).toEqual([]);
    expect(presentationFailures('You wrote "flooded on turn six".', notes)).toContain("quotedNote");
  });
});
