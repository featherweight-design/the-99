import { describe, expect, it } from "vitest";
import { MAX_DECK_SCOPE, sanitizeDeckScope } from "./deck-scope-param";

/**
 * The guard the ACTION calls, not a copy of it. A test that restates the expression agrees
 * with itself and would pass over a server action that had stopped calling anything.
 */
const ID = "11111111-1111-1111-1111-111111111111";

describe("sanitizeDeckScope", () => {
  it("keeps the uuids and drops everything else", () => {
    expect(sanitizeDeckScope([ID, "not-a-uuid", 7, null, ID])).toEqual([ID, ID]);
  });

  // A NON-ARRAY IS THE ONE THAT THROWS rather than misbehaving, which is why the shape is
  // checked before any element is looked at.
  it("answers undefined for anything that is not an array", () => {
    for (const v of [undefined, null, "abc", 7, {}]) {
      expect(sanitizeDeckScope(v)).toBeUndefined();
    }
  });

  // CAPPED. Nothing legitimate approaches this — a deck is 100 cards plus two commanders —
  // and the cap is what makes the cost finite rather than the caller's to choose.
  it("caps a list far beyond any real deck", () => {
    expect(sanitizeDeckScope(Array.from({ length: 5000 }, () => ID))).toHaveLength(
      MAX_DECK_SCOPE,
    );
  });

  // THE CAP BOUNDS THE WORK, not the yield. Applied after the filter, a huge array of junk is
  // still traversed and regex-tested in full before the limit bites — so the caller still
  // chooses the work, which is what the cap exists to stop. A prefix of junk therefore yields
  // fewer than the cap, and that is the right way round.
  it("bounds the work rather than the answer", () => {
    const junkThenReal = [...Array.from({ length: MAX_DECK_SCOPE }, () => "x"), ID];
    expect(sanitizeDeckScope(junkThenReal)).toEqual([]);
  });
});
