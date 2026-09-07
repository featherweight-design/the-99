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

// Same reason as the hero: the count reaches for the ranked list. Its own file
// tests the figure; this file tests where the figure is placed.
vi.mock("./commander-count", () => ({
  CommanderCount: () => <>24</>,
  CommanderCountFallback: () => <>—</>,
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

// #14. The commanders figure was the one dashboard stat the appshell table asked
// for and #5 could not supply, because computing it meant running the scorer in
// the page header. Persisted scores made it cheap, so it streams instead.
describe("Dashboard commanders stat", () => {
  it("names the stat for the surface it links through to", () => {
    renderDashboard();
    // "Commanders", not the table's "Commanders buildable": /commanders reports
    // the same figure as "commanders you own", and there is no buildable
    // threshold in the app for the other word to mean.
    expect(screen.getByText("Commanders")).toBeInTheDocument();
    expect(screen.queryByText(/buildable/i)).toBeNull();
  });

  it("carries the count in both stats-line variants and the stats panel", () => {
    renderDashboard();
    // Both lines ship on every render and are hidden by breakpoint, not by a
    // conditional, so both must carry the stat or one breakpoint loses it.
    expect(screen.getByText("1,200 cards · 24 commanders · 0 decks")).toBeInTheDocument();
    expect(
      screen.getByText("1,200 cards · 800 unique · 24 commanders · 0 decks"),
    ).toBeInTheDocument();
    // The panel row renders it as a value in its own right.
    expect(screen.getByText("24")).toBeInTheDocument();
  });
});
