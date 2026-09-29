import { describe, expect, it } from "vitest";

import { COMBO_DETECTION, EXTRA_TURN_DETECTION, MLD_DETECTION } from "../bracket/rules";
import {
  BRACKET_NAMES,
  bracketFace,
  bracketPhrase,
  deckAnalysisCopy,
  nameList,
  numberWord,
  ordinal,
} from "./deck-analysis";

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
    // EVERY METHOD BY NAME, and the fabricated phrase forbidden.
    //
    // This assertion used to read `toContain(`${MLD_DETECTION.sources} community-maintained`)`,
    // and it was written carefully: its own comment explains that `toContain("2")` would be
    // satisfied by "22 of 24" alone, so it pinned the surrounding phrase instead. It pinned a
    // FALSE phrase. There are no two community-maintained lists — there is Spellbook's estimate
    // and there is us — so the test held a claim we could not support firmly in place, in the
    // file written to stop tests that measure nothing.
    //
    // A careful test on a false premise is not a weak test. It is a strong one pointed the
    // wrong way, and nothing about its construction would ever have revealed that.
    for (const method of MLD_DETECTION.methods) expect(from).toContain(method);
    expect(from).not.toContain("community-maintained");
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
    // The contrast is what makes the other four legible: one flat statement beside four
    // caveats tells a reader which figure is exact without saying so.
    expect(deckAnalysisCopy.detection.gameChangers).not.toHaveProperty("misses");
  });

  it("says why the panel exists", () => {
    // Without it the five rows read as trivia.
    expect(deckAnalysisCopy.detection.why).toContain("disagrees");
  });
});

describe("the shared helpers", () => {
  it("joins names without an Oxford comma, because these are read aloud", () => {
    expect(nameList([])).toBe("");
    expect(nameList(["A"])).toBe("A");
    expect(nameList(["A", "B"])).toBe("A and B");
    expect(nameList(["A", "B", "C"])).toBe("A, B and C");
  });

  it("words a small count and gives up past twelve", () => {
    expect(numberWord(0)).toBe("zero");
    expect(numberWord(1)).toBe("one");
    expect(numberWord(12)).toBe("twelve");
    // The point where a word stops being easier to read than a digit.
    expect(numberWord(13)).toBe("13");
    expect(numberWord(99)).toBe("99");
  });

  it("ordinals the teens correctly, which is the case naive versions get wrong", () => {
    expect(ordinal(1)).toBe("1st");
    expect(ordinal(2)).toBe("2nd");
    expect(ordinal(3)).toBe("3rd");
    expect(ordinal(4)).toBe("4th");
    // 11, 12 and 13 end in 1, 2 and 3 and still take `th` — and a deck can hold eleven
    // game changers, so this is reachable rather than defensive.
    expect(ordinal(11)).toBe("11th");
    expect(ordinal(12)).toBe("12th");
    expect(ordinal(13)).toBe("13th");
    expect(ordinal(21)).toBe("21st");
    expect(ordinal(112)).toBe("112th");
  });
});

describe("the population line", () => {
  // ONE SOURCE, CHECKED. `lineParts` exists only so the two figures can carry the canvas's
  // emphasis; it is the same sentence, and two hand-kept copies of one sentence drift. The copy
  // guard reads `line`, so a drifted `lineParts` would be the half nothing looks at.
  it("splits into parts that rejoin as the sentence exactly", () => {
    const args = [9730, "Yuriko, the Tiger's Shadow", 3884, "Optimized"] as const;
    expect(deckAnalysisCopy.population.lineParts(...args).map((p) => p.text).join("")).toBe(
      deckAnalysisCopy.population.line(...args),
    );
  });

  it("emphasises the two figures and nothing else", () => {
    const parts = deckAnalysisCopy.population.lineParts(9730, "Yuriko", 3884, "Optimized");
    expect(parts.filter((p) => p.strong).map((p) => p.text)).toEqual(["9,730", "3,884"]);
  });

  // ABSENT NAMES THE COMMANDER. A zero reads as "nobody plays this" and is a different claim;
  // 27 commanders have no counts at all.
  it("names the commander in the absent reading", () => {
    expect(deckAnalysisCopy.population.absent("Yuriko")).toBe(
      "EDHREC has no declared brackets for Yuriko.",
    );
  });
});

describe("the verdict's ruled-out clause", () => {
  // TWO READINGS RATHER THAN A TEMPLATE WITH A ZERO IN IT: every rule that can rule out brackets
  // 1 and 2 caps at zero, so "allows only zero" would be the common case and nobody says it.
  it("says none at all at a zero limit and names the figure otherwise", () => {
    expect(deckAnalysisCopy.verdict.ruledOutAllowance("Exhibition", 0)).toBe(
      "and Exhibition allows none at all",
    );
    expect(deckAnalysisCopy.verdict.ruledOutAllowance("Upgraded", 3)).toBe(
      "and Upgraded allows only three",
    );
  });

  it("counts the fact in words and takes the noun it is given", () => {
    expect(deckAnalysisCopy.verdict.ruledOutFact(1, "extra-turn card")).toBe("one extra-turn card");
    expect(deckAnalysisCopy.verdict.ruledOutFact(2, "game changers")).toBe("two game changers");
  });
});

describe("the climb's drop sentence", () => {
  // ONE SOURCE, CHECKED, exactly as the population line is. The parts exist only so the thing to
  // CUT can carry the canvas's emphasis; the copy guard reads the flat sentences, so a drifted
  // parts list would be the half nothing looks at.
  const c = deckAnalysisCopy.climb;
  it("splits into parts that rejoin as each sentence exactly", () => {
    expect(c.dropParts.named("Time Warp", "Exhibition").map((p) => p.text).join("")).toBe(
      c.dropNamed("Time Warp", "Exhibition"),
    );
    expect(c.dropParts.count(2, "game changers", "Core").map((p) => p.text).join("")).toBe(
      c.dropCount(2, "game changers", "Core"),
    );
    expect(
      c.dropParts.countAllowing(1, "game changer", "Upgraded", 3).map((p) => p.text).join(""),
    ).toBe(c.dropCountAllowing(1, "game changer", "Upgraded", 3));
  });

  it("emphasises the cards or the count and nothing else", () => {
    expect(c.dropParts.named("Time Warp", "Exhibition").filter((p) => p.strong).map((p) => p.text))
      .toEqual(["Time Warp"]);
    expect(c.dropParts.count(2, "game changers", "Core").filter((p) => p.strong).map((p) => p.text))
      .toEqual(["two game changers"]);
  });
});
