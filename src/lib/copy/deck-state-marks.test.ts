import { describe, expect, it } from "vitest";
import { deckStateMarksCopy } from "./deck-state-marks";
import { deckVersioningCopy } from "./deck-versioning";

describe("deckStateMarksCopy", () => {
  it("states the change figure in the banner's own words, not a second phrasing", () => {
    // Not `toBe` on a string: the point is that this IS the banner's function,
    // so a change to the banner's wording cannot leave the tile behind.
    expect(deckStateMarksCopy.detail).toBe(deckVersioningCopy.pending.since);
    expect(deckStateMarksCopy.detail(36, 2)).toBe("36 changes since v2");
    expect(deckStateMarksCopy.detail(1, 4)).toBe("1 change since v4");
  });

  it("holds one facet row, the phase having become a status", () => {
    expect(Object.keys(deckStateMarksCopy.filter)).toEqual(["heading", "hasPending"]);
    expect(deckStateMarksCopy.filter.hasPending).toBe("Edited since last version");
  });

  // Everything the marks needed is gone with them: a mark had no word, so each
  // accessible name existed to supply one. A status word needs none — `cardAria`
  // already announces it in position three.
  it("keeps no accessible names, and no phase word of its own", () => {
    const every = JSON.stringify(deckStateMarksCopy);
    for (const gone of ["markAria", "cardAriaSuffix", "Not committed yet", "pending changes, not yet"]) {
      expect(every).not.toContain(gone);
    }
  });
});
