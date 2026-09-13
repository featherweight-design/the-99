import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { deleteDeck, renameDeck } = vi.hoisted(() => ({
  deleteDeck: vi.fn(),
  renameDeck: vi.fn(),
}));
vi.mock("../../app/decks/actions", () => ({ deleteDeck, renameDeck }));

const { DeckCardOverflow } = await import("./deck-card-overflow");

// Named per deck: "Deck options" said the same thing for every tile on the
// page, so a reader tabbing the grid heard one label repeated as many times as
// there were decks.
const trigger = (deckName = "Atraxa") =>
  screen.getByRole("button", { name: `Actions for ${deckName}` });

describe("DeckCardOverflow", () => {
  // ARIA defines aria-haspopup="true" as equivalent to "menu", and every other
  // value names a pattern this panel does not implement either. Its rename mode
  // is a form, not a list of actions, so no value is honest here.
  it("claims no popup pattern it does not implement", () => {
    render(<DeckCardOverflow deckId="d1" deckName="Atraxa" built={99} />);
    expect(trigger()).not.toHaveAttribute("aria-haspopup");
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
    fireEvent.click(trigger("Atraxa"));
    fireEvent.click(trigger("Krenko"));
    const ids = [trigger("Atraxa"), trigger("Krenko")].map((t) =>
      t.getAttribute("aria-controls"),
    );
    expect(new Set(ids).size).toBe(2);
  });
});

describe("DeckCardOverflow — THE PLATE on phone", () => {
  // The round's one accessibility fix, and it ships in the same change that
  // creates the exposure. This control was bare at 44px by ruling — "the drawn
  // plate is desktop-only" — and what made that safe was the top scrim veiling
  // the crop beneath it. That scrim is gone from this tile, so the glyph would be
  // `var(--fg)` on an unmodified crop.
  it("draws the 26px plate inside the 44px target, at both widths", () => {
    render(<DeckCardOverflow deckId="d1" deckName="Atraxa" built={99} />);
    const button = screen.getByRole("button");
    // Target unchanged: 44 on a phone, 26 from `sm:` up, where the plate fills it.
    expect(button.className).toContain("h-[44px]");
    expect(button.className).toContain("sm:h-[26px]");
    expect(button.className).toContain("bg-transparent");

    const plate = button.firstElementChild as HTMLElement;
    expect(plate.className).toContain("h-[26px]");
    expect(plate.className).toContain("rounded-[7px]");
    expect(plate.className).toContain("bg-[color:var(--bg)]");
    expect(plate.className).toContain("border-[color:var(--border-strong)]");
    expect(plate.textContent).toBe("…");
  });
});
