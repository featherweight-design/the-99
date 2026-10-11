import { describe, expect, it } from "vitest";

import { isInfiniteOrGameEnding, isMandatoryLoop, producesInfiniteTurns } from "./combo-features";
import { GAME_ENDING_FEATURES, INFINITE_TURN_FEATURES } from "./produces-kinds.generated";

describe("isInfiniteOrGameEnding", () => {
  it("claims the Infinite family live, without regeneration", () => {
    expect(isInfiniteOrGameEnding(["Infinite mana of any color"])).toBe(true);
    // A name upstream has not shipped yet: the regex must still claim it, because a new
    // member of this family is unbounded by its own name and missing it under-slots a deck.
    expect(isInfiniteOrGameEnding(["Infinite widgets nobody has invented"])).toBe(true);
  });

  it("claims a generated game-ending name", () => {
    expect(isInfiniteOrGameEnding(["Win the game"])).toBe(true);
    expect(isInfiniteOrGameEnding(["Target opponent loses the game"])).toBe(true);
  });

  // §5.2's synergy case: two cards producing a bounded result is not a bracket concern, and
  // slotting a deck to 4 over one would be a wrong verdict at a table.
  it("refuses a bounded product", () => {
    expect(isInfiniteOrGameEnding(["Two 1/1 tokens"])).toBe(false);
    expect(isInfiniteOrGameEnding(["Draw three cards", "Gain 5 life"])).toBe(false);
  });

  it("refuses an empty produces list", () => {
    expect(isInfiniteOrGameEnding([])).toBe(false);
  });

  // Structural: the function takes feature names ONLY. The bulk's own first record produces
  // "Infinite mana of colors among permanents you control" and carries bracketTag E —
  // Spellbook's gentlest tag — so a rule with access to the tag could read it as harmless.
  it("takes no bracketTag argument at all", () => {
    expect(isInfiniteOrGameEnding.length).toBe(1);
  });

  // The two entries the first generation wrongly admitted. A bare /loses? the game/ matched
  // both; they are defensive effects, and flagging them would push a deck UP a bracket for
  // surviving. They must not be in the generated list at all.
  it("does not treat a can't-lose effect as game-ending", () => {
    const negated = [
      "You are unable to lose the game due to damage or lifeloss",
      "You can't lose the game due to having 0 or less life",
    ];
    for (const n of negated) {
      expect(GAME_ENDING_FEATURES).not.toContain(n);
      expect(isInfiniteOrGameEnding([n])).toBe(false);
    }
  });
});

describe("producesInfiniteTurns", () => {
  // R3's measurable half: an assembled combo producing infinite turns is a loop on upstream's
  // own data, so it violates WotC's B2/B3 "chained or looped" clause with no authored rule.
  it("claims every infinite-turns name the live vocabulary carries", () => {
    expect(INFINITE_TURN_FEATURES.length).toBeGreaterThan(0);
    for (const f of INFINITE_TURN_FEATURES) expect(producesInfiniteTurns([f])).toBe(true);
  });

  // The test above MEASURES NOTHING about the allowlist: all three generated entries begin
  // "Infinite turns", so the regex alone satisfies every one and the
  // `INFINITE_TURN_FEATURES.includes(f)` half could be deleted with the suite still green.
  // The allowlist exists for a name that does NOT start that way — upstream could ship
  // "Take infinite turns" or "Extra turns, arbitrarily many" — so it is exercised here with a
  // name the regex cannot reach, injected into the same list the runtime reads.
  it("claims an allowlisted name the regex cannot reach", () => {
    const offPattern = "Take arbitrarily many extra turns";
    expect(/^infinite (extra )?turns?\b/i.test(offPattern)).toBe(false);
    const list = INFINITE_TURN_FEATURES as unknown as string[];
    list.push(offPattern);
    try {
      expect(producesInfiniteTurns([offPattern])).toBe(true);
    } finally {
      list.pop();
    }
  });

  it("claims the bare upstream name, confirmed live", () => {
    expect(producesInfiniteTurns(["Infinite turns"])).toBe(true);
  });

  // The distinction the B3 rule rides on: a generic infinite WIDENS the range to [3,4]; only
  // a turn loop violates the clause outright. Conflating them over-slots every combo deck.
  it("refuses every other Infinite family member", () => {
    for (const f of ["Infinite mana", "Infinite damage", "Infinite tokens", "Infinite mill"]) {
      expect(producesInfiniteTurns([f])).toBe(false);
      expect(isInfiniteOrGameEnding([f])).toBe(true);
    }
  });

  it("refuses a game-ending name that is not a turn loop", () => {
    expect(producesInfiniteTurns(["Win the game"])).toBe(false);
  });
});

describe("isMandatoryLoop", () => {
  it("is Spellbook's \"Draw the game\" feature and nothing else", () => {
    // 2062-3356, Marauding Raptor + Polyraptor: every trigger is mandatory.
    expect(isMandatoryLoop(["Draw the game", "Infinite creature tokens"])).toBe(true);
    // 2259-3356, Forerunner of the Empire + Polyraptor: a "may" ends it on request.
    expect(isMandatoryLoop(["Infinite creature tokens", "Infinite damage to all creatures"])).toBe(false);
    expect(isMandatoryLoop([])).toBe(false);
  });
});
