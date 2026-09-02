// #43 — the availability chip and its caption on a Consider tile.
//
// The chip is count-only at this density (design 6.1), so the caption below the
// type line is the only place a deck gets named and the only per-state text on
// the tile. That makes its colour load-bearing rather than decorative: painted
// one colour, "in use somewhere else" and "two lists want your one copy" are
// the same card.
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { availabilityCopy } from "../../lib/copy/availability";
import type { Availability } from "../../lib/decks/availability";
import type { DeckSuggestion } from "../../lib/decks/suggest";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { SuggestionTile } from "./suggestion-tile";

vi.mock("../../app/decks/actions", () => ({
  addCardToDeck: vi.fn(),
  removeCardFromDeck: vi.fn(),
}));

const suggestion = (availability: Availability | null): DeckSuggestion =>
  ({
    oracleId: "o-sol", name: "Sol Ring", reason: "edhrec", reasonType: "edhrec",
    reasonLabel: "98% of decks", owned: true, inDeck: false,
    typeLine: "Artifact", cardTypeGroup: "Artifacts", role: "ramp",
    manaCost: "{1}", manaValue: 1,
    imageUri: null, inclusionPct: null, lift: null,
    availability,
  }) as DeckSuggestion;

function mount(availability: Availability | null, selfClaimed = false) {
  render(
    <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
      <SuggestionTile
        suggestion={suggestion(availability)}
        deckId="d1"
        inDeck={false}
        siblings={["o-sol"]}
        commanderShortName="Muldrotha"
        selfClaimed={selfClaimed}
      />
    </CardDetailProvider>,
  );
}

describe("SuggestionTile availability caption", () => {
  it("paints the in-use caption the hard foreground", () => {
    mount({ owned: 1, hard: 1, soft: 0, free: 0, hardDecks: [{ id: "d1", name: "Atraxa" }] });

    expect(screen.getByText(availabilityCopy.marker.tileInUse("Atraxa"))).toHaveClass(
      "text-[color:var(--avail-hard-fg)]",
    );
  });

  // The tile names the deck but does not link it: the whole tile is already a
  // control, and card detail is the one surface where the name is a link.
  it("names the deck without linking it", () => {
    mount({ owned: 1, hard: 1, soft: 0, free: 0, hardDecks: [{ id: "d1", name: "Atraxa" }] });

    expect(screen.queryByRole("link")).toBeNull();
  });

  // The state the caption used to be indistinguishable from the one above.
  it("paints the over-committed caption the over foreground, not accent", () => {
    mount({
      owned: 1,
      hard: 2,
      soft: 0,
      free: -1,
      hardDecks: [
        { id: "d1", name: "Atraxa" },
        { id: "d2", name: "Kykar" },
      ],
    });

    const caption = screen.getByText(availabilityCopy.marker.tileOver(2));
    expect(caption).toHaveClass("text-[color:var(--avail-over-fg)]");
    expect(caption).not.toHaveClass("text-[color:var(--avail-hard-fg)]");
  });

  it("sets the caption to the marker's own type rather than the type line's", () => {
    mount({ owned: 1, hard: 1, soft: 0, free: 0, hardDecks: [{ id: "d1", name: "Atraxa" }] });

    expect(screen.getByText(availabilityCopy.marker.tileInUse("Atraxa"))).toHaveClass(
      "font-mono",
      "text-[8.5px]",
      "font-semibold",
    );
  });

  // §17. Neither detail trigger wraps the chip, so nothing above it would carry
  // the prose — and the drawn `none free` is written for the eye.
  it("speaks the chip's sentence, count-only as the chip is drawn", () => {
    mount({ owned: 1, hard: 1, soft: 0, free: 0, hardDecks: [{ id: "d1", name: "Atraxa" }] });

    expect(screen.getByText("no free copies")).toBeInTheDocument();
    expect(screen.getByText(availabilityCopy.marker.hard)).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("draws nothing at all for a free card", () => {
    mount({ owned: 3, hard: 0, soft: 0, free: 3, hardDecks: [] });

    expect(screen.queryByText(/free|in a brew|short|in use/)).toBeNull();
  });
});
