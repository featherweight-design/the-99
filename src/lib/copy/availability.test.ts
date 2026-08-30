import { describe, expect, it } from "vitest";
import { availabilityCopy } from "./availability";

describe("availabilityCopy", () => {
  // The free state must stay unnameable. If someone adds a `free:` key here,
  // this fails and they have to justify it.
  it("has no string for the free state", () => {
    expect(availabilityCopy.marker).not.toHaveProperty("free");
    expect(availabilityCopy.marker).not.toHaveProperty("freeAria");
  });

  it("names the claiming deck only in the singular form", () => {
    expect(availabilityCopy.marker.hardIn("Atraxa")).toBe("0 free — in Atraxa");
    expect(availabilityCopy.marker.hardMulti(3)).toBe(
      "0 free — across 3 decks",
    );
  });

  // Over-commitment is a count problem, not a location problem.
  it("never names a deck in the over state", () => {
    expect(availabilityCopy.marker.over(2)).not.toMatch(/in |across /);
    expect(availabilityCopy.marker.overWithDemand(2, 3)).not.toMatch(/ in /);
  });

  it("singularises the soft marker", () => {
    expect(availabilityCopy.marker.soft(1)).toBe("1 in a brew");
    expect(availabilityCopy.marker.soft(2)).toBe("2 in a brew");
  });

  it("banned vocabulary does not appear anywhere", () => {
    expect(JSON.stringify(availabilityCopy)).not.toMatch(/deck tax/i);
  });

  // The over-committed line renders in two places. If they ever stop being the
  // same function, one surface will quietly say something the other does not.
  it("uses one over-committed heading in both of its homes", () => {
    expect(availabilityCopy.deckRollup.overHeading).toBe(
      availabilityCopy.deckSummary.heading,
    );
    expect(availabilityCopy.deckSummary.heading(1)).toBe(
      "1 card here is spoken for twice",
    );
    expect(availabilityCopy.deckSummary.heading(4)).toBe(
      "4 cards here are spoken for twice",
    );
  });

  // The quick-add row's accessible name has exactly one home, in
  // decks-builder.ts. A second copy here is how the two drift apart.
  it("does not carry a second quick-add rowAria", () => {
    expect(availabilityCopy).not.toHaveProperty("rowAria");
  });
});
