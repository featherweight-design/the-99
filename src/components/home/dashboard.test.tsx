import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Dashboard } from "./dashboard";

// `inUse` is a Map and `ready` a slice rather than a list, because the sections
// that read them (tasks 15–17) take exactly what the loader assembled once.
const BASE = {
  stats: { totalCards: 1284, uniqueCards: 900 },
  lastUpdated: new Date("2026-09-05T00:00:00Z"),
  ready: { shown: [], moreCount: 0, floor: null },
  inUse: new Map(),
  decks: [],
  commitments: { inUse: 312, overCommitted: 3 },
  shopping: { byDeck: new Map(), total: { copies: 18, cents: 9480, pricedCopies: 18 } },
  now: "2026-09-07T12:00:00.000Z",
};

describe("Dashboard header", () => {
  it("greets without a name and prints both kicker figures", () => {
    render(<Dashboard {...BASE} />);
    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(screen.getByText("1,284 cards · read 2 days ago")).toBeInTheDocument();
  });

  it("still prints a kicker when the collection has never been dated", () => {
    render(<Dashboard {...BASE} lastUpdated={null} />);
    expect(screen.getByText(/1,284 cards/)).toBeInTheDocument();
  });

  it("sends Update collection to the replace flow", () => {
    render(<Dashboard {...BASE} />);
    expect(screen.getByRole("link", { name: "Update collection" })).toHaveAttribute(
      "href",
      "/collection/replace",
    );
  });
});
