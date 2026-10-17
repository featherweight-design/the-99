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
    // Draws whatever figure it is handed. That /decks hands it the TRUE count rather than
    // the retired cap of nine is a fact about the page's loader, proved by probe:onboarding.
    expect(screen.getByText("230 commanders buildable from 3,250 cards")).toBeInTheDocument();
  });

  // Discovery R3 E1: one quiet line, the shipped question and Help me choose's shipped press.
  it("draws Help me choose's door under everything with the switch on", () => {
    render(<DecksZeroActions buildable={230} cards={3250} helpMeChoose />);
    const line = screen.getByTestId("decks-zero-choose");
    expect(line).toHaveTextContent("Not sure what to build? Help me choose →");
    expect(screen.getByRole("link", { name: "Help me choose →" })).toHaveAttribute("href", "/decks/new/choose");
    // Under the buttons and the buildable line, never between them.
    const buildable = screen.getByText("230 commanders buildable from 3,250 cards");
    expect(buildable.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // A quiet line, never a button: the press itself carries the 32px hit on a phone, and not on desktop.
    expect(line.className).toContain("text-[color:var(--fg-muted)]");
    const press = screen.getByRole("link", { name: "Help me choose →" });
    expect(press.className.split(/\s+/)).toEqual(expect.arrayContaining(["inline-flex", "min-h-[32px]", "sm:inline", "sm:min-h-0"]));
  });

  it("is exactly as shipped with the switch off", () => {
    const { container, rerender } = render(<DecksZeroActions buildable={230} cards={3250} />);
    const shipped = container.innerHTML;
    expect(screen.queryByText(/Not sure what to build/)).toBeNull();
    rerender(<DecksZeroActions buildable={230} cards={3250} helpMeChoose={false} />);
    expect(container.innerHTML).toBe(shipped);
  });

  it("is handed the switch by /decks' zero state", () => {
    const { rerender } = render(<DecksZero buildable={230} cards={3250} helpMeChoose />);
    expect(screen.getByRole("link", { name: "Help me choose →" })).toBeInTheDocument();
    rerender(<DecksZero buildable={230} cards={3250} />);
    expect(screen.queryByRole("link", { name: "Help me choose →" })).toBeNull();
  });
});
