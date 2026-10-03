import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DeckIntentLine } from "./deck-intent-line";

describe("DeckIntentLine (STATES-deck-description.md §2) — read-only tagline", () => {
  it("draws the sentence alone, with no row at all when null", () => {
    const { rerender } = render(<DeckIntentLine intent="Grind out a long game." width="desktop" />);
    expect(screen.getByText("Grind out a long game.")).toBeTruthy();
    rerender(<DeckIntentLine intent={null} width="desktop" />);
    expect(screen.queryByText("Grind out a long game.")).toBeNull();
  });

  it("carries no edit control, disc or chip", () => {
    render(<DeckIntentLine intent="Win late with fliers." width="desktop" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText(/from the build/i)).toBeNull();
  });

  it("clamps to two lines on a phone and never clamps on desktop", () => {
    render(<DeckIntentLine intent="A deck about flying creatures and keeping the board clear." width="phone" />);
    const phoneLine = screen.getByText(/A deck about flying/);
    expect(phoneLine.className).toContain("line-clamp-2");
    const { container } = render(<DeckIntentLine intent="A deck about flying creatures and keeping the board clear." width="desktop" />);
    const desktopLine = container.querySelector("[data-deck-intent]");
    expect(desktopLine?.className).not.toContain("line-clamp");
  });
});
