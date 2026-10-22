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
      screen.getAllByText(
        "1,418 cards read. 24 can lead. I ranked them. You’re welcome. Pick a commander to build your first 99.",
      ),
    ).toHaveLength(2);
  });

  // The banner is guided setup step 2 of 3. The mock wrote its line for a crumb
  // row, so it carries no instruction; the v1 body this replaced did. Keeping
  // the directive is what stops step 2 having nothing to act on.
  it("still tells a first-time user what to do next", () => {
    render(<GuidedBanner uniqueCardsRead={1418} candidateCount={24} />);
    expect(screen.getAllByText(/Pick a commander to build your first 99\./)).toHaveLength(2);
  });

  it("no longer renders the v1 body copy it replaced", () => {
    render(<GuidedBanner uniqueCardsRead={1418} candidateCount={24} />);
    expect(screen.queryByText(/legal commander/)).toBeNull();
  });

  // Discovery R3 E2 (G1): the door at the end of the banner's line at 1280, its own line at 390.
  it("ends the line in Help me choose's door at both widths with the switch on", () => {
    render(<GuidedBanner uniqueCardsRead={1418} candidateCount={24} helpMeChoose />);
    const links = screen.getAllByRole("link", { name: "Help me choose →" });
    expect(links).toHaveLength(2);
    for (const a of links) expect(a).toHaveAttribute("href", "/commanders/choose");
    expect(screen.getByTestId("guided-choose-phone")).toHaveTextContent("Not sure which? Help me choose →");
    expect(links[0].className.split(/\s+/)).toEqual(expect.arrayContaining(["inline-flex", "min-h-[32px]"]));
    expect(links[1].className).not.toContain("min-h-[32px]");
    // At 1280 it closes the body paragraph itself, after the directive.
    const desk = screen.getByTestId("guided-choose-desk");
    expect(desk.parentElement!.tagName).toBe("P");
    expect(desk.parentElement!.textContent).toBe(
      "1,418 cards read. 24 can lead. I ranked them. You’re welcome. Pick a commander to build your first 99. Not sure which? Help me choose →",
    );
  });

  it("draws no door with the switch off", () => {
    render(<GuidedBanner uniqueCardsRead={1418} candidateCount={24} helpMeChoose={false} />);
    expect(screen.queryByText(/Not sure which/)).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
