import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { FirstCommitOffer } from "./first-commit-offer";

const copy = deckVersioningCopy.pending;

describe("FirstCommitOffer", () => {
  it("offers the first commit as a link to the review page's sheet", () => {
    render(<FirstCommitOffer deckId="d" />);
    expect(
      screen.getByRole("link", { name: copy.firstCommitCta }),
    ).toHaveProperty("href", expect.stringContaining("/decks/d/changes?commit=1"));
  });

  // The note is the whole answer to "what does this do to my deck", and a player
  // who cannot see it is being asked to make a claim permanent blind.
  it("states what the commit does and does not change", () => {
    render(<FirstCommitOffer deckId="d" />);
    expect(screen.getByText(copy.firstCommitNote)).toBeTruthy();
  });
});
