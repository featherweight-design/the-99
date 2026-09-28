import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DecksZero, DecksZeroActions } from "./decks-zero";

describe("DecksZeroActions", () => {
  it("draws the buildable line only when there is a figure", () => {
    const { rerender } = render(<DecksZeroActions buildable={230} cards={3250} />);
    expect(screen.getByText("230 commanders buildable from 3,250 cards")).toBeInTheDocument();
    rerender(<DecksZeroActions />);
    expect(screen.queryByText(/commanders buildable/)).toBeNull();
  });

  it("is what /decks' zero state renders, so the two surfaces cannot drift", () => {
    render(<DecksZero buildable={230} cards={3250} />);
    expect(screen.getByRole("link", { name: "Browse commanders" })).toHaveAttribute("href", "/commanders");
    expect(screen.getByRole("link", { name: "Import a deck" })).toHaveAttribute("href", "/decks/import");
    // The true count, not the retired cap of nine.
    expect(screen.getByText("230 commanders buildable from 3,250 cards")).toBeInTheDocument();
  });
});
