import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { deleteDeck, renameDeck } = vi.hoisted(() => ({
  deleteDeck: vi.fn(),
  renameDeck: vi.fn(),
}));
vi.mock("../../app/decks/actions", () => ({ deleteDeck, renameDeck }));

const { DeckCardOverflow } = await import("./deck-card-overflow");

const trigger = () => screen.getByRole("button", { name: "Deck options" });

describe("DeckCardOverflow", () => {
  // Generic, not "menu": that value promises menuitem semantics this panel does
  // not implement, and its rename mode is a form rather than a list of actions.
  it("declares a generic popup rather than a menu", () => {
    render(<DeckCardOverflow deckId="d1" deckName="Atraxa" built={99} />);
    expect(trigger()).toHaveAttribute("aria-haspopup", "true");
  });

  it("points aria-controls at the panel only while it is open", () => {
    render(<DeckCardOverflow deckId="d1" deckName="Atraxa" built={99} />);
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(trigger()).not.toHaveAttribute("aria-controls");

    fireEvent.click(trigger());
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    const id = trigger().getAttribute("aria-controls");
    expect(id).toBeTruthy();
    expect(document.getElementById(id as string)).toBeInTheDocument();
  });

  // Every deck card renders one of these, so two on a page must not collide.
  it("gives each instance its own panel id", () => {
    render(
      <>
        <DeckCardOverflow deckId="d1" deckName="Atraxa" built={99} />
        <DeckCardOverflow deckId="d2" deckName="Krenko" built={99} />
      </>,
    );
    const triggers = screen.getAllByRole("button", { name: "Deck options" });
    triggers.forEach((t) => fireEvent.click(t));
    const ids = screen
      .getAllByRole("button", { name: "Deck options" })
      .map((t) => t.getAttribute("aria-controls"));
    expect(new Set(ids).size).toBe(2);
  });
});
