import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GuidedBanner } from "./guided-banner";

// The first-run banner is only reachable behind auth with a fresh collection,
// so the richness line is pinned here. Both breakpoints render it, hence the
// getAllByText — mobile ribbon and desktop banner are separate subtrees.

describe("GuidedBanner", () => {
  it("renders the richness first-run line at both breakpoints", () => {
    render(<GuidedBanner uniqueCardsRead={1418} candidateCount={24} />);
    expect(
      screen.getAllByText("1,418 cards read. 24 can lead. I ranked them — you're welcome."),
    ).toHaveLength(2);
  });

  it("no longer renders the v1 body copy it replaced", () => {
    render(<GuidedBanner uniqueCardsRead={1418} candidateCount={24} />);
    expect(screen.queryByText(/legal commander/)).toBeNull();
  });
});
