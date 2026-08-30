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

  // One deck can be the whole demand: "any number" cards (Relentless Rats,
  // Nazgûl) let a single list claim nine copies of something you own four of.
  // Every count string that can reach 1 has to survive it.
  it("reads correctly when exactly one deck is the whole demand", () => {
    expect(availabilityCopy.marker.tileOver(1)).toBe("1 deck wants it");
    expect(availabilityCopy.marker.overWithDemand(5, 1)).toBe(
      "short 5 — 1 deck wants it",
    );
    expect(availabilityCopy.marker.overAria(5, 1)).toBe(
      "1 of your finished lists includes this card and you own 5 too few",
    );
    expect(availabilityCopy.deckSummary.ariaLabel(1)).toBe(
      "1 card in this deck is over-committed",
    );
  });

  it("agrees its verbs with the count on the receipt and the disclosure", () => {
    expect(availabilityCopy.receipt.fit(1)).toBe("1 of your cards fits");
    expect(availabilityCopy.receipt.fitFree(1)).toBe("1 of your cards is free");
    expect(availabilityCopy.detail.disclosureAria(1)).toBe(
      "Show which 1 card is in use",
    );
    expect(availabilityCopy.ranking.announce("free", 1)).toBe(
      "Re-ranked by what’s free · 1 commander",
    );
  });

  // No count string may render a bare plural noun against a count of 1.
  it("never says a plural noun for a single thing", () => {
    const singulars = [
      availabilityCopy.marker.tileOver(1),
      availabilityCopy.marker.hardMulti(1),
      availabilityCopy.marker.overWithDemand(1, 1),
      availabilityCopy.receipt.fit(1),
      availabilityCopy.receipt.fitFree(1),
      availabilityCopy.detail.disclosureAria(1),
      availabilityCopy.detail.expandedFor(1),
      availabilityCopy.detail.announceExpanded(1),
      availabilityCopy.detail.announceCollapsed(1),
      availabilityCopy.deckSummary.ariaLabel(1),
      availabilityCopy.deckSummary.body("Nazgûl", 1, 1),
      availabilityCopy.ranking.announce("all", 1),
      availabilityCopy.deckRollup.softHeading(1),
    ];
    for (const s of singulars) {
      expect(s, s).not.toMatch(/\b1 (cards|decks|copies|lists|commanders)\b/);
    }
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
