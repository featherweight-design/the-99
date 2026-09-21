import { describe, expect, it } from "vitest";

import { COMBO_DETECTION, EXTRA_TURN_DETECTION, MLD_DETECTION } from "../bracket/rules";
import { BRACKET_NAMES, bracketFace, bracketPhrase, deckAnalysisCopy } from "./deck-analysis";

describe("the bracket names", () => {
  it("uses the Commander Format Panel's own words", () => {
    // Not ours to reword: a player carries a bracket to a pod and says it out loud.
    expect(BRACKET_NAMES).toEqual({
      1: "Exhibition",
      2: "Core",
      3: "Upgraded",
      4: "Optimized",
      5: "cEDH",
    });
  });

  it("speaks a single bracket as one name and a range as two", () => {
    expect(bracketPhrase([4])).toBe("Optimized");
    expect(bracketPhrase([4, 5])).toBe("Optimized or cEDH");
    expect(bracketPhrase([1, 2])).toBe("Exhibition or Core");
  });

  it("draws the face as the numeral and the name together", () => {
    expect(bracketFace(3)).toBe("3 Upgraded");
  });
});

describe("the detection statements", () => {
  /**
   * THE POINT OF THIS FILE. The handoff's copy says "23 of the 24" and names ONE miss; the
   * measured constant says 22 of 24 with TWO. A transcribed figure desynced once before
   * shipping, so every figure here is asserted to come FROM the constant — a test that quoted
   * the expected sentence would just be a second transcription.
   */
  it("builds the land-denial sentence from MLD_DETECTION, never from a literal", () => {
    const { from } = deckAnalysisCopy.detection.landDenial;
    expect(from).toContain(MLD_DETECTION.basis);
    expect(from).toContain(String(MLD_DETECTION.sources));
    // The figure the drop got wrong, stated as a property rather than as "22 of 24".
    expect(from).not.toContain("23 of");
  });

  it("names EVERY known miss, not the first one", () => {
    const { misses } = deckAnalysisCopy.detection.landDenial;
    for (const card of MLD_DETECTION.knownMisses) expect(misses).toContain(card);
    // `basis` says two and the drop named one, leaving the other unaccounted for in the only
    // place a reader would look.
    expect(MLD_DETECTION.knownMisses.length).toBeGreaterThan(1);
  });

  it("builds the extra-turns and combo sentences from their constants too", () => {
    expect(deckAnalysisCopy.detection.extraTurns.from).toContain(EXTRA_TURN_DETECTION.basis);
    expect(deckAnalysisCopy.detection.combos.from).toContain(COMBO_DETECTION.basis);
  });

  it("gives game changers no misses line", () => {
    // The contrast is what makes the other three legible: one flat statement beside three
    // caveats tells a reader which figure is exact without saying so.
    expect(deckAnalysisCopy.detection.gameChangers).not.toHaveProperty("misses");
  });

  it("says why the panel exists", () => {
    // Without it the four rows read as trivia.
    expect(deckAnalysisCopy.detection.why).toContain("disagrees");
  });
});
