import { describe, expect, it } from "vitest";
import { cardAssignmentsCopy } from "./card-assignments";

// The import-issues line promises that a deck still waiting on an unmatched or unparsed name is
// marked below. It says what the deck does with the card (counts it as a card to buy), not the
// claim model's verb for it.
describe("the import-issues copy", () => {
  const c = cardAssignmentsCopy.summary;

  it("names the consequence in both forms", () => {
    expect(c.issues(2, 1)).toContain("Any deck still counting one of those as a card to buy is marked below.");
    expect(c.issuesUnmatchedOnly(1)).toContain("Any deck still counting that card as a card to buy is marked below.");
    expect(c.issuesUnmatchedOnly(3)).toContain("Any deck still counting one of those as a card to buy is marked below.");
  });

  it("says what stops when the cards arrive", () => {
    expect(c.sectionClearedNote).toBe(
      "These arrived, so the decks that counted them as cards to buy stop counting them.",
    );
  });

  it("never uses the billing verb", () => {
    for (const s of [c.issues(2, 1), c.issuesUnmatchedOnly(1), c.issuesUnmatchedOnly(3), c.sectionClearedNote]) {
      expect(s.toLowerCase()).not.toContain("billing");
    }
  });
});
