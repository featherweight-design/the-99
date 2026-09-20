import { describe, expect, it } from "vitest";

import {
  countCondition,
  identityCondition,
  isCountCondition,
  MIN_COMMANDERS_PER_CONDITION,
} from "./condition";

describe("identityCondition", () => {
  it("is 'C' for colourless", () => {
    expect(identityCondition([])).toBe("C");
  });

  it("is the single letter for a mono identity", () => {
    for (const c of ["W", "U", "B", "R", "G"]) expect(identityCondition([c])).toBe(c);
  });

  // ALPHABETICAL, not WUBRG — the spelling `measure-staples.mts` derived the ratified floors
  // under, via `array_to_string` over Scryfall's own alphabetically-stored arrays. Any other
  // choice silently re-keys every published figure.
  it("sorts letters alphabetically", () => {
    expect(identityCondition(["U", "W"])).toBe("UW");
    expect(identityCondition(["G", "B"])).toBe("BG");
    expect(identityCondition(["R", "W"])).toBe("RW");
  });

  // The whole reason this is one function: these are persisted keys, and the derivation and
  // the reader must agree by construction. Input order must not reach the key.
  it("gives the same key whatever order the colours arrive in", () => {
    expect(identityCondition(["W", "U"])).toBe(identityCondition(["U", "W"]));
    expect(identityCondition(["G", "R", "U"])).toBe(identityCondition(["U", "G", "R"]));
  });

  it("does not mutate its input", () => {
    const input = ["U", "W"];
    identityCondition(input);
    expect(input).toEqual(["U", "W"]);
  });

  it("handles a five-colour identity", () => {
    expect(identityCondition(["W", "U", "B", "R", "G"])).toBe("BGRUW");
  });
});

describe("countCondition", () => {
  it("names the colour count", () => {
    expect(countCondition(3)).toBe("count:3");
  });

  // The two vocabularies must never collide: a reader cannot tell a bucket it can trust from
  // a fallback if the keys are ambiguous.
  it("is distinguishable from every identity key", () => {
    expect(isCountCondition(countCondition(3))).toBe(true);
    for (const c of ["C", "W", "UW", "BGRUW"]) expect(isCountCondition(c)).toBe(false);
  });
});

describe("MIN_COMMANDERS_PER_CONDITION", () => {
  it("is the stated bar", () => {
    expect(MIN_COMMANDERS_PER_CONDITION).toBe(100);
  });
});
