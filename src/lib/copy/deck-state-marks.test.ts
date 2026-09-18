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

  it("keeps the mark's accessible name distinct from the banner's heading", () => {
    expect(deckStateMarksCopy.markAria).not.toBe(deckVersioningCopy.pending.label);
    expect(deckStateMarksCopy.markAria).toBe("pending changes, not yet a version");
  });

  it("words the phase the same way in the facet and on the deck page", () => {
    expect(deckStateMarksCopy.filter.notCommitted).toBe(deckStateMarksCopy.phase.notCommitted);
  });

  it("never spends the retired review-page tag", () => {
    const every = JSON.stringify(deckStateMarksCopy);
    expect(every).not.toContain("deck in draft");
  });
});
