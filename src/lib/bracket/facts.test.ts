import { describe, expect, it } from "vitest";

import { factsFor, factsFromCandidate } from "./facts";
import type { CardBracketFlags } from "./flags-read";

/** The empty flag row, stated here: `flags-read` imports the database client at module scope. */
const NO_BRACKET_FLAGS: CardBracketFlags = {
  massLandDenial: false,
  massLandDenialSources: [],
  extraTurn: false,
  extraTurnSources: [],
  tutor: false,
};

describe("factsFor", () => {
  it("adds the tutor last, after the three bracket facts", () => {
    expect(
      factsFor(true, { ...NO_BRACKET_FLAGS, massLandDenial: true, extraTurn: true, tutor: true }),
    ).toEqual(["gameChanger", "massLandDenial", "extraTurns", "tutor"]);
  });

  it("marks a card that is only a tutor", () => {
    expect(factsFor(false, { ...NO_BRACKET_FLAGS, tutor: true })).toEqual(["tutor"]);
  });

  it("returns undefined, never [], for a card carrying nothing", () => {
    expect(factsFor(false, NO_BRACKET_FLAGS)).toBeUndefined();
    expect(factsFor(false, undefined)).toBeUndefined();
  });
});

describe("factsFromCandidate", () => {
  it("carries the candidate's tutor reading into the same order", () => {
    expect(
      factsFromCandidate({ gameChanger: true, massLandDenial: false, extraTurn: false, tutor: true }),
    ).toEqual(["gameChanger", "tutor"]);
  });
});
