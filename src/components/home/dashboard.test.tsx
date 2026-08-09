import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Dashboard } from "./dashboard";

// The hero is an async server component that reaches for the ranked list. This
// file is about the labels around it, so it stands in as a marker and the hero's
// own file tests its contents.
vi.mock("./hero-commander", () => ({
  HeroCommander: () => <div data-testid="hero" />,
  HeroCommanderSkeleton: () => <div />,
}));

function renderDashboard() {
  return render(
    <Dashboard
      userId="user_1"
      stats={{ totalCards: 1200, uniqueCards: 800 }}
      decks={[]}
      name="Hugh"
    />,
  );
}

describe("Dashboard section labels", () => {
  // The hero renders a commander's EDHREC coverage and links to
  // /commanders/:slug, so "Most complete deck" named the wrong noun over the
  // wrong figure. A reader took its `3/259` for a deck's card count and read it
  // against a deck list saying 0/99.
  it("labels the hero for the commander it actually renders", () => {
    renderDashboard();
    expect(screen.getByText("Recommended commander")).toBeInTheDocument();
    expect(screen.queryByText(/most complete deck/i)).toBeNull();
  });

  // "Recommended" used to sit *below* the hero with the ranked list's link, and
  // nothing between it and the decks grid. It headed nothing at all; the hero
  // above it was the recommendation it was looking for.
  it("carries one label row and no header without content under it", () => {
    renderDashboard();
    expect(screen.getAllByRole("link", { name: "All commanders →" })).toHaveLength(1);
    expect(screen.queryByText("Recommended", { exact: true })).toBeNull();
  });
});
