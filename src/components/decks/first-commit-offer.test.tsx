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

  // The note is cut, and this asserts the offer is the control and nothing else:
  // it was one sentence of mono beside the button, and on the desktop spine it
  // was the widest thing in the band's narrowest row. What a commit does is the
  // review page's job, which the control links to.
  it("draws the control alone, with no note beside it", () => {
    const { container } = render(<FirstCommitOffer deckId="d" />);
    expect(container.querySelectorAll("a")).toHaveLength(1);
    expect(container.textContent).toBe(copy.firstCommitCta);
  });
});
